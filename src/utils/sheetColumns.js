import XLSX from 'xlsx-js-style'

// Every sheet Ekkly hands out sizes its columns to what is in them. They were
// fixed widths, guessed once per field, so a long name or a list of
// ministries was cut off at the cell's edge while a column of ages took room
// it never used. A column is now as wide as its widest cell, with a little
// air, between a floor that keeps a short column clickable and a ceiling past
// which the text wraps (or runs on, where nothing is beside it) rather than
// pushing the rest of the sheet off the screen.
//
// Widths are in what a spreadsheet counts as a character: the width of a "0"
// in the default 11pt font. A cell in bold or in a larger size is wider than
// its letters, so each is scaled by its own font.

const MONEY_DIGITS = { minimumFractionDigits: 2, maximumFractionDigits: 2 }

/** How a cell's value reads once the sheet shows it. */
const shownText = (cell) => {
  if (cell.t === 'n' && typeof cell.v === 'number') {
    const format = String(cell.z || cell.s?.numFmt || '')
    return format.includes('.00')
      ? cell.v.toLocaleString('en-US', MONEY_DIGITS)
      : cell.v.toLocaleString('en-US')
  }
  return String(cell.v ?? '')
}

/** A cell's width in characters: its longest line, scaled by its font. */
const widthOf = (cell) => {
  const longest = Math.max(...shownText(cell).split('\n').map((line) => [...line].length))
  const font = cell.s?.font || {}
  const scale = ((font.sz || 11) / 11) * (font.bold ? 1.1 : 1)
  return Math.ceil(longest * scale)
}

/**
 * Sets `ws['!cols']` from the cells themselves.
 *
 * - `from`: the first row to measure. The rows above it (the church's name,
 *   a title, the date) run on across the empty cells beside them and would
 *   otherwise make the first column as wide as the longest of them.
 * - `skip`: rows further down that run on the same way, such as a note.
 * - `min`, `max`: the floor and the ceiling, in characters.
 * - `maxFor`: a ceiling of its own for some columns, by index: a column of
 *   notes or addresses that is worth more room before it wraps.
 *
 * Merged cells are never measured: they span several columns already.
 */
export const fitColumns = (ws, { from = 0, skip = [], min = 6, max = 40, maxFor = {} } = {}) => {
  if (!ws['!ref']) return ws
  const range = XLSX.utils.decode_range(ws['!ref'])
  const merges = ws['!merges'] || []
  const inMerge = (r, c) => merges.some((m) => r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c)

  const widths = Array.from({ length: range.e.c + 1 }, () => 0)
  for (let r = Math.max(from, range.s.r); r <= range.e.r; r++) {
    if (skip.includes(r)) continue
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (!cell || cell.v === '' || cell.v == null || inMerge(r, c)) continue
      widths[c] = Math.max(widths[c], widthOf(cell))
    }
  }

  ws['!cols'] = widths.map((width, c) => ({
    wch: Math.min(Math.max(width + 2, min), maxFor[c] ?? max),
  }))
  return ws
}
