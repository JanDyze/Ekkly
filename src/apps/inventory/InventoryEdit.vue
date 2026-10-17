<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import PhotoCapture from '../../components/inventory/PhotoCapture.vue'
import { useInventory } from '../../composables/useInventory'
import { useAuth } from '../../composables/useAuth'
import { usePermissions } from '../../composables/usePermissions'
import { useToast } from '../../composables/useToast'
import { CONDITIONS, STARTER_CATEGORIES, sameName } from '../../utils/inventoryUtils'
import { centavosToInput, parseAmount } from '../../utils/moneyUtils'
import { encodePhoto } from '../../utils/removeBackground'
import { getFullName } from '../../utils/memberUtils'
import { todayKey } from '../../utils/taskUtils'

// Adding a thing, or changing one: the photo first, because on a phone that
// is how it starts — the item is in front of you, you take its picture, then
// you name it. Then what it is called and where it is kept, which are all a
// list needs; how many, its condition, its worth and when it was bought are
// further down for whoever has them to hand.
//
// A screen rather than a sheet (routes.js): the camera, the cut-out and the
// photo as taken side by side need the whole of a phone's screen.

const route = useRoute()
const router = useRouter()
const { items, loading, itemById, categories, locations, addItem, updateItem, uploadItemPhoto } = useInventory()
const { user } = useAuth()
const { myMember } = usePermissions()
const toast = useToast()

const editing = computed(() => route.name === 'InventoryEdit')
const item = computed(() => (editing.value ? itemById(String(route.params.id || '')) : null))
const missing = computed(() => editing.value && !loading.value && !item.value)

const blank = () => ({
  name: '',
  category: '',
  location: '',
  quantity: 1,
  condition: 'good',
  repairNote: '',
  value: '',
  acquired: '',
  notes: '',
})

const form = ref(blank())
// undefined: keep the picture it has; null: no picture; { canvas, cut }: new.
const picture = ref(undefined)
const photoBusy = ref(false)
const saving = ref(false)

// Filled once the item arrives, and not again: a change someone else saves
// while this is open must not wipe what is being typed.
let filledFor = ''
watch(
  item,
  (it) => {
    if (!it || filledFor === it.id) return
    filledFor = it.id
    form.value = {
      name: it.name,
      category: it.category,
      location: it.location,
      quantity: it.quantity,
      condition: it.condition,
      repairNote: it.repairNote,
      value: it.value ? centavosToInput(it.value) : '',
      acquired: it.acquired,
      notes: it.notes,
    }
  },
  { immediate: true }
)

// The church's own categories first, then the starters it has not used.
const categoryOptions = computed(() => [
  ...categories.value,
  ...STARTER_CATEGORIES.filter((name) => !categories.value.some((used) => sameName(used, name))),
])

// A name already on the list, said before saving rather than after: a second
// "Keyboard" is usually the first one, photographed again.
const duplicate = computed(() => {
  const name = form.value.name.trim()
  if (!name) return null
  return items.value.find((it) => sameName(it.name, name) && it.id !== item.value?.id) || null
})

const valid = computed(() => form.value.name.trim() && Number(form.value.quantity) >= 1)

const title = computed(() => (editing.value ? (item.value ? `Edit ${item.value.name}` : 'Edit item') : 'New item'))
const back = computed(() =>
  route.query.back === 'photos'
    ? { name: 'InventoryPhotos' }
    : editing.value
      ? { name: 'InventoryItem', params: { id: route.params.id } }
      : { name: 'InventoryAll' }
)

const save = async () => {
  if (!valid.value || saving.value || photoBusy.value) return
  saving.value = true
  try {
    let stored
    if (picture.value) {
      stored = { ...(await uploadItemPhoto(encodePhoto(picture.value.canvas))), cut: picture.value.cut }
    } else if (picture.value === null) {
      stored = null
    }

    const fields = { ...form.value, value: parseAmount(form.value.value) }
    if (fields.condition !== 'repair') fields.repairNote = ''

    if (editing.value && item.value) {
      // Repair's start date belongs to the change of condition, not the form.
      if (fields.condition === 'repair' && item.value.condition !== 'repair') {
        fields.conditionSince = todayKey()
      } else if (fields.condition !== 'repair') {
        fields.conditionSince = ''
      }
      await updateItem(item.value, fields, stored)
      toast.success('Saved')
      router.replace(back.value)
    } else {
      if (fields.condition === 'repair') {
        fields.conditionSince = todayKey()
      }
      const id = await addItem(fields, stored ?? null, {
        uid: user.value?.uid || '',
        name: myMember.value ? getFullName(myMember.value).trim() : user.value?.displayName || '',
      })
      toast.success(`${fields.name.trim()} added`)
      router.replace({ name: 'InventoryItem', params: { id } })
    }
  } catch (error) {
    console.error('Error saving an inventory item:', error)
    toast.error('Could not save that item. Please try again.')
  } finally {
    saving.value = false
  }
}

const LABEL = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const INPUT =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const HINT = 'mt-1 text-xs text-gray-500 dark:text-gray-400'
</script>

<template>
  <AppScreen
    :title="title"
    :back="back"
    :trail="item ? [{ label: 'All items', to: { name: 'InventoryAll' } }, { label: item.name, to: { name: 'InventoryItem', params: { id: item.id } } }] : null"
    root="/inventory"
  >
    <ListGroup v-if="missing">
      <ListRow title="This item is not on the list" subtitle="It may have been deleted." :to="{ name: 'InventoryAll' }" />
    </ListGroup>

    <div v-else-if="editing && !item" class="flex flex-col gap-3" aria-hidden="true">
      <div class="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
      <div class="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    </div>

    <form v-else class="flex flex-col gap-5" @submit.prevent="save">
      <PhotoCapture v-model:picture="picture" v-model:busy="photoBusy" :item="item" />

      <div class="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
        <div>
          <label for="item-name" :class="LABEL">What is it <span class="text-red-500">*</span></label>
          <input id="item-name" v-model="form.name" required autocomplete="off" placeholder="Yamaha keyboard" :class="INPUT" />
          <p v-if="duplicate" class="mt-1 text-xs text-amber-700 dark:text-amber-400">
            “{{ duplicate.name }}” is already on the list. Save anyway if this is another one.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="item-category" :class="LABEL">What kind of thing</label>
            <input id="item-category" v-model="form.category" list="item-categories" autocomplete="off" placeholder="Sound" :class="INPUT" />
            <datalist id="item-categories">
              <option v-for="name in categoryOptions" :key="name" :value="name" />
            </datalist>
          </div>
          <div>
            <label for="item-location" :class="LABEL">Where it is kept</label>
            <input id="item-location" v-model="form.location" list="item-locations" autocomplete="off" placeholder="Sound booth" :class="INPUT" />
            <datalist id="item-locations">
              <option v-for="name in locations" :key="name" :value="name" />
            </datalist>
          </div>
        </div>

        <div>
          <label for="item-quantity" :class="LABEL">How many</label>
          <input id="item-quantity" v-model.number="form.quantity" type="number" inputmode="numeric" min="1" :class="[INPUT, 'max-w-32']" />
          <p :class="HINT">One record for a stack of the same thing: 120 monobloc chairs, 6 microphones.</p>
        </div>

        <fieldset>
          <legend :class="LABEL">What condition it is in</legend>
          <div class="flex h-10 items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700" role="radiogroup">
            <button
              v-for="option in CONDITIONS"
              :key="option.key"
              type="button"
              role="radio"
              :aria-checked="form.condition === option.key"
              :class="[
                'h-9 min-w-0 flex-1 truncate rounded-md px-2 text-xs font-medium sm:text-sm',
                form.condition === option.key
                  ? 'bg-white text-primary shadow-sm dark:bg-gray-800 dark:text-primary-light'
                  : 'text-gray-500 dark:text-gray-400',
              ]"
              @click="form.condition = option.key"
            >
              {{ option.key === 'worn' ? 'Worn' : option.label }}
            </button>
          </div>
        </fieldset>

        <div v-if="form.condition === 'repair'">
          <label for="item-repair" :class="LABEL">What is wrong with it</label>
          <input id="item-repair" v-model="form.repairNote" placeholder="Left speaker crackles" :class="INPUT" />
        </div>
      </div>

      <div class="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="item-value" :class="LABEL">What one is worth (₱)</label>
            <input id="item-value" v-model="form.value" inputmode="decimal" autocomplete="off" placeholder="15,000" :class="INPUT" />
            <p :class="HINT">For the insurer and the year-end report. Leave empty if nobody knows.</p>
          </div>
          <div>
            <label for="item-acquired" :class="LABEL">When the church got it</label>
            <input id="item-acquired" v-model="form.acquired" type="date" :class="INPUT" />
          </div>
        </div>
        <div>
          <label for="item-notes" :class="LABEL">Notes</label>
          <textarea id="item-notes" v-model="form.notes" rows="3" placeholder="Serial no. 4471-B. Donated by the Santos family." :class="INPUT" />
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="h-11 rounded-lg bg-gray-100 px-4 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          @click="router.replace(back)"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="!valid || saving || photoBusy"
          :class="[
            'h-11 rounded-lg px-5 font-medium',
            valid && !saving && !photoBusy
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
          ]"
        >
          {{ saving ? 'Saving…' : photoBusy ? 'Finishing the photo…' : editing ? 'Update' : 'Save' }}
        </button>
      </div>
    </form>
  </AppScreen>
</template>
