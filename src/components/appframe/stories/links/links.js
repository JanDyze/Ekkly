import { Facebook, FileText, Globe, Youtube } from '../../../../icons'

// The links the Links story shows: made up, with the icon the page draws for
// each when it has no site icon to show (its getIcon), and the category
// colours of utils/categoryStyle, written out here so Tailwind keeps them.

export const CATEGORY_STYLE = {
  Video: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10',
  Social: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10',
  Resource: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10',
}

export const LINKS = [
  { id: 'live', title: 'Sunday livestream', note: 'youtube.com', category: 'Video', icon: Youtube },
  { id: 'kids', title: 'Kids’ church videos', note: 'For the 9 AM class', category: 'Video', icon: Youtube },
  { id: 'fb', title: 'Church Facebook page', note: 'facebook.com', category: 'Social', icon: Facebook },
  { id: 'give', title: 'Online giving', note: 'GCash and bank details', category: 'Resource', icon: Globe },
  { id: 'songs', title: 'Song sheets', note: 'drive.google.com', category: 'Resource', icon: FileText },
]

export const CATEGORIES = ['All', 'Video', 'Social', 'Resource', 'Worship', 'Document', 'Official', 'Design']

/** The links grouped under their categories, in the order Settings keeps. */
export const grouped = (links) =>
  ['Video', 'Social', 'Resource']
    .map((category) => ({ category, items: links.filter((l) => l.category === category) }))
    .filter((g) => g.items.length)
