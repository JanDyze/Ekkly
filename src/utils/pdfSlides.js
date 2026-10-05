// A preacher's deck, turned into pictures the projector can show.
//
// Presentation shows a slide as one image, exactly as the preacher made it:
// no fonts to go missing, nothing to reflow on the booth laptop, and it still
// shows with the wifi down once it has been opened. So a PDF is read here, in
// the browser, a page at a time, and each page becomes a picture.
//
// A .pptx cannot be read this way — nothing in a browser draws PowerPoint
// faithfully — which is why the screen asks for PowerPoint's own "Save as
// PDF" instead. The PDF reader is loaded only when somebody actually adds
// slides; nobody else downloads it.

// Wide enough for a 1080p projector, small enough that a thirty-slide deck
// uploads on a phone.
const SLIDE_WIDTH = 1920

const loadPdfjs = async () => {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

export const isPdf = (file) => file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '')
export const isPowerPoint = (file) => /\.(pptx?|key|odp)$/i.test(file?.name || '')

/**
 * Every page of a PDF as a WebP data URL, in order.
 *
 * `onPage(done, total)` reports progress, since a long deck takes a few
 * seconds on a phone. Pages are drawn one at a time so a big deck never holds
 * thirty full-size canvases at once.
 */
export const pdfToImages = async (file, { onPage, maxPages = 80 } = {}) => {
  const pdfjs = await loadPdfjs()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const total = Math.min(pdf.numPages, maxPages)
  const images = []
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  for (let n = 1; n <= total; n++) {
    const page = await pdf.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: SLIDE_WIDTH / base.width })
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    // White underneath, the way the slide was designed to sit on paper.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    images.push(canvas.toDataURL('image/webp', 0.85))
    page.cleanup()
    onPage?.(n, total)
  }
  await pdf.destroy()
  return { images, skipped: pdf.numPages - total }
}
