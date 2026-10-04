<script setup>
import { computed } from 'vue'
import { Building2, Check, Pencil, Plus, X } from '../../icons'
import { FONTS, HERO_STYLES, PALETTE, PAPERS, STOCK } from '../../data/landingLabMock'
import { SECTION_TYPES } from '../../data/landingSchema'
import { model } from '../../composables/useLandingLab'
import { useAppSettings } from '../../composables/useAppSettings'
import { usePermissions } from '../../composables/usePermissions'

// The fields of one part of the public page: Look, the header, or a section.
//
// Shared by the builder's pane and the preview's bottom sheet, so a phone
// editing from the page and a desktop editing from the pane are filling in the
// same form and cannot drift apart. It writes straight into the shared model
// (useLandingLab.js) — there is nothing to save, so there is nothing to emit
// but the one thing it cannot do itself: open Church details, whose sheet
// belongs to the screen rather than to a form inside it.

const props = defineProps({
  // 'look', 'hero', or a section's id.
  part: { type: String, default: '' },
})

const emit = defineEmits(['edit-church'])

const { church, logoUrl } = useAppSettings()
const { isAdmin } = usePermissions()

const section = computed(() => model.sections.find((one) => one.id === props.part) || null)

// The fields this section shows that are the church's rather than the page's,
// each knowing the step of the Church details sheet it lives on.
const churchFields = computed(() =>
  section.value ? SECTION_TYPES[section.value.type].fields.filter((f) => f.type === 'church') : []
)

const addRow = (owner, field) => {
  const row = {}
  for (const sub of field.item) row[sub.key] = sub.type === 'image' ? STOCK[0].id : ''
  owner[field.key] = [...owner[field.key], row]
}

const removeRow = (owner, field, index) => {
  owner[field.key] = owner[field.key].filter((_, i) => i !== index)
}

const togglePick = (owner, id) => {
  owner.picks = owner.picks.includes(id)
    ? owner.picks.filter((p) => p !== id)
    : [...owner.picks, id]
}

const label = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'
const field =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const chip = 'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors'
const chipOn = 'bg-primary text-white'
const chipOff =
  'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
const linked = 'rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800'
const linkedHead =
  'flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500'
const linkedBtn =
  'inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light'
</script>

<template>
  <div>
    <!-- Look: the three things that change the whole page. -->
    <div v-if="part === 'look'" class="space-y-4">
      <div>
        <p :class="label">Colour</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="colour in PALETTE"
            :key="colour.hex"
            :title="colour.name"
            :aria-label="colour.name"
            :aria-pressed="model.theme.accent === colour.hex"
            :class="[
              'h-10 w-10 rounded-full border transition-transform hover:scale-110',
              model.theme.accent === colour.hex
                ? 'border-transparent ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900'
                : 'border-black/10 dark:border-white/20',
            ]"
            :style="{ backgroundColor: colour.hex }"
            @click="model.theme.accent = colour.hex"
          >
            <Check
              v-if="model.theme.accent === colour.hex"
              class="mx-auto h-4 w-4 text-white drop-shadow"
            />
          </button>
        </div>
      </div>
      <div>
        <p :class="label">Background</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="p in PAPERS"
            :key="p.id"
            :class="[chip, model.theme.paper === p.id ? chipOn : chipOff]"
            @click="model.theme.paper = p.id"
          >
            {{ p.name }}
          </button>
        </div>
      </div>
      <div>
        <p :class="label">Lettering</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="f in FONTS"
            :key="f.id"
            :class="[chip, model.theme.font === f.id ? chipOn : chipOff]"
            :style="{ fontFamily: f.stack }"
            @click="model.theme.font = f.id"
          >
            {{ f.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- The header -->
    <div v-else-if="part === 'hero'" class="space-y-3">
      <div>
        <p :class="label">Style</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="style in HERO_STYLES"
            :key="style.id"
            :class="[chip, model.hero.style === style.id ? chipOn : chipOff]"
            @click="model.hero.style = style.id"
          >
            {{ style.name }}
          </button>
        </div>
      </div>
      <div :class="linked">
        <p :class="linkedHead">
          <Building2 class="h-3.5 w-3.5" />
          From Church details
        </p>
        <div class="mt-2 flex items-center gap-3">
          <img v-if="logoUrl" :src="logoUrl" alt="" class="h-9 w-auto shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {{ church.shortName }}
            </p>
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">
              {{ church.branch || 'No branch' }}
            </p>
          </div>
        </div>
        <div v-if="isAdmin" class="mt-3 flex flex-wrap gap-2">
          <button :class="linkedBtn" @click="emit('edit-church', 0)">
            <Pencil class="h-3.5 w-3.5" />
            Edit name
          </button>
          <RouterLink :to="{ path: '/settings', query: { section: 'church' } }" :class="linkedBtn">
            Change logo
          </RouterLink>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label :class="label">Greeting</label>
          <input v-model="model.hero.greeting" type="text" :class="field" />
        </div>
        <div>
          <label :class="label">Headline</label>
          <input v-model="model.hero.headline" type="text" :class="field" />
        </div>
      </div>
      <div>
        <label :class="label">Under it</label>
        <textarea v-model="model.hero.sub" rows="2" :class="field"></textarea>
      </div>
      <div>
        <label :class="label">Button</label>
        <input v-model="model.hero.cta" type="text" :class="field" />
      </div>
      <div v-if="model.hero.style !== 'plain'">
        <p :class="label">Photo</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="photo in STOCK"
            :key="photo.id"
            :class="[
              'h-14 w-14 overflow-hidden rounded-lg border-2',
              model.hero.image === photo.id ? 'border-primary' : 'border-transparent opacity-60',
            ]"
            :aria-label="photo.label"
            @click="model.hero.image = photo.id"
          >
            <img :src="photo.src" alt="" class="h-full w-full object-cover" />
          </button>
        </div>
      </div>
    </div>

    <!-- A section, built from its type's own field list. -->
    <div v-else-if="section" class="space-y-3">
      <div v-for="f in SECTION_TYPES[section.type].fields" :key="f.key">
        <template v-if="f.type === 'text'">
          <label :class="label">{{ f.label }}</label>
          <input v-model="section[f.key]" type="text" :class="field" />
        </template>

        <template v-else-if="f.type === 'textarea'">
          <label :class="label">{{ f.label }}</label>
          <textarea v-model="section[f.key]" rows="4" :class="field"></textarea>
        </template>

        <template v-else-if="f.type === 'church'">
          <p :class="label">{{ f.label }}</p>
          <p
            :class="[
              'whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700/50',
              church[f.key] ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500',
            ]"
          >
            {{ church[f.key] || 'Not set' }}
          </p>
        </template>

        <template v-else-if="f.type === 'choice'">
          <p :class="label">{{ f.label }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in f.options"
              :key="option"
              :class="[chip, section[f.key] === option ? chipOn : chipOff]"
              @click="section[f.key] = option"
            >
              {{ option }}
            </button>
          </div>
        </template>

        <template v-else-if="f.type === 'image'">
          <p :class="label">{{ f.label }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="photo in STOCK"
              :key="photo.id"
              :class="[
                'h-14 w-14 overflow-hidden rounded-lg border-2',
                section[f.key] === photo.id ? 'border-primary' : 'border-transparent opacity-60',
              ]"
              :aria-label="photo.label"
              @click="section[f.key] = photo.id"
            >
              <img :src="photo.src" alt="" class="h-full w-full object-cover" />
            </button>
          </div>
        </template>

        <template v-else-if="f.type === 'gallery'">
          <p :class="label">{{ f.label }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="photo in STOCK"
              :key="photo.id"
              :class="[
                'h-14 w-14 overflow-hidden rounded-lg border-2',
                section.picks.includes(photo.id)
                  ? 'border-primary'
                  : 'border-transparent opacity-40',
              ]"
              :aria-label="photo.label"
              :aria-pressed="section.picks.includes(photo.id)"
              @click="togglePick(section, photo.id)"
            >
              <img :src="photo.src" alt="" class="h-full w-full object-cover" />
            </button>
          </div>
        </template>

        <template v-else-if="f.type === 'list'">
          <p :class="label">{{ f.label }}</p>
          <div class="space-y-2">
            <div
              v-for="(line, lineIndex) in section[f.key]"
              :key="lineIndex"
              class="flex items-start gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50"
            >
              <div class="min-w-0 flex-1 space-y-2">
                <template v-for="sub in f.item" :key="sub.key">
                  <input
                    v-if="sub.type === 'text'"
                    v-model="line[sub.key]"
                    type="text"
                    :placeholder="sub.label"
                    :aria-label="sub.label"
                    :class="field"
                  />
                  <div v-else-if="sub.type === 'image'" class="flex flex-wrap gap-1.5">
                    <button
                      v-for="photo in STOCK"
                      :key="photo.id"
                      :class="[
                        'h-9 w-9 overflow-hidden rounded border-2',
                        line[sub.key] === photo.id
                          ? 'border-primary'
                          : 'border-transparent opacity-50',
                      ]"
                      :aria-label="photo.label"
                      @click="line[sub.key] = photo.id"
                    >
                      <img :src="photo.src" alt="" class="h-full w-full object-cover" />
                    </button>
                  </div>
                </template>
              </div>
              <button
                class="rounded-lg p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                :aria-label="`Remove ${f.label} ${lineIndex + 1}`"
                @click="removeRow(section, f, lineIndex)"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            class="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
            @click="addRow(section, f)"
          >
            <Plus class="h-3.5 w-3.5" />
            {{ f.addLabel || 'Add' }}
          </button>
        </template>
      </div>

      <!-- Said once under the fields rather than on each of them: the
           point is that these are the church's, and where to change
           them. -->
      <div v-if="churchFields.length" :class="linked">
        <p :class="linkedHead">
          <Building2 class="h-3.5 w-3.5" />
          From Church details
        </p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          These are your church's own details, so a change here shows everywhere, straight away.
        </p>
        <button
          v-if="isAdmin"
          :class="[linkedBtn, 'mt-3']"
          @click="emit('edit-church', churchFields[0].step)"
        >
          <Pencil class="h-3.5 w-3.5" />
          Edit church details
        </button>
      </div>
    </div>
  </div>
</template>
