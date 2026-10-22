import { calculateAgeFromDate } from "../utils/memberUtils";
import { useToast } from "./useToast";

// Somebody being added today is, nearly always, somebody who walked in for the
// first time — so the form starts them tagged that way, and the rare regular
// who was never entered has the tag taken off instead of every newcomer
// needing it put on.
export const FIRST_TIMER_TAG = 'First Timer';

const blankMember = () => ({
  firstName: '',
  lastName: '',
  nickname: '',
  sex: '',
  dateOfBirth: '',
  civilStatus: '',
  address: '',
  addressParts: null,
  contactNumber: '',
  email: '',
  occupation: '',
  ministries: [],
  instruments: [],
  tags: [FIRST_TIMER_TAG],
  isMember: false,
  image: null,
});

/**
 * Saving one new person: the record the add sheet (MemberEditSheet) hands
 * over, numbered next on the roll and written once.
 *
 * Whether the sheet is open lives in the address (?add=true, Everyone), not
 * here. This used to keep a second copy of that, and of the form itself,
 * field by field, from when adding was a drawer of inputs; nothing read them.
 */
export function useMemberForm(members, addMemberToFirestore) {
  const toast = useToast();

  /** Returns true when the person was saved, so the caller can close its sheet. */
  const addMemberFrom = async (record) => {
    const draft = { ...blankMember(), ...record };
    const firstName = String(draft.firstName || '').trim();
    const lastName = String(draft.lastName || '').trim();
    // A first and last name is all a new record needs. Sex used to be required
    // too, but the form answered it for you ("Male") so the rule only ever
    // guarded a guess; the record now says it is missing until someone knows.
    if (!firstName || !lastName) return false;

    // The next number on the roll: other records point at it, not at the
    // document, so a new one is numbered the way the rest were.
    const nextId = members.value.length > 0
      ? Math.max(...members.value.map((m) => (typeof m.id === 'number' ? m.id : parseInt(m.id) || 0)), 0) + 1
      : 1;

    const text = (value) => String(value || '').trim() || undefined;
    const member = {
      id: nextId,
      firstName,
      lastName,
      // Only a nickname somebody gave: the first name is what a roster falls
      // back to anyway (getDisplayName), and copying it in only printed it twice.
      nickname: String(draft.nickname || '').trim(),
      sex: draft.sex || undefined,
      dateOfBirth: draft.dateOfBirth || undefined,
      age: calculateAgeFromDate(draft.dateOfBirth),
      civilStatus: draft.civilStatus || undefined,
      address: text(draft.address),
      addressParts: draft.addressParts || undefined,
      contactNumber: text(draft.contactNumber),
      email: text(draft.email),
      occupation: text(draft.occupation),
      ministries: Array.isArray(draft.ministries) ? draft.ministries : [],
      instruments: Array.isArray(draft.instruments) ? draft.instruments : [],
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      isMember: draft.isMember !== undefined ? draft.isMember : true,
      image: draft.image || null,
    };

    // Firestore takes no undefined, so a detail nobody gave is left off.
    Object.keys(member).forEach((key) => {
      if (member[key] === undefined) delete member[key];
    });

    try {
      // Added to Firestore; the live listener brings it onto the roll.
      await addMemberToFirestore(member);
      toast.success(`${firstName} ${lastName} added`);
      return true;
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Could not add that person. Please try again.');
      return false;
    }
  };

  return { addMemberFrom };
}
