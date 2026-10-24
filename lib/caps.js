// What each account in a church may see and change, written where the
// database rules can read it: `caps` on churches/{id}/access/{uid}.
//
// The app works a person's capabilities out for itself (usePermissions), and
// the server has the same sum already (lib/audience.js): the baseline, plus
// whatever the church grants each ministry on their member record, managing
// an area implying seeing it. The rules cannot do that — they cannot find a
// member record by the account it belongs to, nor loop over a list of
// ministries — so the answer is stored on the one document the rules already
// read for every request. Firestore then refuses, say, the ledger to anyone
// whose `caps` lacks finances.view, whatever the browser asks for.
//
// It is worked out again whenever something it depends on changes (a role's
// grants, someone's ministries, which account a record belongs to) and by
// anyone whose stored caps no longer match what their app works out
// (usePermissions), so a stale answer does not outlive the next sign-in.
// Administrators need none of this: the rules let them through on appAdmins.
import { loadAudience } from "./audience.js";

const sameList = (a = [], b = []) => a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * Works out and stores `caps` for everyone with access to a church. Only the
 * documents whose answer changed are written. Returns { caps, changed },
 * `caps` by uid.
 */
export async function syncChurchCaps(churchRef) {
  const [accessSnap, audience] = await Promise.all([churchRef.collection("access").get(), loadAudience(churchRef)]);

  const caps = {};
  const batch = churchRef.firestore.batch();
  let changed = 0;
  for (const d of accessSnap.docs) {
    const next = [...audience.capabilitiesFor(d.id)].sort();
    caps[d.id] = next;
    if (!sameList(d.data().caps, next)) {
      batch.update(d.ref, { caps: next });
      changed += 1;
    }
  }
  if (changed) await batch.commit();
  return { caps, changed };
}
