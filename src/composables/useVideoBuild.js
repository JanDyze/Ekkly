import { computed, onUnmounted, ref, shallowRef, unref, watch } from 'vue'
import { useAppSettings } from './useAppSettings'
import { getChurchId } from '../api/church'
import { backgroundsOf, buildVideo } from '../utils/video/render'
import { accentFor, ensureFont, loadImage } from '../utils/video/assets'
import { decodeOwnTrack, loadOwnTrack, renderMusic, TRACKS } from '../utils/video/music'

// Turns a list of scenes and the church's choices into a video ready to play:
// the face loaded, the logo and photographs decoded, every card laid out, and
// the music written to the video's length.
//
// The picture is ready as soon as the face and images are, and the music
// follows it, so changing a word redraws at once without waiting on audio
// that has not changed.

export function useVideoBuild(scenes, settings) {
  const { lightLogoUrl, darkLogoUrl } = useAppSettings()
  const video = shallowRef(null)
  const music = shallowRef(null)
  const preparing = ref(true)
  const musicNote = ref('')
  // The church's own track on this device, if any: `{ name }`.
  const ownTrack = ref(null)

  let generation = 0
  let timer = null

  const shown = computed(() => (unref(scenes) || []).filter((scene) => !scene.hidden))

  const logoFor = (look) => (look === 'light' ? lightLogoUrl.value : darkLogoUrl.value)

  const prepareMusic = async (current, duration) => {
    const choice = unref(settings).music
    let track = choice.track
    let file = null
    musicNote.value = ''
    if (track === 'upload') {
      const stored = await loadOwnTrack(choice, getChurchId())
      ownTrack.value = stored ? { name: stored.name } : null
      file = stored ? await decodeOwnTrack(stored).catch(() => null) : null
      if (!file) {
        track = 'morning'
        musicNote.value = stored
          ? 'Your own music would not play here, so Morning is playing instead.'
          : choice.ownUrl
            ? 'Your own music could not be loaded just now, so Morning is playing instead.'
            : 'Your own music was chosen on another device before songs were kept with the church. Choose it again in Look and sound and every device will have it.'
      }
    }
    const buffer = await renderMusic({ track, seconds: duration, file, start: Number(choice.start) || 0 })
    if (current === generation) music.value = buffer
  }

  const rebuild = async () => {
    const current = ++generation
    preparing.value = true
    const style = unref(settings).style
    // Every picture the cards draw: their own photos and backgrounds, and the
    // faces and covers on their rows.
    const urls = [
      ...new Set(
        shown.value.flatMap((scene) => [
          scene.image,
          scene.photo,
          scene.background !== 'none' ? scene.background : '',
          ...(scene.rows || []).map((row) => row.photo),
        ])
      ),
    ].filter(Boolean)
    const pool = backgroundsOf(style)
    try {
      const [stack, logo, backgrounds, ...pictures] = await Promise.all([
        ensureFont(style.font),
        style.showLogo ? loadImage(logoFor(style.look)) : null,
        Promise.all(pool.map(loadImage)),
        ...urls.map(loadImage),
      ])
      if (current !== generation) return
      const images = Object.fromEntries(urls.map((url, i) => [url, pictures[i]]).filter(([, img]) => img))
      video.value = buildVideo({
        scenes: shown.value,
        style,
        palette: accentFor(style),
        stack,
        assets: { logo, backgrounds: backgrounds.filter(Boolean), images },
      })
      preparing.value = false
      await prepareMusic(current, video.value.duration)
    } catch (error) {
      console.error('Could not prepare the video:', error)
      if (current === generation) preparing.value = false
    }
  }

  // A burst of changes — dragging the seconds slider — builds once at the end.
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(rebuild, 120)
  }

  watch(
    () => [shown.value, unref(settings).style, unref(settings).music, lightLogoUrl.value, darkLogoUrl.value],
    schedule,
    { deep: true, immediate: true }
  )

  onUnmounted(() => clearTimeout(timer))

  const volume = computed(() => {
    const choice = unref(settings).music
    return choice.track === 'none' ? 0 : Math.max(0, Math.min(100, Number(choice.volume) || 0)) / 100
  })

  const trackLabel = computed(() => {
    const choice = unref(settings).music
    if (choice.track === 'upload') return ownTrack.value?.name || 'Your own music'
    return TRACKS.find((t) => t.key === choice.track)?.label || 'Morning'
  })

  return { video, music, volume, preparing, musicNote, ownTrack, trackLabel, refreshMusic: rebuild }
}
