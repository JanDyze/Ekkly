<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bank, Coins, Scales } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import OpeningBalanceSheet from '../../components/finances/OpeningBalanceSheet.vue'
import { useFinanceOverview } from '../../composables/useFinanceOverview'
import { usePermissions } from '../../composables/usePermissions'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { getDisplayName } from '../../utils/memberUtils'
import { formatMoney } from '../../utils/moneyUtils'
import { formatEntryDate } from '../../utils/ledgerUtils'

// Where the money is: the cash on hand and the bank, today, and the opening
// balance every figure in the app is counted up from.
//
// The opening balance used to be a strip on the Finances page that only
// appeared when it was missing, so it could be set but never looked at again
// or corrected. It lives here, with what it is the starting point of. The
// home's card for a missing one opens this page with the sheet already open
// (?set=opening).

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { loading, opening, balancesToday, lastDeposit, saveOpening } = useFinanceOverview()
const { can, myMember } = usePermissions()
const { user, displayName } = useAuth()

const canManage = computed(() => can('finances.manage'))
const showOpening = ref(false)
const saving = ref(false)

onMounted(() => {
  if (route.query.set === 'opening' && canManage.value) showOpening.value = true
  if (route.query.set) router.replace({ query: {} })
})

const handleSaveOpening = async (data) => {
  if (saving.value) return
  saving.value = true
  try {
    await saveOpening(data, { uid: user.value?.uid || '', name: getDisplayName(myMember.value) || displayName.value })
    showOpening.value = false
    toast.success('Opening balance saved')
  } catch (error) {
    console.error(error)
    toast.error('Could not save the opening balance')
  } finally {
    saving.value = false
  }
}

const subtitle = computed(() => (loading.value ? '' : `${formatMoney(balancesToday.value.total)} in all`))
</script>

<template>
  <AppScreen title="Accounts" :subtitle="subtitle" :back="{ name: 'FinancesHome' }" root="/finances">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 3" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else class="flex flex-col gap-5">
      <ListGroup title="Today">
        <ListRow title="Cash on hand" :subtitle="lastDeposit ? `Last banked ${formatEntryDate(lastDeposit.date)}` : 'Nothing banked yet'">
          <template #leading>
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <Coins class="size-5" />
            </span>
          </template>
          <template #trailing>
            <span class="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{{ formatMoney(balancesToday.cash) }}</span>
          </template>
        </ListRow>
        <ListRow title="Cash in bank">
          <template #leading>
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <Bank class="size-5" />
            </span>
          </template>
          <template #trailing>
            <span class="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{{ formatMoney(balancesToday.bank) }}</span>
          </template>
        </ListRow>
        <ListRow title="In all">
          <template #trailing>
            <span class="shrink-0 text-base font-bold tabular-nums text-gray-900 dark:text-white">{{ formatMoney(balancesToday.total) }}</span>
          </template>
        </ListRow>
      </ListGroup>

      <ListGroup
        title="Counted from"
        :note="
          opening.isSet
            ? 'Every balance is this, plus everything entered since.'
            : 'Until it is set, the balances count only what has been entered here, from nothing.'
        "
      >
        <ListRow
          v-if="opening.isSet"
          :title="`Opening balance, ${formatEntryDate(opening.asOf)}`"
          :subtitle="`${formatMoney(opening.cash)} on hand · ${formatMoney(opening.bank)} in bank`"
          v-on="canManage ? { click: () => (showOpening = true) } : {}"
        >
          <template #leading>
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              <Scales class="size-5" />
            </span>
          </template>
        </ListRow>
        <ListRow
          v-else
          title="No opening balance yet"
          :subtitle="canManage ? 'Set what was on hand and in the bank on the day the books start' : ''"
          warn
          v-on="canManage ? { click: () => (showOpening = true) } : {}"
        >
          <template #leading>
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              <Scales class="size-5" />
            </span>
          </template>
        </ListRow>
      </ListGroup>
    </div>

    <OpeningBalanceSheet v-model:show="showOpening" :opening="opening" :saving="saving" @save="handleSaveOpening" />
  </AppScreen>
</template>
