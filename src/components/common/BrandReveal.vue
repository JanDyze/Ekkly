<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * The church's logo, arriving as the reader reaches it.
 *
 * This used to be a clip of UEC's logo drawing itself. Now that one app serves
 * many churches, it is whichever logo the church uploaded (or Ekkly's mark
 * until it has), eased in with a gentle rise and a single shine rather than a
 * recorded animation only one congregation's logo could have.
 *
 * Nothing moves until the band has actually come into view, so a visitor who
 * turns back before the bottom of the page never sees it happen off-screen.
 */

defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
})

// Size comes from the caller's own classes rather than a prop, so a placement
// can be as responsive as the band around it.

const root = ref(null)
const shown = ref(false)

const reduced =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let observer = null

onMounted(() => {
  if (reduced || typeof IntersectionObserver === 'undefined') {
    shown.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      shown.value = true
      observer.disconnect()
      observer = null
    },
    { threshold: 0.4 }
  )
  observer.observe(root.value)
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <!-- The element holds its square whether or not the logo has arrived, so the
       band around it never reflows. -->
  <div ref="root" class="br" :class="{ 'br-shown': shown, 'br-still': reduced }">
    <img :src="src" :alt="alt" class="br-logo" />
  </div>
</template>

<style scoped>
.br {
  flex: none;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.br-logo {
  width: 78%;
  height: 78%;
  object-fit: contain;
  opacity: 0;
  transform: translateY(0.75rem) scale(0.92);
  transition: opacity 0.7s ease-out, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.br-shown .br-logo {
  opacity: 1;
  transform: none;
}

/* One sweep of light across the logo once it has landed. */
.br::after {
  content: '';
  position: absolute;
  inset: -20%;
  background: linear-gradient(105deg, transparent 40%, rgb(255 255 255 / 0.35) 50%, transparent 60%);
  transform: translateX(-120%);
  pointer-events: none;
}

.br-shown::after {
  animation: br-shine 1.4s ease-in-out 0.8s 1 forwards;
}

@keyframes br-shine {
  to {
    transform: translateX(120%);
  }
}

.br-still .br-logo {
  transition: none;
}

.br-still::after {
  display: none;
}
</style>
