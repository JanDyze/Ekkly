<script setup>
import { ref, computed, nextTick, onBeforeUnmount, watch } from "vue";
import { X, Upload, Camera, ZoomIn, ZoomOut, RotateCw, RotateCcw, Check } from '../../icons';
import { useFocusTrap } from "../../composables/useFocusTrap";

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "update:show"]);

const fileInput = ref(null);
const cameraInput = ref(null);
const canvas = ref(null);

// The picture being framed: a decoded Image, so its natural size is known
// before anything is drawn. Rotating replaces it with a turned copy.
const image = ref(null);
const imageLoaded = computed(() => !!image.value);
const loadError = ref('');

// A square PNG with the circle already cut, a little larger than any avatar
// is drawn so it stays sharp on a high-density screen.
const OUTPUT_SIZE = 400;
const MAX_ZOOM = 5;

/* ------------------------------------------------------------ the framing
 * The same model as ImageCropModal, for the same reason: at zoom 1 the photo
 * exactly covers the frame, and it can never be moved or shrunk far enough
 * to open a gap at an edge. The old cropper let a photo be dragged clean out
 * of the circle and zoomed out to half the frame, then quietly clamped the
 * crop when it was saved - so what was saved was not what had been shown.
 */
const frameRef = ref(null);
const frameSize = ref(0);
const zoom = ref(1);
const offset = ref({ x: 0, y: 0 });

/** Scale at which the photo exactly covers the square - the zoom 1 baseline. */
const baseScale = computed(() => {
  if (!image.value || !frameSize.value) return 1;
  return Math.max(
    frameSize.value / image.value.naturalWidth,
    frameSize.value / image.value.naturalHeight
  );
});

const displaySize = computed(() => {
  if (!image.value) return { width: 0, height: 0 };
  const scale = baseScale.value * zoom.value;
  return {
    width: image.value.naturalWidth * scale,
    height: image.value.naturalHeight * scale,
  };
});

/** How far the photo may slide before a gap would open at an edge. */
const maxOffset = computed(() => ({
  x: Math.max(0, (displaySize.value.width - frameSize.value) / 2),
  y: Math.max(0, (displaySize.value.height - frameSize.value) / 2),
}));

const clamp = (value, limit) => Math.min(limit, Math.max(-limit, value));
const clampOffset = (next = offset.value) => {
  offset.value = { x: clamp(next.x, maxOffset.value.x), y: clamp(next.y, maxOffset.value.y) };
};

const imageStyle = computed(() => ({
  width: `${displaySize.value.width}px`,
  height: `${displaySize.value.height}px`,
  transform: `translate(-50%, -50%) translate(${offset.value.x}px, ${offset.value.y}px)`,
}));

/**
 * Zoom about a point - the spot between two fingers, or under the cursor - so
 * whatever is there stays there, rather than everything sliding towards the
 * middle. `point` is relative to the centre of the frame.
 */
const zoomAround = (nextZoom, point = { x: 0, y: 0 }) => {
  const target = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
  const ratio = target / zoom.value;
  const next = {
    x: point.x - (point.x - offset.value.x) * ratio,
    y: point.y - (point.y - offset.value.y) * ratio,
  };
  zoom.value = target;
  clampOffset(next);
};

// The slider zooms about the middle; its value is written through here so the
// offset is kept inside the new bounds as it changes.
const zoomModel = computed({
  get: () => zoom.value,
  set: (value) => zoomAround(Number(value)),
});

const measure = () => {
  frameSize.value = frameRef.value?.clientWidth || 0;
  clampOffset();
};

const resetFraming = () => {
  zoom.value = 1;
  offset.value = { x: 0, y: 0 };
};

const loadImage = (src) => {
  loadError.value = '';
  const img = new Image();
  // A stored photo lives on another origin (Blob storage); without this the
  // canvas it is drawn into would be tainted and refuse to export.
  if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
  img.onload = async () => {
    image.value = img;
    resetFraming();
    await nextTick();
    measure();
  };
  img.onerror = () => {
    loadError.value = 'That photo could not be opened. Try another one.';
  };
  img.src = src;
};

// Opening on an existing photo starts from it, so a small adjustment does not
// mean finding the picture again.
watch(
  () => props.show,
  (open) => {
    if (open && props.modelValue) loadImage(props.modelValue);
    else if (!open) reset();
  }
);

// Handle file selection
const handleFileSelect = (event) => {
  const file = event.target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => loadImage(e.target.result);
    reader.readAsDataURL(file);
  }
};

/* ------------------------------------------------------------------ camera */
// A photo taken on the spot is the usual case for a church directory: most
// people have no picture of themselves to hand, and asking them to find one
// is what leaves the record blank for a year.

const videoRef = ref(null);
const cameraOn = ref(false);
const cameraError = ref('');
let stream = null;

// Tracks must be stopped explicitly or the camera light stays on after the
// modal closes, which reads as the app still watching.
const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  cameraOn.value = false;
};

const startCamera = async () => {
  cameraError.value = '';

  // No getUserMedia at all (an old in-app browser, or plain http): hand the
  // job to the operating system's own camera through a file input instead.
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraInput.value?.click();
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    });
    cameraOn.value = true;
    await nextTick();
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      await videoRef.value.play();
    }
  } catch (error) {
    stopCamera();
    cameraError.value =
      error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
        ? 'Camera access was refused. You can still choose a photo from this device.'
        : 'No camera available here. Choose a photo from this device instead.';
  }
};

const takePhoto = () => {
  const video = videoRef.value;
  if (!video?.videoWidth) return;

  // A square out of the middle of the frame. The crop that follows is
  // circular, and starting from the full 4:3 leaves the face small in it.
  const side = Math.min(video.videoWidth, video.videoHeight);
  const shot = document.createElement('canvas');
  shot.width = side;
  shot.height = side;

  const ctx = shot.getContext('2d');
  // Flipped to match the preview, which is itself mirrored so people can
  // position themselves. Saving the unflipped frame would hand back a face
  // that is not the one they were just looking at.
  ctx.translate(side, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(
    video,
    (video.videoWidth - side) / 2,
    (video.videoHeight - side) / 2,
    side,
    side,
    0,
    0,
    side,
    side
  );

  stopCamera();
  loadImage(shot.toDataURL('image/png'));
};

onBeforeUnmount(stopCamera);

/* ----------------------------------------------------------- pan and pinch */
// Pointer events cover mouse, pen and fingers alike. One pointer drags; a
// second turns it into a pinch, which zooms about the midpoint of the two and
// follows that midpoint as it moves, so zooming and moving happen together
// the way they do in a phone's own photo editor.
const pointers = new Map();
let dragStart = null;
let pinchStart = null;

const fromCentre = (clientX, clientY) => {
  const box = frameRef.value.getBoundingClientRect();
  return { x: clientX - box.left - box.width / 2, y: clientY - box.top - box.height / 2 };
};

const pinchMetrics = () => {
  const [a, b] = [...pointers.values()];
  return {
    distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    mid: fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2),
  };
};

const onPointerDown = (event) => {
  if (!imageLoaded.value) return;
  frameRef.value?.setPointerCapture?.(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    const { distance, mid } = pinchMetrics();
    pinchStart = { distance, mid, zoom: zoom.value, offset: { ...offset.value } };
    dragStart = null;
  } else if (pointers.size === 1) {
    dragStart = { x: event.clientX, y: event.clientY, offset: { ...offset.value } };
  }
};

const onPointerMove = (event) => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointers.size === 2 && pinchStart) {
    const { distance, mid } = pinchMetrics();
    const target = Math.min(MAX_ZOOM, Math.max(1, pinchStart.zoom * (distance / pinchStart.distance)));
    const ratio = target / pinchStart.zoom;
    // The point that was under the fingers when the pinch began stays under
    // them, wherever they have moved to.
    zoom.value = target;
    clampOffset({
      x: mid.x - (pinchStart.mid.x - pinchStart.offset.x) * ratio,
      y: mid.y - (pinchStart.mid.y - pinchStart.offset.y) * ratio,
    });
    return;
  }
  if (!dragStart) return;
  clampOffset({
    x: dragStart.offset.x + (event.clientX - dragStart.x),
    y: dragStart.offset.y + (event.clientY - dragStart.y),
  });
};

const endPointer = (event) => {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinchStart = null;
  // Lifting one finger of a pinch carries on as a drag from where it is,
  // rather than jumping back to where the first finger went down.
  if (pointers.size === 1) {
    const [rest] = [...pointers.values()];
    dragStart = { x: rest.x, y: rest.y, offset: { ...offset.value } };
  }
  if (pointers.size === 0) dragStart = null;
};

const onWheel = (event) => {
  if (!imageLoaded.value) return;
  event.preventDefault();
  zoomAround(zoom.value * Math.exp(-event.deltaY * 0.002), fromCentre(event.clientX, event.clientY));
};

// A double tap or click goes back to the whole photo filling the circle.
const onDoubleClick = () => resetFraming();

/* ------------------------------------------------------------------ rotate */
// The photo itself is turned - drawn into a canvas a quarter-turn round - so
// the framing, the bounds and the saved crop all work on what is on screen.
// The old button only swapped the width and height it had on record, which
// left the picture unturned and the framing wrong.
const rotate = (direction = 1) => {
  const img = image.value;
  if (!img) return;
  const turned = document.createElement('canvas');
  turned.width = img.naturalHeight;
  turned.height = img.naturalWidth;
  const ctx = turned.getContext('2d');
  ctx.translate(turned.width / 2, turned.height / 2);
  ctx.rotate((direction * Math.PI) / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  loadImage(turned.toDataURL('image/png'));
};

/* -------------------------------------------------------------------- save */
// Exactly the square on screen, turned back into the photo's own pixels.
const cropImage = () => {
  const img = image.value;
  if (!canvas.value || !img || !frameSize.value) return;

  const scale = baseScale.value * zoom.value;
  const side = frameSize.value / scale;
  const sourceX = (displaySize.value.width / 2 - frameSize.value / 2 - offset.value.x) / scale;
  const sourceY = (displaySize.value.height / 2 - frameSize.value / 2 - offset.value.y) / scale;

  canvas.value.width = OUTPUT_SIZE;
  canvas.value.height = OUTPUT_SIZE;
  const ctx = canvas.value.getContext('2d');
  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.imageSmoothingQuality = 'high';

  // Cut to the circle first and draw into it, so the edge is antialiased.
  ctx.save();
  ctx.beginPath();
  ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, sourceX, sourceY, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.restore();

  try {
    emit('update:modelValue', canvas.value.toDataURL('image/png'));
    emit('update:show', false);
  } catch (error) {
    // A stored photo from a host that does not allow cross-origin reads
    // cannot be exported once drawn. Choosing it again from the device can.
    console.error('Error exporting the cropped photo:', error);
    loadError.value = 'This photo cannot be re-cropped here. Choose it again from this device.';
  }
};

// Reset
const reset = () => {
  stopCamera();
  cameraError.value = '';
  loadError.value = '';
  image.value = null;
  resetFraming();
  pointers.clear();
  dragStart = null;
  pinchStart = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  if (cameraInput.value) {
    cameraInput.value.value = '';
  }
};

// Close
const close = () => {
  emit('update:show', false);
};

const dialogRef = ref(null);
useFocusTrap(dialogRef, () => props.show, close);
</script>

<template>
  <!-- Teleported, and above the sheets (z-100) it is opened from - the add and
       edit steppers - while staying below a confirmation (z-120). -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-110 flex items-center justify-center bg-black/50 p-4"
        @click.self="close"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-cropper-title"
          tabindex="-1"
          class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90dvh] flex flex-col overflow-hidden"
        >
          <!-- Header -->
          <div class="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 id="image-cropper-title" class="text-lg font-semibold text-gray-900 dark:text-white">Profile photo</h3>
            <button
              @click="close"
              aria-label="Close"
              class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="space-y-4">
              <!-- Where the picture comes from -->
              <div v-if="!cameraOn">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  @change="handleFileSelect"
                  class="hidden"
                />
                <!-- The fallback for when getUserMedia is unavailable:
                     `capture` hands the shot to the phone's own camera app. -->
                <input
                  ref="cameraInput"
                  type="file"
                  accept="image/*"
                  capture="user"
                  @change="handleFileSelect"
                  class="hidden"
                />
                <div class="grid grid-cols-2 gap-2">
                  <button
                    @click="fileInput?.click()"
                    class="px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-primary transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
                  >
                    <Upload class="h-5 w-5 shrink-0" />
                    <span class="text-sm">{{ imageLoaded ? 'Another photo' : 'Choose photo' }}</span>
                  </button>
                  <button
                    @click="startCamera"
                    class="px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-primary transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
                  >
                    <Camera class="h-5 w-5 shrink-0" />
                    <span class="text-sm">Take photo</span>
                  </button>
                </div>
                <p v-if="cameraError" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {{ cameraError }}
                </p>
              </div>

              <!-- Live camera. Mirrored, so moving left moves left on screen. -->
              <div v-if="cameraOn" class="space-y-4">
                <video
                  ref="videoRef"
                  autoplay
                  playsinline
                  muted
                  class="mx-auto aspect-square w-full max-w-[300px] rounded-full bg-black object-cover -scale-x-100"
                ></video>
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="stopCamera"
                    class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    @click="takePhoto"
                    class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                  >
                    <Camera class="h-4 w-4" />
                    Capture
                  </button>
                </div>
              </div>

              <p v-if="loadError" class="text-xs text-red-600 dark:text-red-400">{{ loadError }}</p>

              <!-- Framing. The square is the crop; the circle inside it is the
                   part that shows as the avatar. touch-none hands every finger
                   to the handlers here, so a pinch zooms the photo and not the
                   page, and a drag moves the photo and not the sheet. -->
              <div v-if="imageLoaded && !cameraOn" class="space-y-3">
                <div
                  ref="frameRef"
                  class="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl bg-gray-900 touch-none select-none cursor-grab active:cursor-grabbing"
                  @pointerdown="onPointerDown"
                  @pointermove="onPointerMove"
                  @pointerup="endPointer"
                  @pointercancel="endPointer"
                  @wheel="onWheel"
                  @dblclick="onDoubleClick"
                >
                  <img
                    :src="image.src"
                    alt=""
                    draggable="false"
                    class="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                    :style="imageStyle"
                  />

                  <!-- Everything outside the circle dimmed, and the circle
                       outlined, so it reads as "this is the face". -->
                  <svg
                    class="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <mask id="cropper-circle-mask">
                        <rect width="100" height="100" fill="white" />
                        <circle cx="50" cy="50" r="50" fill="black" />
                      </mask>
                    </defs>
                    <rect width="100" height="100" fill="rgba(0,0,0,0.55)" mask="url(#cropper-circle-mask)" />
                    <circle
                      cx="50"
                      cy="50"
                      r="49.6"
                      fill="none"
                      stroke="rgba(255,255,255,0.9)"
                      stroke-width="1.5"
                      vector-effect="non-scaling-stroke"
                    />
                  </svg>
                </div>

                <p class="text-center text-xs text-gray-500 dark:text-gray-400">
                  Drag to move · pinch or scroll to zoom · double-tap to fit
                </p>

                <!-- Zoom, and the quarter-turns a sideways phone photo needs. -->
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="rotate(-1)"
                    aria-label="Turn left"
                    title="Turn left"
                    class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <RotateCcw class="h-5 w-5" />
                  </button>
                  <ZoomOut class="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    v-model.number="zoomModel"
                    type="range"
                    min="1"
                    :max="MAX_ZOOM"
                    step="0.01"
                    class="min-w-0 flex-1 accent-primary"
                    aria-label="Zoom"
                  />
                  <ZoomIn class="h-4 w-4 shrink-0 text-gray-400" />
                  <button
                    type="button"
                    @click="rotate(1)"
                    aria-label="Turn right"
                    title="Turn right"
                    class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <RotateCw class="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="shrink-0 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              @click="close"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              v-if="imageLoaded && !cameraOn"
              @click="cropImage"
              class="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
            >
              <Check class="h-4 w-4" />
              Use photo
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Hidden canvas for cropping. Deliberately left behind rather than
       teleported: it is never displayed, only drawn into via its ref. -->
  <canvas ref="canvas" class="hidden"></canvas>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
