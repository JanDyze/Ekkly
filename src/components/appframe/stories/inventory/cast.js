import { Guitar, Microphone, PianoKeys, PlugsConnected, Printer, ProjectorScreen, SpeakerHigh, Table } from '../../../../icons'

// The things Inventory's story is about, and the people who borrow them. Made
// up, as every story's are: a story is shown to anyone who holds the app, so
// it never shows the church's own storeroom.

export const THINGS = [
  { id: 'keyboard', name: 'Yamaha keyboard', icon: PianoKeys, tone: 'violet', category: 'Instruments', place: 'Stage' },
  { id: 'guitar', name: 'Acoustic guitar', icon: Guitar, tone: 'amber', category: 'Instruments', place: 'Stage' },
  { id: 'mic', name: 'Wireless mic', icon: Microphone, tone: 'sky', category: 'Sound', place: 'Sound booth', count: 4 },
  { id: 'speaker', name: 'Floor speaker', icon: SpeakerHigh, tone: 'teal', category: 'Sound', place: 'Sound booth', count: 2 },
  { id: 'reel', name: 'Extension reel', icon: PlugsConnected, tone: 'orange', category: 'Sound', place: 'Storeroom', count: 3 },
  { id: 'projector', name: 'Projector', icon: ProjectorScreen, tone: 'sky', category: 'Media', place: 'Office' },
  { id: 'tables', name: 'Folding tables', icon: Table, tone: 'emerald', category: 'Furniture', place: 'Storeroom', count: 20 },
  { id: 'printer', name: 'Office printer', icon: Printer, tone: 'rose', category: 'Office', place: 'Office' },
]

export const thing = (id) => THINGS.find((t) => t.id === id)

// Drawn the way the app draws a cut-out: the thing whole, on a soft square.
export const TONES = {
  violet: 'text-violet-600 dark:text-violet-300',
  amber: 'text-amber-600 dark:text-amber-300',
  sky: 'text-sky-600 dark:text-sky-300',
  teal: 'text-teal-600 dark:text-teal-300',
  orange: 'text-orange-600 dark:text-orange-300',
  emerald: 'text-emerald-600 dark:text-emerald-300',
  rose: 'text-rose-600 dark:text-rose-300',
}
