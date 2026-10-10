<script setup>
// How the home of all apps draws its apps, for everyone in the church who has
// not chosen their own in Preferences (useHomeCards). Saved the moment a style
// is tapped: there is nothing else on the card to wait for.
import { computed } from 'vue'
import { SquaresFour } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import CardStylePicker from '../home/CardStylePicker.vue'
import { useAppSettings } from '../../composables/useAppSettings'
import { useToast } from '../../composables/useToast'
import { homeCardName, homeCardStyle } from '../../data/homeCards'

const toast = useToast()
const { homeCards, saveHomeCards } = useAppSettings()

const chosen = computed(() => homeCardStyle(homeCards.value))

const choose = async (key) => {
  try {
    await saveHomeCards(key)
    toast.success(`Home apps now drawn as ${homeCardName(key)}`)
  } catch {
    toast.error('Could not save that style. Please try again.')
  }
}
</script>

<template>
  <SectionCard
    head-class="section-head"
    :icon="SquaresFour"
    title="Home"
    subtitle="How the home draws its apps for everyone. Anyone can still pick their own in Preferences."
  >
    <div class="p-4">
      <CardStylePicker :model-value="chosen" @update:model-value="choose" />
    </div>
  </SectionCard>
</template>
