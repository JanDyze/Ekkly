import { ref, onMounted, onUnmounted } from "vue";
import { subscribeToMembers, addMember, updateMember, deleteMember as deleteMemberDoc } from "../api/membersService";

// Shared across callers, like useTasks: the People list, a person's profile
// and a dozen pickers all want the same roll. Each used to open its own
// listener and drop it on leaving, so going from the list to a profile and
// back fetched and normalised the whole roll twice, and the list sat on its
// skeleton in between.
const members = ref([]);
const loading = ref(true);
let unsubscribe = null;
let subscribers = 0;
let releaseTimer = null;

// How long the listener outlives its last user. A navigation unmounts the old
// page before it mounts the new one, so without a grace period list -> profile
// -> list would close the listener and reopen it every time.
const GRACE_MS = 30_000;

const retain = () => {
  subscribers += 1;
  clearTimeout(releaseTimer);
  releaseTimer = null;
  if (unsubscribe) return;
  // Only the first load shows a skeleton. A reconnect after the grace period
  // keeps showing the roll it already has until the fresh one lands.
  if (!members.value.length) loading.value = true;
  unsubscribe = subscribeToMembers((updatedMembers) => {
    // Members already have numeric id from Firestore data
    // firestoreId is kept for updates/deletes
    members.value = updatedMembers;
    loading.value = false;
  });
};

const release = () => {
  subscribers = Math.max(0, subscribers - 1);
  if (subscribers > 0 || !unsubscribe) return;
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    if (subscribers > 0 || !unsubscribe) return;
    unsubscribe();
    unsubscribe = null;
  }, GRACE_MS);
};

export function useMembers() {
  // Save members to Firestore (adds new member)
  const saveMembers = async () => {
    try {
      // This function is called when adding a new member
      // The actual save happens in useMemberForm via addMember
      // This is kept for backward compatibility
      console.log('saveMembers called - use addMember function instead');
    } catch (e) {
      console.error('Error saving members:', e);
    }
  };

  // Add a new member to Firestore
  const addMemberToFirestore = async (memberData) => {
    try {
      await addMember(memberData);
    } catch (error) {
      console.error('Error adding member to Firestore:', error);
      throw error;
    }
  };

  // Update a member in Firestore (uses Firestore document ID)
  const updateMemberInFirestore = async (member, memberData) => {
    try {
      const firestoreId = member.firestoreId || member.id;
      await updateMember(firestoreId, memberData);
    } catch (error) {
      console.error('Error updating member in Firestore:', error);
      throw error;
    }
  };

  // Delete a member from Firestore (uses Firestore document ID)
  const removeMember = async (member) => {
    try {
      const firestoreId = member.firestoreId || member.id;
      await deleteMemberDoc(firestoreId);
    } catch (error) {
      console.error('Error deleting member from Firestore:', error);
      throw error;
    }
  };

  // Get member by ID
  const getMemberById = (id) => {
    return members.value.find(m => m.id === id);
  };

  // No local fallback: onSnapshot reports network failures through its error
  // callback (which already yields an empty list), never as a synchronous
  // throw, so a catch here could only ever mask a programming error — and the
  // sample roster it used to fall back to shipped in the public JS bundle.
  onMounted(retain);
  onUnmounted(release);

  return {
    members,
    loading,
    saveMembers,
    addMemberToFirestore,
    updateMemberInFirestore,
    removeMember,
    getMemberById,
  };
}
