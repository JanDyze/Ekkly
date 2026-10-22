<script setup>
// Simple view turned on or off (useSimpleView): the screen closes as Ekkly's
// window. Its four panes, the mark's own (WindowLight), large enough to
// fill the screen, come in from the corners in the church's colour until
// they meet at the window's cross, which is the window's light showing
// between them; the home is changed behind them; and they open again onto
// the other one.
//
// The panes are the window's, not four squares with a cross drawn over
// them: its crossbar curves, and nothing straight laid across it ever lined
// up. The cross stands at the middle of the screen, so a wide screen shows
// the window round its cross and a tall one shows more of it, up into the
// arch. Flat and quick, one close and one open, never on a loop.
//
// The change happens while the panes are shut, so neither home is ever
// caught half laid out.
//
// `phase`: 'closing', then 'opening', then null (useSimpleView's shutter).

defineProps({
  phase: { type: String, default: null },
})

// The mark's four panes, drawn taller as a church window is (WindowLight),
// in a window 100 wide and 180 tall, each with the way it comes in.
const PANES = [
  { key: 'top-left', d: 'M0 61V50A50 50 0 0 1 46 0.16V44C46 50 30 56 0 61Z', from: 'translate(-90px, -90px)' },
  { key: 'top-right', d: 'M100 61V50A50 50 0 0 0 54 0.16V44C54 50 70 56 100 61Z', from: 'translate(90px, -90px)' },
  { key: 'bottom-left', d: 'M0 65C16 60.5 32 58.5 39 59.5Q46 60.5 46 67V180H0Z', from: 'translate(-90px, 90px)' },
  { key: 'bottom-right', d: 'M100 65C84 60.5 68 58.5 61 59.5Q54 60.5 54 67V180H100Z', from: 'translate(90px, 90px)' },
]

// The part of the window that fills the screen: centred on where its cross
// meets (50, 62), and cropped to the screen's shape (slice), so it always
// covers. Tall enough that a phone's corners stay inside the arch.
const VIEW = '0 10 100 104'
</script>

<template>
  <Teleport to="body">
    <div v-if="phase" :class="['shutter fixed inset-0 z-300', `is-${phase}`]" aria-hidden="true">
      <svg class="absolute inset-0 size-full" :viewBox="VIEW" preserveAspectRatio="xMidYMid slice">
        <!-- The light between the panes: the window's cross. -->
        <rect class="light" x="-50" y="-50" width="200" height="280" />
        <path
          v-for="pane in PANES"
          :key="pane.key"
          class="pane"
          :d="pane.d"
          :style="{ '--from': pane.from }"
        />
      </svg>
    </div>
  </Teleport>
</template>

<style scoped>
.shutter {
  --pane: var(--color-primary);
  /* Clicks wait until the other home is open. */
  pointer-events: auto;
}

.dark .shutter {
  --pane: color-mix(in oklab, var(--color-primary) 55%, black);
}

.pane {
  fill: var(--pane);
}

.light {
  fill: white;
}

/* Closing: the panes come in from the corners, and the window's light shows
   between them only as they meet, never as a white screen behind them. */
.is-closing .pane { animation: pane-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) both; }
.is-closing .light { animation: light-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) both; }

/* Opening: the light goes first, and the panes go back to their corners
   onto the other home. */
.is-opening .pane { animation: pane-out 0.44s 0.04s cubic-bezier(0.4, 0, 0.2, 1) both; }
.is-opening .light { animation: light-out 0.16s cubic-bezier(0.4, 0, 1, 1) both; }

@keyframes pane-in {
  from { transform: var(--from); }
  to { transform: none; }
}
@keyframes pane-out {
  from { transform: none; }
  to { transform: var(--from); }
}
@keyframes light-in {
  0%, 70% { opacity: 0; }
  100% { opacity: 0.92; }
}
@keyframes light-out {
  from { opacity: 0.92; }
  to { opacity: 0; }
}
</style>
