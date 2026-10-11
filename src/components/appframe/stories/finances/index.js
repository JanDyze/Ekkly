import { defineAsyncComponent } from 'vue'

// Finances' story (see ../index.js): what the church has today, Sunday's
// offering entered, the book, the committee's statement and the year by month.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'finances',
  scenes: [
    {
      caption: 'Know what the church has',
      line: 'Cash on hand and in the bank, added up today.',
      duration: 4400,
      scene: scene(() => import('./FinancesBalance.vue')),
    },
    {
      caption: 'Sunday’s offering, in seconds',
      line: 'Filled in already, so only the amount is left to type.',
      duration: 4400,
      scene: scene(() => import('./FinancesEntry.vue')),
    },
    {
      caption: 'Every peso, with its balance',
      line: 'Money in and out, newest first, and found as you type.',
      duration: 4800,
      scene: scene(() => import('./FinancesBook.vue')),
    },
    {
      caption: 'The committee’s statement, done',
      line: 'Income and expenses by line, ready to send as Excel.',
      duration: 4800,
      scene: scene(() => import('./FinancesStatement.vue')),
    },
    {
      caption: 'See the year at a glance',
      line: 'Each month’s in and out side by side, up or down.',
      duration: 4200,
      scene: scene(() => import('./FinancesMonths.vue')),
    },
  ],
}
