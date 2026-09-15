import cityPraise from '../../assets/churches/city-praise.webp'
import uec from '../../assets/churches/uec.webp'

// Churches the front door knows by name. When a visitor types one of these —
// its name or what its people call it — the previews wear that church's own
// logo, name and colour instead of a letter on a badge, so a church we are
// talking to sees itself in Ekkly before it has asked for anything.
//
// The logos are bundled for now (src/assets/churches); they move to storage
// once there is somewhere to put them. To add a church: its logo in that
// folder, square, about 256px; an entry here with every name it goes by.
//
// `tint` is its colour in the tour, light and dark, written out because it is
// that church's colour and not this page's accent.

export const KNOWN_CHURCHES = [
  {
    key: 'citypraise',
    name: 'City Praise',
    logo: cityPraise,
    names: ['City Praise', 'CityPraise', 'City Praise Church', 'CP'],
    tint: { light: 'oklch(0.42 0.17 268)', dark: 'oklch(0.7 0.13 268)' },
  },
  {
    key: 'uec',
    name: 'UEC Canubing II',
    logo: uec,
    names: ['UEC', 'UECPCOM', 'UEC Canubing', 'UEC Canubing II', 'UEC Canubing 2', 'UECPCOM Canubing II'],
    tint: { light: 'oklch(0.53 0.1 225)', dark: 'oklch(0.74 0.12 210)' },
  },
]

// Letters and numbers only, in lower case: "City-Praise " and "citypraise" are
// one name.
const squash = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

// The words a name is often typed with or without.
const FILLER = /\b(the|church|churches|ministries|ministry|fellowship|inc|of)\b/gi

const LOOKUP = new Map()
for (const church of KNOWN_CHURCHES) {
  for (const name of [church.name, ...church.names]) {
    LOOKUP.set(squash(name), church)
    LOOKUP.set(squash(name.replace(FILLER, ' ')), church)
  }
}
LOOKUP.delete('')

/** The known church a typed name stands for, or null. */
export const knownChurch = (typed) => LOOKUP.get(squash(typed)) || LOOKUP.get(squash(String(typed || '').replace(FILLER, ' '))) || null
