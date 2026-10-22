<script setup>
import { ref } from 'vue'
import TicketComposer from './TicketComposer.vue'
import { useQuickTicket, useQuickTicketShortcut } from '../../composables/useQuickTicket'
import { useToast } from '../../composables/useToast'

// The quick ticket (useQuickTicket): the Tickets app's own form, opened over
// whatever page you are on with Alt+T and told which page that is. Unlike the
// app's, it closes on sending with a toast rather than a thank-you, because
// whoever uses it is working through pages and wants to get back to the one
// they were reading.

const toast = useToast()
const { open, page, where, start, send } = useQuickTicket()
useQuickTicketShortcut(start)

const saving = ref(false)

const save = async (fields) => {
  if (saving.value) return
  saving.value = true
  try {
    await send(fields)
    open.value = false
    toast.success('Ticket sent')
  } catch (error) {
    // The form stays open and keeps what was typed, so a failed send is not
    // also a lost one.
    console.error(error)
    toast.error(
      error?.code === 'permission-denied'
        ? 'You do not have permission to send tickets in this church.'
        : 'Could not send that ticket. Please try again.'
    )
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <TicketComposer
    v-model:show="open"
    start-kind="suggestion"
    :start-where="where"
    :page="page"
    :saving="saving"
    @save="save"
  />
</template>
