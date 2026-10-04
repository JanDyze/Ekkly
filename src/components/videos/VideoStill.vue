<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

// One frame of a video, drawn small: how a look will come out, before it is
// chosen. The real drawing at a real moment, not a picture of one.

const props = defineProps({
  video: { type: Object, default: null },
  time: { type: Number, default: 2 },
})

const canvas = ref(null)

const draw = () => {
  const el = canvas.value
  const video = props.video
  if (!el || !video) return
  const width = Math.min(video.width, Math.round(el.clientWidth * (window.devicePixelRatio || 1)))
  if (!width) return
  el.width = width
  el.height = Math.round((width * video.height) / video.width)
  const ctx = el.getContext('2d')
  const scale = width / video.width
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  video.draw(ctx, Math.min(props.time, video.duration))
}

let observer = null
onMounted(() => {
  observer = new ResizeObserver(draw)
  if (canvas.value) observer.observe(canvas.value)
})
onBeforeUnmount(() => observer?.disconnect())

watch(() => [props.video, props.time], draw)
</script>

<template>
  <canvas
    ref="canvas"
    :style="video ? { aspectRatio: `${video.width} / ${video.height}` } : {}"
    :class="['block w-full', video ? '' : 'aspect-video animate-pulse bg-gray-200 dark:bg-gray-700']"
  />
</template>
