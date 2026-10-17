// What the narrator says over the front door's Sunday when it plays itself
// (the play button in SundayStory), one line for each part from the cover to
// the night: what the people still do, then what is kept, the same promise
// the bulletin makes in writing.
//
// Each line is spoken once, by Kokoro (an open voice, Apache 2.0), into
// public/voice/sunday/ by scripts/make-sunday-voice.mjs, which reads this
// file; change a line here and run it again, and only that line is made anew.
// This file imports nothing so that script can read it as it is.

export const VOICE = {
  hero: 'This is one Sunday at a church like yours. Watch what Ekkly takes off its hands, from the doors opening to the lights going off.',
  doors: 'Someone still unlocks early. They knew it was their turn on Wednesday, because the roster was already on their phone.',
  welcome: 'The ushers still say good morning. Ekkly keeps the count, and every first-timer goes on the roll.',
  worship: 'The band still leads. Who plays, which songs, and in which key, were planned on one list, and the lyrics go straight to the screen.',
  kids: 'Down the hall, the teachers still teach the kids. The lesson is ready, and every child is counted in at the door.',
  word: 'The pastor still preaches. The notes and the reading are in one place, ready for the screen.',
  prayer: 'The church still prays. Every request is written down once, and every answer is remembered.',
  offering: 'The treasurer still counts. It is typed in once, and the month’s book is already written.',
  notices: 'Someone still reads the notices. The calendar already knows them, so every phone says the same thing.',
  after: 'People still stay for coffee. And the small groups know who is coming on Wednesday.',
  meeting: 'The leaders still decide. Ekkly keeps the minutes, and every action item gets a name.',
  night: 'The lights go off. The lists are already kept, so your people are free to share the gospel, make disciples, and worship God.',
}

// How the voice should say what the page spells otherwise.
export const SAY = { Ekkly: 'Eckly' }
