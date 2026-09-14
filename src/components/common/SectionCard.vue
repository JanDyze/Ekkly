<script setup>
// One card in a settings-style page: an icon, a title, a line saying what the
// card is for, and whatever it holds. The same shape every Settings section
// already draws by hand (see EmailDigestAdmin.vue), in one place for the
// pages written since, so the platform console and church Settings match.

defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <div class="flex items-start gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-700">
      <div v-if="icon" class="shrink-0 rounded-lg bg-primary/10 p-2">
        <component :is="icon" class="h-5 w-5 text-primary dark:text-primary-light" />
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">{{ title }}</h2>
        <p v-if="subtitle" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>
