// TEMPORARY: made-up tickets, so the Tickets app has something in it to look
// at and try before real ones arrive. To remove: delete this file and the
// lines marked `MOCK` in src/composables/useTickets.js.
//
// They are never written to Firestore, and the platform's console never sees
// them. Changing one (writing on it, marking it read, editing or deleting it)
// changes it on this device only, until the page is reloaded. A ticket sent
// from the form is real, as always.
//
// Only while developing (`npm run dev`): a deployed build never has them, so
// shipping before they are removed cannot show a church tickets nobody sent.

export const MOCK_TICKETS_ON = import.meta.env.DEV

const HOUR = 3600000
const DAY = 24 * HOUR

/** The mock tickets, a few of them sent by whoever is looking (`me`). */
export const makeMockTickets = (me = {}, now = Date.now()) => {
  const at = (ago) => new Date(now - ago)
  const say = (id, from, name, text, ago) => ({ id, from, uid: `mock-${name}`, name, text, at: at(ago) })
  const ticket = (id, fields) => ({
    id: `mock-${id}`,
    firestoreId: `mock-${id}`,
    mock: true,
    details: '',
    where: '',
    order: null,
    reporterUid: '',
    reporterName: '',
    device: '',
    version: '',
    assigneeUid: '',
    assigneeName: '',
    messages: [],
    status: 'open',
    doneAt: null,
    updatedAt: fields.createdAt,
    ...fields,
  })
  const mine = { reporterUid: me.uid || 'mock-me', reporterName: me.name || 'You' }

  return [
    // The church's to answer.
    ticket('ministry', {
      kind: 'question',
      title: 'How do I add someone to a ministry?',
      details: 'I lead the ushers and want to add two new volunteers.',
      where: 'People',
      reporterUid: 'mock-jonathan',
      reporterName: 'Jonathan Ramos',
      createdAt: at(1 * DAY + 3 * HOUR),
    }),
    ticket('taps', {
      kind: 'complaint',
      title: 'The projector screen goes dark during worship',
      details: 'Twice last Sunday the lyrics disappeared halfway through a song.',
      where: 'Presentation',
      reporterUid: 'mock-ana',
      reporterName: 'Ana Reyes',
      createdAt: at(3 * DAY),
    }),
    ticket('tithes', {
      ...mine,
      kind: 'question',
      title: 'Can members see their own giving?',
      where: 'Finances',
      createdAt: at(40 * 60000),
    }),
    ticket('attendance', {
      kind: 'praise',
      title: 'Counting heads takes a minute now',
      details: 'The ushers love it. We used to tally on paper and add it up after service.',
      where: 'Attendance',
      reporterUid: 'mock-carla',
      reporterName: 'Carla Mendoza',
      createdAt: at(5 * HOUR),
    }),
    ticket('volume', {
      kind: 'complaint',
      title: 'The reminder emails come too early',
      details: 'Saturday 6am is too early for the Sunday reminder.',
      reporterUid: 'mock-joy',
      reporterName: 'Joy Bautista',
      status: 'done',
      doneAt: at(2 * DAY),
      messages: [say('v1', 'church', 'Pastor Mark', 'Fair point — we moved it to 6pm Saturday. Thank you, Joy!', 2 * DAY)],
      createdAt: at(4 * DAY),
    }),

    // Ekkly's to answer: the church sees them, and nothing to do.
    ticket('songs', {
      kind: 'bug',
      title: 'Song keys reset when I save',
      details: 'I changed Way Maker to G and pressed Save. When I opened it again it was back in E.',
      where: 'Songs',
      reporterUid: 'mock-ben',
      reporterName: 'Ben Santos',
      device: 'Android · Chrome · installed · 412px wide',
      version: '0.35.49',
      createdAt: at(2 * HOUR),
    }),
    ticket('dark', {
      ...mine,
      kind: 'bug',
      title: 'The calendar is hard to read in dark mode',
      details: 'The weekend days are dark grey on black.',
      where: 'Events',
      status: 'doing',
      device: 'Windows · Edge · 1440px wide',
      version: '0.35.49',
      messages: [say('d1', 'ekkly', 'Jan', 'Thanks — I can see it too. Fixing it this week.', 10 * HOUR)],
      createdAt: at(2 * DAY),
    }),
    ticket('print', {
      ...mine,
      kind: 'suggestion',
      title: 'Let us print the Sunday lineup',
      details: 'Our ushers still copy it by hand onto the board in the lobby.',
      where: 'Schedules',
      status: 'done',
      doneAt: at(1 * DAY),
      messages: [
        say('p1', 'ekkly', 'Jan', 'Lovely idea. Building it now.', 4 * DAY),
        { id: 'p2', from: 'reporter', uid: mine.reporterUid, name: mine.reporterName, text: 'Thank you! A big font would help.', at: at(3 * DAY) },
        say('p3', 'ekkly', 'Jan', 'Done! Open the Sunday and tap Print — big letters included.', 1 * DAY),
      ],
      createdAt: at(6 * DAY),
    }),
    ticket('birthdays', {
      kind: 'suggestion',
      title: 'Remind us of birthdays the day before',
      details: 'So we can prepare a card for Sunday.',
      where: 'People',
      reporterUid: 'mock-joy',
      reporterName: 'Joy Bautista',
      status: 'paused',
      messages: [say('b1', 'ekkly', 'Jan', 'Good idea — we will come back to this after the Christmas season.', 8 * DAY)],
      createdAt: at(12 * DAY),
    }),
    ticket('emoji', {
      kind: 'suggestion',
      title: 'Let us react to prayer requests',
      reporterUid: 'mock-ben',
      reporterName: 'Ben Santos',
      status: 'declined',
      doneAt: at(9 * DAY),
      messages: [say('e1', 'ekkly', 'Jan', 'We would rather people pray than tap a heart, so we are leaving this one. Thank you for asking!', 9 * DAY)],
      createdAt: at(15 * DAY),
    }),
  ]
}
