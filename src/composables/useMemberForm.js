import { ref, computed } from "vue";
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
  age: null,
  civilStatus: '',
  address: '',
  contactNumber: '',
  email: '',
  occupation: '',
  ministries: [],
  tags: [FIRST_TIMER_TAG],
  isMember: false,
  image: null,
});

export function useMemberForm(members, addMemberToFirestore, allTags) {
  const toast = useToast();
  const showAddMember = ref(false);

  const newMember = ref(blankMember());

  // A first and last name is all a new record needs. Sex used to be required
  // too, but the form answered it for you ("Male") so the rule only ever
  // guarded a guess; the record now says it is missing until someone knows.
  const canAddMember = computed(() => {
    return String(newMember.value.firstName || '').trim() !== '' &&
           String(newMember.value.lastName || '').trim() !== '';
  });

  const addMemberTooltip = computed(() => {
    const missing = [];
    if (newMember.value.firstName.trim() === '') missing.push('First Name');
    if (newMember.value.lastName.trim() === '') missing.push('Last Name');
    
    if (missing.length === 0) return '';
    return `Please fill in: ${missing.join(', ')}`;
  });

  // Calculate age from date of birth
  const calculateAge = () => {
    if (newMember.value.dateOfBirth) {
      newMember.value.age = calculateAgeFromDate(newMember.value.dateOfBirth);
    }
  };

  // Add new member. Returns true when the member was saved so the caller
  // can close its drawer (visibility lives in the URL, not in this ref).
  const addMember = async () => {
    if (!canAddMember.value) {
      return false;
    }
    
    const age = calculateAgeFromDate(newMember.value.dateOfBirth);
    
    // Calculate next ID based on existing members
    const nextId = members.value.length > 0 
      ? Math.max(...members.value.map(m => typeof m.id === 'number' ? m.id : parseInt(m.id) || 0), 0) + 1 
      : 1;
    
    const member = {
      id: nextId,
      firstName: newMember.value.firstName.trim(),
      lastName: newMember.value.lastName.trim(),
      nickname: (newMember.value.nickname.trim() || newMember.value.firstName.trim()),
      sex: newMember.value.sex || undefined,
      dateOfBirth: newMember.value.dateOfBirth || undefined,
      age: age,
      civilStatus: newMember.value.civilStatus || undefined,
      address: newMember.value.address.trim() || undefined,
      contactNumber: newMember.value.contactNumber.trim() || undefined,
      email: (newMember.value.email || '').trim() || undefined,
      occupation: newMember.value.occupation.trim() || undefined,
      relatives: {},
      ministries: Array.isArray(newMember.value.ministries) ? newMember.value.ministries : [],
      tags: Array.isArray(newMember.value.tags) ? newMember.value.tags : [],
      isMember: newMember.value.isMember !== undefined ? newMember.value.isMember : true,
      image: newMember.value.image || undefined, // Include image field
    };
    
    // Remove undefined fields (but preserve image even if null)
    Object.keys(member).forEach(key => {
      if (member[key] === undefined && key !== 'image') {
        delete member[key];
      }
    });
    
    // Preserve image field even if null
    if (newMember.value.image === null || newMember.value.image === '') {
      member.image = null;
    }
    
    try {
      // Add to Firestore (real-time listener will update members automatically)
      await addMemberToFirestore(member);
      
      toast.success(`${member.firstName} ${member.lastName} added`);
      
      // Reset form
      newMember.value = blankMember();
      
      showAddMember.value = false;
      return true;
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Could not add that person. Please try again.');
      return false;
    }
  };

  // The add sheet hands over a finished record rather than filling this
  // form field by field, so it is laid over a blank one and saved as usual.
  const addMemberFrom = async (record) => {
    newMember.value = { ...blankMember(), ...record };
    return addMember();
  };

  return {
    showAddMember,
    addMemberFrom,
    newMember,
    canAddMember,
    addMemberTooltip,
    calculateAge,
    addMember,
  };
}

