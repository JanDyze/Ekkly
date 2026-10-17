// What YUNIT says aloud when he pipes up on the home (HomeYunit), one line
// for each thing he can be asked (data/yunitTips.js, by the same key, which
// shows these same words in his bubble).
//
// Each line is spoken once, by Kokoro (an open voice, Apache 2.0, the one the
// front door's narration uses), into public/voice/yunit/ by
// scripts/make-yunit-voice.mjs, which reads this file; change a line here and
// run it again, and only that line is made anew. This file imports nothing so
// that script can read it as it is.

export const YUNIT_LINES = {
  sunday: 'Want to know what’s on this Sunday?',
  birthdays: 'I can tell you whose birthday is coming up.',
  overdue: 'I can find the tasks that are running late.',
  attendance: 'Ask me how attendance has been lately.',
  song: 'Can’t find a song? Give me a line of it and I’ll look.',
}
