<script setup>
import { computed } from 'vue'
import { BookOpenText, Microphone, UsersFour, UsersThree } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import AppShortcuts from '../../components/appframe/AppShortcuts.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import DeckFaces from '../../components/appframe/DeckFaces.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useTeachingOverview } from '../../composables/useTeachingOverview'
import { getDisplayName, listPhrase } from '../../utils/memberUtils'
import { formatServiceDate } from '../../utils/lineupUtils'
import { plural } from '../../utils/teachingUtils'

// The Teaching app's home, built the way People's and Minutes' are. One
// screen, and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way useTeachingOverview explains: your own message or lesson for
//      Sunday with nothing written, then, for whoever plans, the message
//      nobody has written, the classes with no lesson, the teachers with
//      nothing to teach, and the classes still to set up. Under them, the card
//      that is always there: this coming Sunday — the message, who preaches
//      and how many classes are ready.
//   2. The doors: the sermons, Sunday school, the lesson plans and what is
//      taught when, each its name alone, with a count only for what is
//      waiting on you.

const {
  loading,
  myMember,
  canManageTeaching,
  thisSunday,
  sundayIsSoon,
  daysToSunday,
  themeOn,
  preachersOn,
  scheduledTeachersOn,
  sermonOn,
  activeClasses,
  lessonFor,
  myMessageWaiting,
  messageWaiting,
  myLessonWaiting,
  classesWithoutLesson,
  teachersWithoutLesson,
  sermonsToWrite,
} = useTeachingOverview()

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/** "Sunday", or "today" on the day itself, for the cards' words. */
const whenSunday = computed(() => (daysToSunday.value === 0 ? 'today' : 'Sunday'))
const namesOf = (people) => listPhrase(people.map(getDisplayName))

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  if (loading.value || !thisSunday.value) return [alwaysCard.value]
  const date = thisSunday.value
  const theme = themeOn(date)
  const tone = sundayIsSoon.value ? 'warn' : 'plain'
  const list = []

  // Your own message first: nobody else can write it.
  if (myMessageWaiting.value) {
    list.push({
      kind: 'dated',
      key: `my-message:${date}`,
      tone,
      icon: Microphone,
      dismissible: true,
      kicker: `You preach ${whenSunday.value}`,
      title: theme ? `Start your notes for “${theme}”` : 'Start your notes for the message',
      detail: 'The title, passages and outline go up on the screen from here.',
      to: { name: 'TeachingSermon', params: { date }, query: { edit: '1' } },
      date,
    })
  }

  // Then your own lesson, for the same reason.
  if (myLessonWaiting.value) {
    const cls = myLessonWaiting.value.cls
    list.push({
      kind: 'dated',
      key: `my-lesson:${date}:${cls?.id || ''}`,
      tone,
      icon: BookOpenText,
      dismissible: true,
      kicker: `You teach ${whenSunday.value}`,
      title: cls ? `${cls.name} has no lesson yet` : 'No lesson planned for you yet',
      detail: 'Start from a plan in the library, or write your own.',
      to: cls ? { name: 'TeachingClass', params: { classId: cls.id } } : { name: 'TeachingSchool' },
      date,
    })
  }

  // The message for whoever plans the preaching: somebody can still ask the
  // preacher before the week runs out.
  if (messageWaiting.value) {
    const preachers = preachersOn(date)
    list.push({
      kind: 'people',
      key: `message:${date}`,
      tone,
      icon: Microphone,
      dismissible: true,
      kicker: 'Sunday’s message',
      title: preachers.length ? `${namesOf(preachers)} preaches. Nothing written yet` : `“${theme}” has nothing written yet`,
      detail: 'The slides and the children’s lesson wait on it.',
      to: { name: 'TeachingSermon', params: { date } },
      members: preachers,
      caption: formatServiceDate(date),
    })
  }

  // The classes with nothing for Sunday, named, for whoever runs Sunday school.
  if (canManageTeaching.value && classesWithoutLesson.value.length) {
    const missing = classesWithoutLesson.value
    list.push({
      kind: 'chips',
      key: `classes:${date}:${missing.map((cls) => cls.id).join(',')}`,
      tone,
      icon: UsersFour,
      dismissible: true,
      kicker: 'Sunday school',
      title: missing.length === 1 ? `${missing[0].name} has no lesson for ${whenSunday.value}` : `${missing.length} classes have no lesson for ${whenSunday.value}`,
      detail: `${plural(activeClasses.value.length - missing.length, 'class is', 'classes are')} ready.`,
      to: { name: 'TeachingSchool' },
      chips: missing.map((cls) => ({ key: cls.id, label: cls.name })),
    })
  }

  // Teachers on the schedule with nothing to teach: the class card says which
  // rooms, this says who to hand a plan to.
  if (canManageTeaching.value && teachersWithoutLesson.value.length) {
    const people = teachersWithoutLesson.value
    list.push({
      kind: 'people',
      key: `teachers:${date}:${people.map((m) => m.id || m.firestoreId).join(',')}`,
      tone: 'plain',
      icon: UsersThree,
      dismissible: true,
      kicker: 'On the schedule',
      title: `${namesOf(people)} ${people.length === 1 ? 'teaches' : 'teach'} ${whenSunday.value} with no lesson`,
      detail: 'Hand them a plan from the library while there is time.',
      to: { name: 'TeachingCalendar' },
      members: people,
      caption: '',
    })
  }

  // No classes yet: a one-time job, so put away it stays away (`remember`).
  if (canManageTeaching.value) {
    list.push({
      kind: 'plain',
      key: 'setup',
      tone: 'plain',
      icon: UsersFour,
      dismissible: true,
      remember: true,
      level: activeClasses.value.length ? 0 : 1,
      kicker: 'Sunday school',
      title: 'Add your Sunday school classes',
      detail: 'Then each class’s Sunday can say whether its lesson is ready.',
      to: { name: 'TeachingSchool', query: { add: '1' } },
    })
  }

  list.push(alwaysCard.value)
  return list
})

/** The card that is always there: this coming Sunday, as it is being taught. */
const alwaysCard = computed(() => {
  const date = thisSunday.value
  if (loading.value || !date) return { kind: 'always', key: 'sunday', tone: 'accent', kicker: greeting.value, title: 'Teaching', detail: '' }
  const sermon = sermonOn(date)
  const preachers = preachersOn(date)
  const ready = activeClasses.value.filter((cls) => lessonFor(cls.id, date)).length
  const teachers = scheduledTeachersOn(date)
  const people = [...preachers, ...teachers.filter((t) => !preachers.includes(t))]
  return {
    kind: 'always',
    key: 'sunday',
    tone: 'accent',
    kicker: greeting.value,
    title: sermon?.title || themeOn(date) || formatServiceDate(date),
    detail: [
      preachers.length ? `${namesOf(preachers)} preaching` : 'Nobody preaching yet',
      activeClasses.value.length ? `${ready} of ${plural(activeClasses.value.length, 'class', 'classes')} ready` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    to: { name: 'TeachingCalendar' },
    members: people,
    caption: sermon?.title || themeOn(date) ? (daysToSunday.value === 0 ? 'Today' : formatServiceDate(date)) : '',
  }
})

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count only for what is waiting on you — amber
// when Sunday is two days off or less.
const doors = computed(() => {
  const ready = !loading.value
  const schoolWaiting = canManageTeaching.value ? classesWithoutLesson.value.length : myLessonWaiting.value ? 1 : 0
  return [
    {
      key: 'sermons',
      title: 'Sermons',
      art: 'teaching-sermons',
      to: { name: 'TeachingSermons' },
      badge: ready ? sermonsToWrite.value.length : 0,
      urgent: sundayIsSoon.value && sermonsToWrite.value.includes(thisSunday.value),
    },
    {
      key: 'school',
      title: 'Sunday school',
      art: 'teaching-school',
      to: { name: 'TeachingSchool' },
      badge: ready ? schoolWaiting : 0,
      urgent: sundayIsSoon.value && schoolWaiting > 0,
    },
    { key: 'plans', title: 'Lesson plans', art: 'teaching-plans', to: { name: 'TeachingPlans' } },
    { key: 'calendar', title: 'What’s taught', art: 'teaching-calendar', to: { name: 'TeachingCalendar' } },
  ]
})
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-4">
      <!-- 1. What needs doing before Sunday, most important on top -->
      <AppHeroDeck :cards="cards" scope="teaching" label="Teaching this week" class="animate-rise">
        <template #card="{ card }">
          <!-- Your own message or lesson: the Sunday it is for. -->
          <DeckCard
            v-if="card.kind === 'dated'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <template #leading>
              <DateTile :date="card.date" highlight />
            </template>
          </DeckCard>

          <!-- Who it is about: their faces. -->
          <DeckCard
            v-else-if="card.kind === 'people'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <DeckFaces v-if="card.members.length" :tone="card.tone" :members="card.members" :caption="card.caption" />
          </DeckCard>

          <!-- Which classes: their names. -->
          <DeckCard
            v-else-if="card.kind === 'chips'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <DeckChips :tone="card.tone" :items="card.chips" :max="3" />
          </DeckCard>

          <DeckCard
            v-else-if="card.kind === 'plain'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          />

          <!-- This coming Sunday: the message, and everyone teaching it. -->
          <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
            <template #art>
              <CardPanes />
            </template>
            <!-- The Teaching artwork, on white because its orange and blue
                 are Ekkly's and need a white ground on a coloured card. -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
                <AppArt app-key="teaching" :play="1" class="size-10" />
              </span>
            </template>
            <template v-if="card.members?.length || card.caption" #default>
              <DeckFaces tone="accent" :members="card.members || []" :caption="card.caption" />
            </template>
          </DeckCard>
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <AppShortcuts :doors="doors" label="Teaching" />
    </div>
  </AppScreen>
</template>
