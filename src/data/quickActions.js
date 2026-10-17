import { CalendarPlus, ChalkboardTeacher, ClipboardCheck, HandsPraying, NotePencil, Package, UserPlus } from '../icons'

// The things someone can start from the home's quick actions: on a desktop
// the back of the day's card, turned over (QuickActionsBack), on a phone the
// sheet its "+" raises (QuickActionsMenu). `area` is the app each belongs to.
// Each opens the
// place it is done with its form already open, and each is offered only to
// whoever may do it there (`area`, as in lib/capabilities.js: its manage
// capability). A new one needs only a line here and the app answering its
// query (`?add=` in People, Tasks, Events, Prayer and Sunday school).
export const QUICK_ACTIONS = [
  { key: 'person', label: 'Add a person', icon: UserPlus, area: 'members', to: { name: 'Members', query: { add: 'true' } } },
  { key: 'count', label: 'Record attendance', icon: ClipboardCheck, area: 'attendance', to: { name: 'AttendanceOwed' } },
  { key: 'event', label: 'New event', icon: CalendarPlus, area: 'events', to: { name: 'Events', query: { add: '1' } } },
  { key: 'task', label: 'New task', icon: NotePencil, area: 'tasks', to: { name: 'TasksMine', query: { add: '1' } } },
  { key: 'prayer', label: 'New prayer concern', icon: HandsPraying, area: 'prayer', to: { name: 'PrayerConcerns', query: { add: '1' } } },
  { key: 'class', label: 'New Sunday school class', icon: ChalkboardTeacher, area: 'teaching', to: { name: 'TeachingSchool', query: { add: '1' } } },
  { key: 'thing', label: 'Add to inventory', icon: Package, area: 'inventory', to: { name: 'InventoryAdd' } },
]

// What everyone starts with, until they choose their own.
export const DEFAULT_QUICK_ACTIONS = ['person', 'count', 'event', 'task']

// As many as the menu holds before it stops being quick.
export const MAX_QUICK_ACTIONS = 6
