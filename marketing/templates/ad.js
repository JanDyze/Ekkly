// Draws the Phosphor icons in an ad from the files the app's own icons are
// built from, so an ad and the app show the same drawing.
//
//   <i data-icon="projector-screen"></i>
//   <i data-icon="phone" data-weight="fill"></i>
//
// The name is Phosphor's kebab-case one (see phosphoricons.com). The icon
// takes the colour of the text around it.
const PHOSPHOR = '/node_modules/@phosphor-icons/core/assets'

for (const el of document.querySelectorAll('[data-icon]')) {
  const weight = el.dataset.weight || 'regular'
  const file = weight === 'regular' ? el.dataset.icon : `${el.dataset.icon}-${weight}`
  const icon = document.createElement('span')
  icon.className = 'icon ' + el.className
  icon.style.setProperty('--src', `url(${PHOSPHOR}/${weight}/${file}.svg)`)
  el.replaceWith(icon)
}
