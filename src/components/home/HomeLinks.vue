<script setup>
import { computed } from 'vue'
import { ArrowUpRight } from '../../icons'
import HomePanel from './HomePanel.vue'
import { useLinks } from '../../composables/useLinks'
import { hostLabel, isOpenableUrl, normalizeUrl } from '../../utils/linkUtils'

// Quick links, on the desktop home (a panel someone turns on; useHomeLayout):
// the links the church hands out — the sign-up form, the giving page, the
// livestream — one tap each, where they used to be a trip to Links and a
// search. The newest first, as the Links page keeps them; a handful, and the
// rest there.

const SHOWN = 8

const { links, loading } = useLinks()

const openable = computed(() => links.value.filter((link) => link.title && isOpenableUrl(link.url)))
const rows = computed(() =>
  openable.value
    .slice(0, SHOWN)
    .map((link) => ({ key: link.id, title: link.title, href: normalizeUrl(link.url), host: hostLabel(link.url), category: link.category || '' }))
)
</script>

<template>
  <HomePanel
    id="home-links"
    title="Quick links"
    :link="{ to: '/links', label: 'All links' }"
    :total="openable.length"
    :loading="loading"
    :empty="rows.length ? null : { doodle: 'tea', title: 'No links yet', line: 'Forms, giving and the livestream show here once they are added.' }"
  >
    <ul class="divide-y divide-gray-100 dark:divide-white/10">
      <li v-for="row in rows" :key="row.key">
        <a
          :href="row.href"
          target="_blank"
          rel="noopener noreferrer"
          class="flex min-w-0 items-center gap-3 px-5 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ row.title }}</span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ [row.category, row.host].filter(Boolean).join(' · ') }}</span>
          </span>
          <ArrowUpRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        </a>
      </li>
    </ul>
  </HomePanel>
</template>
