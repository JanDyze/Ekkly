<script setup>
import { computed, ref } from "vue";
import { getFullName, missingMemberDetails } from "../../utils/memberUtils";
import { Check } from "../../icons";
import MemberAvatar from "./MemberAvatar.vue";
import YouBadge from "./YouBadge.vue";
import MemberAttentionBadge from "./MemberAttentionBadge.vue";
import { useLongPress } from "../../composables/useLongPress";

const props = defineProps({
  member: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  // Picking mode: the page is gathering people up for one action, so a tap
  // ticks a name instead of opening it.
  picking: {
    type: Boolean,
    default: false,
  },
  checked: {
    type: Boolean,
    default: false,
  },
  // Whether a hold opens anything. Someone who cannot change the roll has no
  // menu to open, so the row should not sink as though it were about to.
  holdable: {
    type: Boolean,
    default: true,
  },
  // The phone's grid: three across leaves no room for a face and a name side
  // by side, so the face goes on top and the name wraps to two lines under it.
  stacked: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["click", "contextmenu", "toggle"]);

// Selection still wins over this: it is what the user just did, while
// the amber is a standing property of the record.
const hasGaps = computed(() => missingMemberDetails(props.member).length > 0);

const handleContextMenu = (event) => {
  event.preventDefault();
  emit("contextmenu", { member: props.member, x: event.clientX, y: event.clientY });
};

// Touch devices have no right-click, so long-press opens the same menu. While
// picking, the whole card is already one big tap target and the menu's actions
// are about a single person, so it stays shut.
// The element itself goes with a long press, so the page can lift it out
// above the dimmed screen while the menu is open (HoldFocus.vue). A
// right-click sends none: dimming a desktop for a context menu would be odd.
const rootEl = ref(null);
const longPress = useLongPress(({ x, y }) => {
  if (props.picking) return;
  emit("contextmenu", { member: props.member, x, y, el: rootEl.value });
});

// The same give under a held finger as the list row (MemberListItem.vue).
const pressStyle = computed(() => {
  const held = longPress.pressing.value && !props.picking && props.holdable;
  return {
    transform: held ? "scale(0.96)" : "scale(1)",
    transition: held
      ? `transform ${longPress.delay}ms cubic-bezier(0.2, 0, 0, 1), background-color 120ms ease`
      : "transform 240ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease",
  };
});

const handleClick = () => {
  if (longPress.consumeClick()) return;
  if (props.picking) {
    emit("toggle", props.member);
    return;
  }
  emit("click", props.member);
};
</script>

<template>
  <div
    ref="rootEl"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @touchstart="longPress.onTouchStart"
    @touchmove="longPress.onTouchMove"
    @touchend="longPress.onTouchEnd"
    @touchcancel="longPress.onTouchEnd"
    :style="pressStyle"
    :class="[
      'relative rounded-lg cursor-pointer select-none touch-callout-none',
      stacked ? 'px-1.5 pt-3 pb-2.5' : 'p-3',
      longPress.pressing.value && !picking && holdable && !hasGaps ? 'bg-gray-100! dark:bg-gray-700!' : '',
      picking && checked
        ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary'
        : selected
        ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary'
        : hasGaps
          ? 'bg-linear-to-br from-amber-100 via-amber-50 to-transparent border-2 border-amber-200 hover:from-amber-200 dark:from-amber-500/25 dark:via-amber-500/10 dark:to-transparent dark:border-amber-500/25 dark:hover:from-amber-500/35'
          : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
    ]"
  >
    <!-- Stacked: face over name. The tick sits in the corner so the face
         keeps the middle. -->
    <div v-if="stacked" class="flex flex-col items-center gap-2 text-center">
      <span
        v-if="picking"
        :class="[
          'absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
          checked
            ? 'bg-primary border-primary text-white'
            : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800 text-transparent',
        ]"
      >
        <Check class="h-3.5 w-3.5" />
      </span>
      <MemberAvatar :member="member" size="h-14 w-14" :data-member-avatar="member.firestoreId || member.id" />
      <div class="w-full min-w-0">
        <p class="line-clamp-2 break-words text-xs font-semibold leading-tight text-gray-900 dark:text-white">
          {{ getFullName(member) }}
        </p>
        <p
          v-if="member.nickname"
          class="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400"
        >
          "{{ member.nickname }}"
        </p>
        <!-- The badges, which sit beside the name in a row, go under it
             here; beside a two-line name they would push it off centre. -->
        <div class="mt-1 flex justify-center gap-1 empty:hidden">
          <MemberAttentionBadge :member="member" />
          <YouBadge :member="member" />
        </div>
      </div>
    </div>

    <!-- Name and nickname only: the full record lives one tap away in the
         details panel, so the grid stays scannable. -->
    <div v-else class="flex items-center gap-3">
      <span
        v-if="picking"
        :class="[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          checked
            ? 'bg-primary border-primary text-white'
            : 'border-gray-300 dark:border-gray-600 text-transparent',
        ]"
      >
        <Check class="h-3.5 w-3.5" />
      </span>
      <MemberAvatar :member="member" :data-member-avatar="member.firestoreId || member.id" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 min-w-0">
          <p class="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {{ getFullName(member) }}
          </p>
          <MemberAttentionBadge :member="member" />
          <YouBadge :member="member" />
        </div>
        <p
          v-if="member.nickname"
          class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate"
        >
          "{{ member.nickname }}"
        </p>
      </div>
    </div>
  </div>
</template>
