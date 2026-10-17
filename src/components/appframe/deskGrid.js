// How a list's rows stand on a desktop's screen (AppScreen's `desk`): each
// row its own card, as many across as the width holds, rather than one white
// block the width of the screen with a name at one end and a date at the
// other. ListGroup uses it for its rows, and a screen whose list is its own
// (Attendance's gatherings) puts it on that list, so the two read alike.
export const DESK_ROWS =
  'lg:grid lg:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] lg:gap-3 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:bg-transparent lg:ring-0 lg:*:rounded-2xl lg:*:bg-white lg:*:ring-1 lg:*:ring-gray-200/70 dark:lg:bg-transparent dark:lg:*:bg-gray-800 dark:lg:*:ring-gray-700/70'
