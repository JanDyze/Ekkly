// The names a blank name field shows as an example. Two of them, a man and a
// woman, so the example can match whoever is being added: a woman typed in
// under "Juan" reads as a mistake waiting to happen.
const JUAN = { firstName: 'Juan', lastName: 'Bautista', nickname: 'Jun' }
const MARIA = { firstName: 'Maria', lastName: 'Magdalena', nickname: 'Mae' }

/**
 * The example for one person. The sex picked decides it; with none picked
 * yet, rows take turns by their place so a list does not read as one man
 * over and over.
 */
export const samplePerson = (sex = '', index = 0) => {
  if (sex === 'Female') return MARIA
  if (sex === 'Male') return JUAN
  return index % 2 ? MARIA : JUAN
}
