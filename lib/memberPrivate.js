// How to reach someone, kept apart from the rest of their member record:
// churches/{id}/memberPrivate/{memberDocId}, the same id as the record.
//
// Everyone in a church reads the roll — names, birthdays and faces are on
// every line-up and the home — but the database rules let only those who may
// see People (members.view), and the person themselves, read a phone number,
// an email or a home address. The app (membersService), the Claude connector
// (lib/mcp) and scripts/split-member-contacts.mjs, which moved the fields out
// of records written before, all split a record by this one list.
export const PRIVATE_COLLECTION = "memberPrivate";
export const PRIVATE_FIELDS = ["contactNumber", "email", "address", "addressParts"];

/** A record's fields split into what everyone reads and what is private. */
export const splitPrivate = (data = {}) => {
  const open = {};
  const closed = {};
  for (const [key, value] of Object.entries(data)) {
    if (PRIVATE_FIELDS.includes(key)) closed[key] = value;
    else open[key] = value;
  }
  return { open, closed };
};
