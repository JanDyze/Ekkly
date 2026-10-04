<script setup>
import { computed } from 'vue'
import { FONTS, PAPERS, STOCK, MOCK_EVENTS } from '../../data/landingLabMock'
import { SECTION_TYPES } from '../../data/landingSchema'

// The prototype's page, drawn from the model. Part of the /public-page
// builder — see src/data/landingLabMock.js.
//
// What a tap can be aimed at, for editing from the preview: each piece of
// text carries `data-lab-field`, its path within its part ("title",
// "items.2.name"; the header's are within model.hero), and `data-lab-multiline`
// when it is a paragraph rather than a line. A single picture carries
// `data-lab-photo` the same way. The church's own details carry
// `data-lab-church` instead, with the step of the Church details sheet they
// live on, because they are changed there and not here.
//
// Hex values here are deliberate, and the one place in the app they belong:
// this is not Ekkly's chrome wearing a token, it is a preview of somebody
// else's website, and its colours are the data being previewed. They arrive as
// CSS custom properties off the model, so nothing below is hardcoded.

const props = defineProps({
  model: { type: Object, required: true },
  // The church as it is really recorded (useAppSettings), not as the page
  // says it is. Its name, branch and how to find it belong to Church details,
  // so the page shows those and never a copy of them that could drift.
  church: { type: Object, default: () => ({}) },
  logo: { type: String, default: '' },
  // Both opt-in, so the standalone page at /public-page/preview stays a plain
  // page — no outlines, no pointer, nothing of the editor showing. The builder
  // beside it passes both and gets click-a-section-to-edit.
  selectable: { type: Boolean, default: false },
  activeId: { type: String, default: '' },
})

defineEmits(['pick'])

const paper = computed(() => PAPERS.find((p) => p.id === props.model.theme.paper) || PAPERS[0])
const font = computed(() => FONTS.find((f) => f.id === props.model.theme.font) || FONTS[0])
const src = (id) => STOCK.find((s) => s.id === id)?.src || ''
const live = computed(() => props.model.sections.filter((section) => section.on))

const pageStyle = computed(() => ({
  '--accent': props.model.theme.accent,
  '--ink': paper.value.ink,
  '--muted': paper.value.muted,
  fontFamily: font.value.stack,
  backgroundColor: paper.value.bg,
  color: paper.value.ink,
}))

const events = computed(() => {
  const section = live.value.find((s) => s.type === 'events')
  const count = section?.count === 'All' ? MOCK_EVENTS.length : Number(section?.count || 3)
  return MOCK_EVENTS.slice(0, count)
})

const hero = computed(() => props.model.hero)

/**
 * A list's rows with their real positions kept, minus the ones that draw
 * nothing.
 *
 * The page skips a row with nothing on its first line, so the visible rows are
 * not numbered the way the list is. Each one carries its index into the list,
 * so a tap on the third visible row edits the row it actually is.
 */
const rows = (list, key) =>
  (list || []).map((item, index) => ({ item, index })).filter(({ item }) => item[key])
</script>

<template>
  <div
    :style="pageStyle"
    :class="['lab-page min-h-full', selectable && activeId ? 'lab-focusing' : '', selectable ? 'lab-editing' : '']"
  >
    <!-- Masthead. Clickable, because the name and branch in it are edited in
         the Header panel — but `lab-nodim` keeps it out of the dimming: it is
         sticky, and a blurred bar floating over sharp content reads as a bug
         rather than as focus. -->
    <header
      data-lab-id="hero"
      :class="['sticky top-0 z-10 flex items-center gap-3 px-5 py-3 backdrop-blur', selectable ? 'lab-pick lab-nodim' : '']"
      style="background: color-mix(in srgb, var(--accent) 92%, black)"
      @click="selectable && $emit('pick', 'hero', $event)"
    >
      <img v-if="logo" :src="logo" :alt="church.shortName" class="h-8 w-auto shrink-0" />
      <div class="min-w-0 flex-1">
        <p data-lab-church="0" class="truncate text-base font-semibold leading-tight text-white">{{ church.shortName }}</p>
        <p v-if="church.branch" data-lab-church="0" class="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {{ church.branch }}
        </p>
      </div>
      <span class="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">Sign in</span>
    </header>

    <!-- Hero -->
    <section
      data-lab-id="hero"
      :class="[
        'relative',
        selectable ? 'lab-pick' : '',
        selectable && activeId === 'hero' ? 'lab-active' : '',
      ]"
      @click="selectable && $emit('pick', 'hero', $event)"
    >
      <span v-if="selectable && activeId === 'hero'" class="lab-tag">Header</span>
      <!-- Full photo: the words sit over the picture. -->
      <div v-if="hero.style === 'full'" class="relative">
        <img :src="src(hero.image)" data-lab-photo="image" alt="" class="h-64 w-full object-cover sm:h-80" />
        <div class="absolute inset-0" style="background: linear-gradient(to top, rgb(0 0 0 / 0.75), rgb(0 0 0 / 0.15))"></div>
        <div class="absolute inset-x-0 bottom-0 p-6 text-white">
          <p data-lab-field="greeting" class="text-sm font-semibold uppercase tracking-widest opacity-80">{{ hero.greeting }}</p>
          <h1 data-lab-field="headline" class="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{{ hero.headline }}</h1>
          <p data-lab-field="sub" data-lab-multiline class="mt-2 max-w-md text-sm opacity-90">{{ hero.sub }}</p>
          <span v-if="hero.cta" data-lab-field="cta" class="mt-4 inline-block rounded-full bg-white px-4 py-2 text-xs font-bold" style="color: var(--accent)">{{ hero.cta }}</span>
        </div>
      </div>

      <!-- Split: words beside the picture. -->
      <div v-else-if="hero.style === 'split'" class="grid grid-cols-1 items-center gap-6 px-6 py-10 sm:grid-cols-2">
        <div>
          <p data-lab-field="greeting" class="text-sm font-semibold uppercase tracking-widest" style="color: var(--accent)">{{ hero.greeting }}</p>
          <h1 data-lab-field="headline" class="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{{ hero.headline }}</h1>
          <p data-lab-field="sub" data-lab-multiline class="mt-3 text-sm" style="color: var(--muted)">{{ hero.sub }}</p>
          <span v-if="hero.cta" data-lab-field="cta" class="mt-5 inline-block rounded-full px-4 py-2 text-xs font-bold text-white" style="background: var(--accent)">{{ hero.cta }}</span>
        </div>
        <img :src="src(hero.image)" data-lab-photo="image" alt="" class="h-56 w-full rounded-2xl object-cover" />
      </div>

      <!-- Arch: a window rather than a backdrop. Today's page. -->
      <div v-else-if="hero.style === 'arch'" class="px-6 py-10 text-center">
        <div class="mx-auto w-48 overflow-hidden sm:w-56" style="border-radius: 9999px 9999px 12px 12px">
          <img :src="src(hero.image)" data-lab-photo="image" alt="" class="h-64 w-full object-cover sm:h-72" />
        </div>
        <p data-lab-field="greeting" class="mt-6 text-sm font-semibold uppercase tracking-widest" style="color: var(--accent)">{{ hero.greeting }}</p>
        <h1 data-lab-field="headline" class="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{{ hero.headline }}</h1>
        <p data-lab-field="sub" data-lab-multiline class="mx-auto mt-3 max-w-sm text-sm" style="color: var(--muted)">{{ hero.sub }}</p>
        <span v-if="hero.cta" data-lab-field="cta" class="mt-5 inline-block rounded-full px-4 py-2 text-xs font-bold text-white" style="background: var(--accent)">{{ hero.cta }}</span>
      </div>

      <!-- No photo: type only. -->
      <div v-else class="px-6 py-14 text-center">
        <p data-lab-field="greeting" class="text-sm font-semibold uppercase tracking-widest" style="color: var(--accent)">{{ hero.greeting }}</p>
        <h1 data-lab-field="headline" class="mt-1 text-4xl font-bold leading-tight">{{ hero.headline }}</h1>
        <p data-lab-field="sub" data-lab-multiline class="mx-auto mt-3 max-w-sm text-sm" style="color: var(--muted)">{{ hero.sub }}</p>
        <span v-if="hero.cta" data-lab-field="cta" class="mt-5 inline-block rounded-full px-4 py-2 text-xs font-bold text-white" style="background: var(--accent)">{{ hero.cta }}</span>
      </div>
    </section>

    <!-- The stack -->
    <div
      v-for="section in live"
      :key="section.id"
      :data-lab-id="section.id"
      :class="[
        'relative',
        selectable ? 'lab-pick' : '',
        selectable && activeId === section.id ? 'lab-active' : '',
      ]"
      @click="selectable && $emit('pick', section.id, $event)"
    >
      <span v-if="selectable && activeId === section.id" class="lab-tag">
        {{ SECTION_TYPES[section.type].label }}
      </span>
      <!-- Verse -->
      <section
        v-if="section.type === 'verse'"
        class="px-6 py-8 text-center"
        :style="
          section.fill === 'Accent'
            ? { background: 'var(--accent)', color: '#fff' }
            : { background: 'color-mix(in srgb, var(--ink) 5%, transparent)' }
        "
      >
        <p class="mx-auto max-w-xl text-base italic leading-relaxed sm:text-lg">“<span data-lab-field="text" data-lab-multiline>{{ section.text }}</span>”</p>
        <p data-lab-field="reference" class="mt-3 text-[11px] font-bold uppercase tracking-[0.2em]" :style="section.fill === 'Accent' ? { opacity: 0.75 } : { color: 'var(--accent)' }">
          {{ section.reference }}
        </p>
      </section>

      <!-- Service times -->
      <section v-else-if="section.type === 'services'" class="px-6 py-10">
        <h2 data-lab-field="title" class="text-center text-2xl font-bold">{{ section.title }}</h2>
        <div class="mx-auto mt-6 max-w-md space-y-3">
          <div
            v-for="{ item, index } in rows(section.items, 'name')"
            :key="index"
            class="rounded-xl border px-4 py-3"
            style="border-color: color-mix(in srgb, var(--ink) 12%, transparent)"
          >
            <div class="flex items-baseline justify-between gap-3">
              <p :data-lab-field="`items.${index}.name`" class="font-semibold">{{ item.name }}</p>
              <p :data-lab-field="`items.${index}.when`" class="shrink-0 text-xs font-bold" style="color: var(--accent)">{{ item.when }}</p>
            </div>
            <p v-if="item.note" :data-lab-field="`items.${index}.note`" class="mt-1 text-xs" style="color: var(--muted)">{{ item.note }}</p>
          </div>
        </div>
      </section>

      <!-- About -->
      <section v-else-if="section.type === 'about'" class="px-6 py-10">
        <div
          :class="[
            'mx-auto grid max-w-3xl items-center gap-6',
            section.layout === 'No photo' ? 'max-w-xl grid-cols-1 text-center' : 'grid-cols-1 sm:grid-cols-2',
          ]"
        >
          <img
            v-if="section.layout === 'Photo left'"
            :src="src(section.image)"
            data-lab-photo="image"
            alt=""
            class="h-52 w-full rounded-2xl object-cover"
          />
          <div>
            <h2 data-lab-field="title" class="text-2xl font-bold">{{ section.title }}</h2>
            <p data-lab-field="body" data-lab-multiline class="mt-3 text-sm leading-relaxed" style="color: var(--muted)">{{ section.body }}</p>
          </div>
          <img
            v-if="section.layout === 'Photo right'"
            :src="src(section.image)"
            data-lab-photo="image"
            alt=""
            class="h-52 w-full rounded-2xl object-cover"
          />
        </div>
      </section>

      <!-- Process -->
      <section v-else-if="section.type === 'path'" class="px-6 py-10" style="background: color-mix(in srgb, var(--ink) 4%, transparent)">
        <h2 data-lab-field="title" class="text-center text-2xl font-bold">{{ section.title }}</h2>
        <div class="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-3">
          <div v-for="({ item, index }, i) in rows(section.items, 'stage')" :key="index" class="text-center">
            <img
              v-if="item.image"
              :src="src(item.image)"
              :data-lab-photo="`items.${index}.image`"
              alt=""
              class="mx-auto h-20 w-20 object-contain"
            />
            <p class="mt-2 text-xs font-bold uppercase tracking-[0.2em]" style="color: var(--accent)">
              {{ i + 1 }}
            </p>
            <p :data-lab-field="`items.${index}.stage`" class="mt-1 text-lg font-semibold">{{ item.stage }}</p>
            <p :data-lab-field="`items.${index}.note`" class="mt-1 text-xs" style="color: var(--muted)">{{ item.note }}</p>
          </div>
        </div>
      </section>

      <!-- Photos -->
      <section v-else-if="section.type === 'gallery'" class="px-6 py-10">
        <h2 data-lab-field="title" class="text-center text-2xl font-bold">{{ section.title }}</h2>
        <div class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <img
            v-for="(pick, i) in section.picks"
            :key="i"
            :src="src(pick)"
            alt=""
            class="h-28 w-full rounded-lg object-cover"
          />
        </div>
      </section>

      <!-- Leaders -->
      <section v-else-if="section.type === 'leaders'" class="px-6 py-10">
        <h2 data-lab-field="title" class="text-center text-2xl font-bold">{{ section.title }}</h2>
        <div class="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-6">
          <div v-for="{ item, index } in rows(section.items, 'name')" :key="index" class="w-32 text-center">
            <div
              class="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
              style="background: var(--accent)"
            >
              {{ item.name.trim().charAt(0) }}
            </div>
            <p :data-lab-field="`items.${index}.name`" class="mt-2 text-sm font-semibold leading-tight">{{ item.name }}</p>
            <p :data-lab-field="`items.${index}.role`" class="text-xs" style="color: var(--muted)">{{ item.role }}</p>
          </div>
        </div>
      </section>

      <!-- What's on -->
      <section v-else-if="section.type === 'events'" class="px-6 py-10" style="background: color-mix(in srgb, var(--ink) 4%, transparent)">
        <h2 data-lab-field="title" class="text-center text-2xl font-bold">{{ section.title }}</h2>
        <div class="mx-auto mt-6 max-w-md divide-y" style="border-color: color-mix(in srgb, var(--ink) 12%, transparent)">
          <div v-for="(item, i) in events" :key="i" class="flex items-center justify-between gap-3 py-2.5">
            <p class="text-sm font-medium">{{ item.title }}</p>
            <p class="shrink-0 text-xs" style="color: var(--muted)">{{ item.when }}</p>
          </div>
        </div>
      </section>

      <!-- Find us -->
      <section v-else-if="section.type === 'contact'" class="px-6 py-10">
        <h2 data-lab-field="title" class="text-center text-2xl font-bold">{{ section.title }}</h2>
        <div class="mx-auto mt-5 max-w-md space-y-2 text-center text-sm" style="color: var(--muted)">
          <p v-if="church.address" data-lab-church="2" class="whitespace-pre-line">{{ church.address }}</p>
          <p v-if="church.phone" data-lab-church="2" class="font-semibold" style="color: var(--accent)">{{ church.phone }}</p>
          <p v-if="church.email" data-lab-church="2">{{ church.email }}</p>
          <p v-if="church.facebook" data-lab-church="2">{{ church.facebook }}</p>
        </div>
      </section>

      <!-- Come along -->
      <section v-else-if="section.type === 'invite'" class="px-6 py-12 text-center" style="background: var(--accent)">
        <h2 data-lab-field="title" class="text-2xl font-bold text-white sm:text-3xl">{{ section.title }}</h2>
        <p data-lab-field="body" class="mt-2 text-sm text-white/80">{{ section.body }}</p>
        <span v-if="section.cta" data-lab-field="cta" class="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-xs font-bold" style="color: var(--accent)">
          {{ section.cta }}
        </span>
      </section>
    </div>

    <footer class="px-6 py-6 text-center text-[11px]" style="color: var(--muted)">
      {{ church.shortName }} · Powered by Ekkly
    </footer>
  </div>
</template>

<style scoped>
/* While it is being edited, a piece of text that has been emptied would draw
   as nothing at all — no height, nothing to tap to fill it in again. It keeps a
   line's height and a faint dash instead. */
.lab-editing [data-lab-field]:empty::before {
  content: '—';
  opacity: 0.35;
}

/* The piece of text being typed into, from the preview. */
.lab-editing [contenteditable] {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 2px;
  cursor: text;
}

/* Only in the builder: the standalone preview passes no `selectable` and none
   of this applies to it.

   Every outline is inset, so it never changes the layout it is pointing at — an
   outline that pushed the page around would make picking a section feel like
   editing it. */

/* Anything you can click, on the way past. Faint, because nine of these
   lighting up as the pointer crosses the page would be a strobe. */
.lab-pick {
  cursor: pointer;
  outline: 2px dashed transparent;
  outline-offset: -2px;
  transition:
    outline-color 0.12s ease,
    opacity 0.18s ease,
    filter 0.18s ease,
    transform 0.18s ease;
}

.lab-pick:hover {
  outline-color: color-mix(in srgb, var(--accent) 35%, transparent);
}

/* Everything that is not being edited, while something is: pulled back so the
   eye has one place to land.

   The others shrink very slightly rather than the edited one growing. Growing
   it would push past the preview frame, which clips — and clipping the outline
   of the thing you are pointing at defeats the whole effect. Shrinking the rest
   reads as the same lift with nothing to clip. */
.lab-focusing .lab-pick:not(.lab-active):not(.lab-nodim) {
  opacity: 0.4;
  filter: blur(1.5px) saturate(0.7);
  transform: scale(0.985);
}

/* The one being edited. Solid outline, beats hover, and lifted off the page it
   sits in by a shadow in its own accent. */
.lab-pick.lab-active,
.lab-pick.lab-active:hover {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.lab-focusing .lab-pick.lab-active {
  position: relative;
  z-index: 2;
  box-shadow: 0 10px 34px -10px color-mix(in srgb, var(--accent) 55%, transparent);
}

/* The dimmed sections are scenery: clicking one should still bring it forward,
   but nothing inside is worth hovering over on the way. */
.lab-focusing .lab-pick:not(.lab-active):not(.lab-nodim) * {
  pointer-events: none;
}

/* Its name, so the tie to the open panel is stated rather than inferred from a
   colour. Pinned to the section's own top-left corner and out of the document
   flow, so nothing below it shifts when it appears. */
.lab-tag {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  padding: 0.125rem 0.5rem;
  border-bottom-right-radius: 0.375rem;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .lab-pick {
    transition: none;
  }

  /* The dimming stays — it is what makes the edited section findable, not
     decoration. Only the movement goes. */
  .lab-focusing .lab-pick:not(.lab-active):not(.lab-nodim) {
    transform: none;
  }
}
</style>
