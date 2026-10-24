import { auth, db } from "./firebase";
import { syncCapabilities } from "./userAccountsService";
import { PRIVATE_COLLECTION, splitPrivate } from "../../lib/memberPrivate.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  limit,
} from './firestore';
import { inBatches } from './batchWrite';

const MEMBERS_COLLECTION = "members";

// How to reach someone — their number, email and address — is kept apart
// from the rest of their record (lib/memberPrivate.js), readable only by those
// who may see People and by the person themselves. A record written before
// the split still carries these fields itself until
// scripts/split-member-contacts.mjs moves them; they are read from either
// place, the private one winning.

// Helper to normalize member data from Firestore
const normalizeMember = (data, docId) => {
  return {
    id: data.id || parseInt(docId) || docId,
    firestoreId: docId,
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    nickname: data.nickname || '',
    // Blank when nobody has said. Both used to be filled in here as "Male" and
    // "Single", which undid the add form leaving them blank: a record whose
    // sex was never asked could not be flagged as missing it, was counted
    // among the men, and wore the ♂.
    sex: data.sex || '',
    dateOfBirth: data.dateOfBirth || null,
    // Kept as written (a newborn's 0 included). Only for a record with no
    // birth date: ageOf works the age out from the date wherever there is one.
    age: typeof data.age === 'number' ? data.age : null,
    civilStatus: data.civilStatus || '',
    address: data.address || '',
    // The province, city and barangay the address was picked from, with their
    // PSGC codes (AddressPicker), so the picker opens on them again. Null on a
    // record whose address was only ever typed.
    addressParts: data.addressParts || null,
    contactNumber: data.contactNumber || '',
    email: data.email || '',
    occupation: data.occupation || '',
    relatives: data.relatives || {},
    // What this member does in the church. The only field that grants access
    // (see rolePermissions), and a controlled vocabulary — Settings > Ministries.
    ministries: Array.isArray(data.ministries) ? data.ministries : [],
    // What they play, if they are in the band — ids from src/data/instruments.js,
    // in the order they would usually be asked to. Grants nothing.
    instruments: Array.isArray(data.instruments) ? data.instruments : [],
    // Free-text labels for describing and filtering. Grant nothing.
    tags: Array.isArray(data.tags) ? data.tags : [],
    isMember: data.isMember !== undefined ? data.isMember : true,
    image: data.image || null,
    // Firebase auth uid of the account this member has been linked to, set
    // only when an administrator approves a claim (see memberClaimsService).
    uid: data.uid || null,
  };
};

/**
 * The single member record an account has been linked to, by auth uid, or null
 * when no claim has been approved.
 *
 * A targeted one-shot read rather than subscribeToMembers, because the callers
 * that want this want one field. The public page greets a signed-in member by
 * nickname; opening a listener on the whole collection to find it would pull
 * every member down — base64 portraits and all — to print a first name.
 */
export const getMemberByUid = async (uid) => {
  if (!uid) return null;
  const snapshot = await getDocs(
    query(collection(db, MEMBERS_COLLECTION), where("uid", "==", uid), limit(1))
  );
  const found = snapshot.docs[0];
  return found ? normalizeMember(found.data(), found.id) : null;
};

// Subscribe to members changes (real-time), each with how to reach them where
// this account may see it.
export const subscribeToMembers = (callback) => {
  const membersRef = collection(db, MEMBERS_COLLECTION);
  let docs = [];
  let loaded = false;
  // Private details by member document id.
  let privateById = {};
  let unsubscribePrivate = null;
  // Who cannot read every member's details still reads their own.
  let ownOnly = false;
  let ownId = null;

  const emit = () => {
    if (!loaded) return;
    const members = docs.map((d) => normalizeMember({ ...d.data(), ...(privateById[d.id] || {}) }, d.id));
    // Sort by numeric id
    members.sort((a, b) => (a.id || 0) - (b.id || 0));
    callback(members);
  };

  const watchOwn = () => {
    const uid = auth.currentUser?.uid;
    const own = uid ? docs.find((d) => d.data().uid === uid) : null;
    if (!own || own.id === ownId) return;
    unsubscribePrivate?.();
    ownId = own.id;
    unsubscribePrivate = onSnapshot(
      doc(db, PRIVATE_COLLECTION, own.id),
      (snapshot) => {
        privateById = snapshot.exists() ? { [own.id]: snapshot.data() } : {};
        emit();
      },
      () => {}
    );
  };

  unsubscribePrivate = onSnapshot(
    collection(db, PRIVATE_COLLECTION),
    (snapshot) => {
      privateById = Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data()]));
      emit();
    },
    () => {
      // Not someone who may see People: their own details only.
      ownOnly = true;
      unsubscribePrivate = null;
      watchOwn();
    }
  );

  // Use simple query (orderBy requires index - can be added later in Firebase Console)
  // To enable orderBy, create a composite index on 'id' field in Firebase Console
  const unsubscribeMembers = onSnapshot(
    membersRef,
    (snapshot) => {
      docs = snapshot.docs;
      loaded = true;
      if (ownOnly) watchOwn();
      emit();
    },
    (error) => {
      console.error("Error subscribing to members:", error);
      callback([]);
    }
  );

  return () => {
    unsubscribeMembers();
    unsubscribePrivate?.();
  };
};

/** Writes a record's private part beside it, merged into what is there. */
const writePrivate = async (firestoreId, closed) => {
  if (!Object.keys(closed).length) return;
  await setDoc(doc(db, PRIVATE_COLLECTION, firestoreId), closed, { merge: true });
};

// Add a new member
export const addMember = async (memberData) => {
  try {
    const membersRef = collection(db, MEMBERS_COLLECTION);
    const { open, closed } = splitPrivate(memberData);
    const docRef = await addDoc(membersRef, open);
    await writePrivate(docRef.id, closed);
    return docRef.id;
  } catch (error) {
    console.error("Error adding member:", error);
    throw error;
  }
};

// Update a member (uses Firestore document ID)
export const updateMember = async (firestoreId, memberData) => {
  try {
    const memberRef = doc(db, MEMBERS_COLLECTION, firestoreId);
    // Remove firestoreId and filter out undefined values (Firebase doesn't accept undefined)
    const { firestoreId: _, ...rest } = memberData;
    const dataToUpdate = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined)
    );
    const { open, closed } = splitPrivate(dataToUpdate);
    // Written to the private document, and taken off the open record in case
    // it still carries them from before the split.
    await writePrivate(firestoreId, closed);
    Object.keys(closed).forEach((key) => (open[key] = deleteField()));
    if (Object.keys(open).length) await updateDoc(memberRef, open);
    // Ministries and the account a record belongs to decide what someone may
    // see, which is stored for the database rules too (lib/caps.js).
    if ("ministries" in dataToUpdate || "uid" in dataToUpdate) syncCapabilities();
  } catch (error) {
    console.error("Error updating member:", error);
    throw error;
  }
};

// Delete a member (uses Firestore document ID)
export const deleteMember = async (firestoreId) => {
  try {
    const memberRef = doc(db, MEMBERS_COLLECTION, firestoreId);
    await deleteDoc(memberRef);
    await deleteDoc(doc(db, PRIVATE_COLLECTION, firestoreId)).catch(() => {});
    syncCapabilities();
  } catch (error) {
    console.error("Error deleting member:", error);
    throw error;
  }
};


/**
 * Adds many people at once — the add-people sheet, filled in or imported.
 *
 * In batches (batchWrite.js) rather than one addDoc each: a congregation of
 * two hundred is one commit and one audit entry, and either lands or does
 * not, instead of a hundred and twelve of them arriving before the hall's
 * wifi drops. Each record takes the next number on the roll, the same rule a
 * single add follows.
 *
 * @param records  finished records, without `id`
 * @param firstId  the number the first of them takes
 */
export const addMembers = async (records, firstId) => {
  const membersRef = collection(db, MEMBERS_COLLECTION);
  const numbered = records.map((record, i) => ({ ...record, id: firstId + i }));
  // Two writes each, the record and its private part under the same id.
  const writes = numbered.flatMap((record) => {
    const ref = doc(membersRef);
    const { open, closed } = splitPrivate(record);
    return [
      { ref, data: open },
      ...(Object.keys(closed).length ? [{ ref: doc(db, PRIVATE_COLLECTION, ref.id), data: closed }] : []),
    ];
  });
  await inBatches(writes, (batch, write) => {
    batch.set(write.ref, write.data);
  });
  return numbered.length;
};
