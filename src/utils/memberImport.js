import { CIVIL_STATUS_OPTIONS, YEARLESS } from './memberUtils'

// Turning a spreadsheet somebody already has — last year's roll in Excel, a
// Google Sheet saved as CSV, Ekkly's own export — into rows of the add-people
// sheet (PeopleAdd.vue), to be looked over before anything is saved.
//
// Lenient on purpose. Nobody's sheet has our column names, so a header is
// matched by what it plausibly means ("Surname", "Apelyido", "Last Name"); a
// birthday is read in the ways people write one; "M", "Lalaki" and "male" are
// all Male. What cannot be read is left blank rather than guessed, and the
// sheet shows it, so a wrong value never goes in quietly.

/** The sheet's columns, in order. A paste fills them left to right. */
export const SHEET_COLUMNS = [
  'firstName',
  'lastName',
  'nickname',
  'sex',
  'dateOfBirth',
  'civilStatus',
  'occupation',
  'contactNumber',
  'address',
  'isMember',
]

// What each column is called in the sheets people actually have. Compared
// with every space, dot and underscore taken out, in lower case.
const HEADERS = {
  firstName: ['firstname', 'first', 'givenname', 'pangalan', 'fname'],
  lastName: ['lastname', 'last', 'surname', 'familyname', 'apelyido', 'lname'],
  fullName: ['name', 'fullname', 'completename', 'buongpangalan'],
  nickname: ['nickname', 'nick', 'palayaw', 'callname'],
  sex: ['sex', 'gender', 'kasarian'],
  dateOfBirth: ['dateofbirth', 'birthday', 'birthdate', 'dob', 'bday', 'kaarawan', 'datebirth'],
  civilStatus: ['civilstatus', 'maritalstatus', 'civil'],
  // "Status" alone is civil status in one church's sheet and membership in
  // the next, so it is decided by what is in each cell.
  status: ['status'],
  occupation: ['occupation', 'job', 'work', 'trabaho', 'profession'],
  contactNumber: ['contactnumber', 'contact', 'phone', 'mobile', 'cellphone', 'cp', 'phonenumber', 'mobilenumber', 'cellno', 'contactno'],
  address: ['address', 'tirahan', 'homeaddress'],
  email: ['email', 'emailaddress'],
  isMember: ['standing', 'member', 'membership', 'ismember', 'type'],
}

const squash = (value) => String(value ?? '').toLowerCase().replace(/[\s._\-:#*]/g, '')

const fieldOfHeader = (cell) => {
  const key = squash(cell)
  if (!key) return null
  return Object.keys(HEADERS).find((field) => HEADERS[field].includes(key)) || null
}

/* ------------------------------------------------------------- the values */

const pad = (n) => String(n).padStart(2, '0')
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
// Tagalog months too, as a Filipino sheet writes them.
const BUWAN = ['ene', 'peb', 'mar', 'abr', 'may', 'hun', 'hul', 'ago', 'set', 'okt', 'nob', 'dis']

const monthOfWord = (word) => {
  const w = String(word).toLowerCase().slice(0, 3)
  const en = MONTHS.indexOf(w)
  if (en >= 0) return en + 1
  const tl = BUWAN.indexOf(w)
  return tl >= 0 ? tl + 1 : 0
}

const validDay = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(y || 2000, m, 0).getDate()

const toStored = (y, m, d) => {
  const thisYear = new Date().getFullYear()
  // Two-digit years: anything not in the future is this century.
  if (y && y < 100) y += y + 2000 > thisYear ? 1900 : 2000
  if (y && (y < 1900 || y > thisYear)) y = 0
  if (!validDay(y, m, d)) return ''
  return `${y ? y : YEARLESS}-${pad(m)}-${pad(d)}`
}

/**
 * A birthday however it was written — "1985-10-09", "10/9/1985" (month first,
 * as the Philippines writes it), "Oct 9, 1985", "9 October", "Oktubre 9" — as
 * the stored "YYYY-MM-DD", with 0000 where no year was given. "" when it
 * cannot be read.
 */
export const parseBirthday = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toStored(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }
  const text = String(value ?? '').trim()
  if (!text) return ''

  let m
  if ((m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return toStored(Number(m[1]), Number(m[2]), Number(m[3]))
  if ((m = text.match(/^--(\d{1,2})-(\d{1,2})$/))) return toStored(0, Number(m[1]), Number(m[2]))
  if ((m = text.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/))) {
    return toStored(m[3] ? Number(m[3]) : 0, Number(m[1]), Number(m[2]))
  }
  // "Oct 9, 1985", "October 9"
  if ((m = text.match(/^([a-zA-Z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?$/))) {
    const month = monthOfWord(m[1])
    return month ? toStored(m[3] ? Number(m[3]) : 0, month, Number(m[2])) : ''
  }
  // "9 October 1985", "9 Oct"
  if ((m = text.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)\.?,?\s*(\d{4})?$/))) {
    const month = monthOfWord(m[2])
    return month ? toStored(m[3] ? Number(m[3]) : 0, month, Number(m[1])) : ''
  }
  return ''
}

export const parseSex = (value) => {
  const v = squash(value)
  if (['m', 'male', 'lalaki', 'man', 'boy'].includes(v)) return 'Male'
  if (['f', 'female', 'babae', 'woman', 'girl'].includes(v)) return 'Female'
  return ''
}

export const parseCivilStatus = (value) => {
  const v = squash(value)
  if (!v) return ''
  if (['kasal', 'm'].includes(v)) return 'Married'
  if (['s', 'binata', 'dalaga'].includes(v)) return 'Single'
  if (['balo', 'biyuda', 'biyudo', 'w'].includes(v)) return 'Widowed'
  return CIVIL_STATUS_OPTIONS.find((opt) => squash(opt.value) === v)?.value || ''
}

/** Member (true), attendee (false), or not said (null, the sheet's default). */
export const parseStanding = (value) => {
  const v = squash(value)
  if (['member', 'yes', 'y', 'true', 'miyembro', 'oo', '1'].includes(v)) return true
  if (['attendee', 'no', 'n', 'false', 'visitor', 'guest', '0', 'firsttimer'].includes(v)) return false
  return null
}

const text = (value) => String(value ?? '').trim()

/** One value into a column of the sheet, read the way that column needs. */
export const cellValue = (field, value) => {
  if (field === 'dateOfBirth') return parseBirthday(value)
  if (field === 'sex') return parseSex(value)
  if (field === 'civilStatus') return parseCivilStatus(value)
  if (field === 'isMember') return parseStanding(value)
  if (field === 'contactNumber') {
    // Typed into Excel as a number, 0917 123 4567 comes out 9171234567: the
    // zero it dropped goes back on.
    const number = text(value).replace(/\.0$/, '')
    return /^9\d{9}$/.test(number) ? `0${number}` : number
  }
  return text(value)
}

/** "Maria Clara Santos" as a first and a last name: the last word is the surname. */
const splitName = (full) => {
  const words = text(full).split(/\s+/).filter(Boolean)
  if (words.length < 2) return { firstName: words[0] || '', lastName: '' }
  return { firstName: words.slice(0, -1).join(' '), lastName: words[words.length - 1] }
}

/* -------------------------------------------------------------- the rows */

/**
 * Rows of cells (a sheet, or a paste) as rows of the add-people sheet.
 *
 * If one of the first few rows reads as headers, columns are matched by name
 * and the rows above it are skipped (a title, a blank line). Otherwise the
 * cells are taken in the sheet's own column order, starting at `startColumn`
 * — which is how a paste into the middle of a row lands where it was pasted.
 */
export const rowsFromCells = (cells, startColumn = 0) => {
  const headerAt = cells.slice(0, 5).findIndex((row) => row.filter((cell) => fieldOfHeader(cell)).length >= 2)

  if (headerAt >= 0) {
    const fields = cells[headerAt].map(fieldOfHeader)
    return cells
      .slice(headerAt + 1)
      .map((row) => {
        const out = {}
        fields.forEach((field, i) => {
          if (!field || row[i] === undefined || row[i] === '') return
          if (field === 'fullName') Object.assign(out, splitName(row[i]))
          else if (field === 'status') {
            const civil = parseCivilStatus(row[i])
            if (civil) out.civilStatus = civil
            else out.isMember = parseStanding(row[i])
          } else out[field] = cellValue(field, row[i])
        })
        return out
      })
      .filter((row) => Object.values(row).some((v) => v !== '' && v !== null))
  }

  return cells
    .map((row) => {
      const out = {}
      row.forEach((value, i) => {
        const field = SHEET_COLUMNS[startColumn + i]
        if (field) out[field] = cellValue(field, value)
      })
      return out
    })
    .filter((row) => Object.values(row).some((v) => v !== '' && v !== null))
}

/** Tab-separated text off the clipboard (from Excel, Sheets or a table) as rows of cells. */
export const cellsFromPaste = (pasted) =>
  String(pasted || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter((line, i, all) => line !== '' || i < all.length - 1)
    .map((line) => line.split('\t'))

/** The first sheet of an Excel or CSV file as rows of cells. */
export const cellsFromFile = async (file) => {
  const { default: XLSX } = await import('xlsx-js-style')
  const data = await file.arrayBuffer()
  // Dates come out as dates, not Excel's day numbers; a CSV is read as text
  // so "10/9/1985" is not turned into a date the other way round.
  const isCsv = /\.csv$/i.test(file.name)
  const book = XLSX.read(data, { type: 'array', cellDates: !isCsv, raw: isCsv })
  const sheet = book.Sheets[book.SheetNames[0]]
  return sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) : []
}

// How many empty, ruled rows the template offers under its examples: enough
// for a small church's roll to go straight in without inserting rows.
const TEMPLATE_ROWS = 40

/**
 * An empty sheet with our column names, for somebody starting from nothing.
 *
 * Dressed like the app's other exports (the church's name in its colour, a
 * header in its accent) so it reads as a form from the church rather than a
 * bare grid. Everything above the header is skipped on the way back in —
 * rowsFromCells looks for the header in the first five rows — and the
 * asterisks are squashed out of the names, so the dressing costs the import
 * nothing.
 */
export const downloadTemplate = async () => {
  const [{ default: XLSX }, { getChurchIdentity }, { accentCell }] = await Promise.all([
    import('xlsx-js-style'),
    import('../composables/useAppSettings'),
    import('../composables/useBrandTheme'),
  ])
  const { fullName, branch } = getChurchIdentity()
  const headers = ['First name *', 'Last name *', 'Nickname', 'Sex', 'Birthday', 'Civil status', 'Occupation', 'Contact number', 'Address', 'Standing']
  const examples = [
    ['Juan', 'Bautista', 'Jun', 'Male', 'March 3', 'Single', 'Student', '0917 123 4567', 'Antipolo, Rizal', 'Attendee'],
    ['Maria', 'Magdalena', 'Mae', 'Female', 'Oct 9, 1985', 'Married', 'Teacher', '', '', 'Member'],
  ]
  const width = headers.length
  const blankRow = () => Array(width).fill('')

  const rows = [
    [[fullName, branch].filter(Boolean).join(' ') || 'Add people', ...blankRow().slice(1)],
    ['One person per row. Only the names are needed; write over the two examples.', ...blankRow().slice(1)],
    blankRow(),
    headers,
    ...examples,
    ...Array.from({ length: TEMPLATE_ROWS }, blankRow),
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)

  const line = { style: 'thin', color: { rgb: 'E5E7EB' } }
  const ruled = { top: line, bottom: line, left: line, right: line }
  const accent = accentCell()
  const styles = {
    title: { font: { bold: true, sz: 14, color: accent } },
    note: { font: { italic: true, sz: 10, color: { rgb: '6B7280' } } },
    header: {
      font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: accent },
      alignment: { vertical: 'center' },
      border: ruled,
    },
    // The examples are greyed so they read as something to write over.
    example: { font: { italic: true, sz: 10, color: { rgb: '9CA3AF' } }, border: ruled },
    cell: { font: { sz: 10 }, border: ruled, alignment: { vertical: 'center' } },
    band: { font: { sz: 10 }, fill: { fgColor: { rgb: 'F9FAFB' } }, border: ruled, alignment: { vertical: 'center' } },
  }

  const headerAt = 3
  rows.forEach((row, r) => {
    row.forEach((_, c) => {
      const ref = XLSX.utils.encode_cell({ r, c })
      if (!sheet[ref]) sheet[ref] = { v: '', t: 's' }
      if (r === 0) sheet[ref].s = styles.title
      else if (r === 1) sheet[ref].s = styles.note
      else if (r === headerAt) sheet[ref].s = styles.header
      else if (r > headerAt && r <= headerAt + examples.length) sheet[ref].s = styles.example
      else if (r > headerAt) sheet[ref].s = (r - headerAt) % 2 ? styles.cell : styles.band
    })
  })

  sheet['!merges'] = [0, 1].map((r) => ({ s: { r, c: 0 }, e: { r, c: width - 1 } }))
  sheet['!cols'] = [16, 16, 12, 9, 14, 13, 16, 17, 30, 11].map((wch) => ({ wch }))
  sheet['!rows'] = rows.map((_, r) => ({ hpt: r === 0 ? 24 : r === headerAt ? 22 : r > headerAt ? 18 : 15 }))

  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'People')
  XLSX.writeFile(book, 'Add people.xlsx')
}
