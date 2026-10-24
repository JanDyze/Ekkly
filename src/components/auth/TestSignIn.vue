<script setup>
import { ref } from 'vue'
import { Loader2 } from '../../icons'
import { useAuth } from '../../composables/useAuth'

// Signing in to a test account by email and password, so each role can be
// seen in turn (scripts/seed-test-accounts.mjs makes them). Shown only in
// development, under the Google button, and folded away behind a link: it is a
// tool for whoever is building the app, not a second door for a congregation.

const emit = defineEmits(['signed-in', 'error'])

const { loginWithPassword, getAuthErrorMessage } = useAuth()

const open = ref(false)
const email = ref('')
const password = ref('')
const busy = ref(false)

const submit = async () => {
  if (!email.value.trim() || !password.value) return
  busy.value = true
  try {
    emit('signed-in', await loginWithPassword(email.value, password.value))
  } catch (e) {
    emit('error', getAuthErrorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <button
      type="button"
      class="mx-auto block text-[11px] font-bold text-white/55 underline-offset-4 transition-colors hover:text-white/80 hover:underline"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{ open ? 'Hide test sign-in' : 'Sign in with a test account' }}
    </button>

    <div class="fold" :class="{ 'is-open': open }">
      <form class="min-h-0 overflow-hidden" :inert="!open" @submit.prevent="submit">
        <div class="space-y-2.5 p-1 pt-4">
          <input
            v-model="email"
            type="email"
            autocomplete="username"
            placeholder="Email"
            aria-label="Email"
            class="field"
          />
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Password"
            aria-label="Password"
            class="field"
          />
          <button type="submit" :disabled="busy || !email.trim() || !password" class="submit">
            <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
            {{ busy ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Opened by easing its row from nothing to its own height, so it slides open
   and shut rather than appearing. */
.fold {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.fold.is-open {
  grid-template-rows: 1fr;
}

/* Glass, like the chips: everything on this screen sits on a photograph. */
.field {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  backdrop-filter: blur(8px);
  outline: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.field::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.field:focus {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.16);
}

.submit {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  transition: background-color 0.2s;
}

.submit:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.24);
}

.submit:disabled {
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  .fold {
    transition: none;
  }
}
</style>
