<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { listBarangays, listCities, listProvinces } from '../../api/psgcService'

// An address picked rather than typed: province, then city or municipality,
// then barangay, each a list of the real places (psgcService), and a line for
// the house and street, which no list can know.
//
// Typed, the same barangay came out four ways — "Brgy. San Isidro", "San
// Isidro", "Bgy San Isidro, Antipolo", "sanisidro" — and nobody could ask the
// roll who lives in it. Picked, it is one name, spelt the government's way.
//
// The record still keeps one line of text, `address`, which is what every
// list, export and the Claude connector read; this writes it from the parts.
// The parts are kept beside it (`parts`: the codes and names picked, and the
// street), so the picker opens on the same place next time. A record from
// before has only its line of text: it goes in the street line untouched, and
// nothing is rewritten until somebody picks a place.
//
// With no signal and nothing kept from before, the lists cannot load; the
// street line then takes the whole address, as the field always did.

const props = defineProps({
  modelValue: { type: String, default: '' },
  parts: { type: Object, default: null },
  fieldClass: { type: [String, Array], default: '' },
  labelClass: { type: [String, Array], default: '' },
})

const emit = defineEmits(['update:modelValue', 'update:parts'])

const provinces = ref([])
const cities = ref([])
const barangays = ref([])

const province = ref(props.parts?.province?.code || '')
const city = ref(props.parts?.city?.code || '')
const barangay = ref(props.parts?.barangay?.code || '')
const street = ref(props.parts ? props.parts.street || '' : props.modelValue || '')

const failed = ref(false)
const loading = ref('')

const load = async (what, list, call) => {
  loading.value = what
  try {
    list.value = await call()
    failed.value = false
  } catch {
    failed.value = true
  } finally {
    if (loading.value === what) loading.value = ''
  }
}

onMounted(async () => {
  await load('provinces', provinces, listProvinces)
  if (province.value) await load('cities', cities, () => listCities(province.value))
  if (city.value) await load('barangays', barangays, () => listBarangays(city.value))
})

const named = (list, code) => list.value.find((row) => row.code === code) || null

/** "Brgy. San Isidro", but "Barangay 12" left as it is. */
const brgy = (name) => (/^(barangay|brgy|poblacion)/i.test(name) ? name : `Brgy. ${name}`)

// Written up only once somebody has touched the picker, so opening a record
// from before does not rewrite its address.
const send = () => {
  const p = named(provinces, province.value)
  const c = named(cities, city.value)
  const b = named(barangays, barangay.value)
  const line = [street.value.trim(), b && brgy(b.name), c?.name, p?.name].filter(Boolean).join(', ')
  emit('update:modelValue', line)
  emit(
    'update:parts',
    p || c || b
      ? {
          province: p ? { code: p.code, name: p.name } : null,
          city: c ? { code: c.code, name: c.name } : null,
          barangay: b ? { code: b.code, name: b.name } : null,
          street: street.value.trim(),
        }
      : null
  )
}

const pickProvince = async () => {
  city.value = ''
  barangay.value = ''
  cities.value = []
  barangays.value = []
  send()
  if (province.value) await load('cities', cities, () => listCities(province.value))
}

const pickCity = async () => {
  barangay.value = ''
  barangays.value = []
  send()
  if (city.value) await load('barangays', barangays, () => listBarangays(city.value))
}

// The record changing underneath (a fresh open of the sheet) starts over from it.
watch(
  () => props.parts,
  (parts, before) => {
    if (JSON.stringify(parts) === JSON.stringify(before)) return
    if (parts?.province?.code === province.value && parts?.city?.code === city.value) return
    province.value = parts?.province?.code || ''
    city.value = parts?.city?.code || ''
    barangay.value = parts?.barangay?.code || ''
    street.value = parts ? parts.street || '' : props.modelValue || ''
  }
)

const placeholder = (what, list) => (loading.value === what ? 'Loading…' : list.length ? 'Choose' : '—')
const picked = computed(() => Boolean(province.value))
</script>

<template>
  <div class="space-y-3">
    <template v-if="!failed">
      <div>
        <label for="ap-province" :class="labelClass">Province</label>
        <select id="ap-province" v-model="province" :class="fieldClass" @change="pickProvince">
          <option value="">{{ placeholder('provinces', provinces) }}</option>
          <option v-for="row in provinces" :key="row.code" :value="row.code">{{ row.name }}</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="min-w-0">
          <label for="ap-city" :class="labelClass">City or town</label>
          <select id="ap-city" v-model="city" :disabled="!province" :class="[fieldClass, 'disabled:opacity-50']" @change="pickCity">
            <option value="">{{ placeholder('cities', cities) }}</option>
            <option v-for="row in cities" :key="row.code" :value="row.code">{{ row.name }}</option>
          </select>
        </div>
        <div class="min-w-0">
          <label for="ap-brgy" :class="labelClass">Barangay</label>
          <select id="ap-brgy" v-model="barangay" :disabled="!city" :class="[fieldClass, 'disabled:opacity-50']" @change="send">
            <option value="">{{ placeholder('barangays', barangays) }}</option>
            <option v-for="row in barangays" :key="row.code" :value="row.code">{{ row.name }}</option>
          </select>
        </div>
      </div>
    </template>
    <p v-else class="text-xs text-amber-700 dark:text-amber-400">
      The list of places could not load. Type the whole address below instead.
    </p>

    <div>
      <label for="ap-street" :class="labelClass">{{ failed ? 'Address' : 'House, street, purok' }}</label>
      <input
        id="ap-street"
        v-model="street"
        autocomplete="off"
        :placeholder="failed ? '12 Rizal St., Brgy. San Isidro, Antipolo' : '12 Rizal St., Purok 3'"
        :class="fieldClass"
        @input="picked || failed ? send() : emit('update:modelValue', street)"
      />
    </div>
  </div>
</template>
