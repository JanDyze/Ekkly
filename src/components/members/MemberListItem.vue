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
// picking, the whole row is already one big tap target and the menu's actions
// are about a single person, so it stays shut.
// The element itself goes with a long press, so the page can lift it out
// above the dimmed screen while the menu is open (HoldFocus.vue). A
// right-click sends none: dimming a desktop for a context menu would be odd.
const rootEl = ref(null);
const longPress = useLongPress(({ x, y }) => {
  if (props.picking) return;
  emit("contextmenu", { member: props.member, x, y, el: rootEl.value });
});

// While a finger rests on the row it sinks, slowly, over the whole hold - so
// the squeeze is itself the countdown to the menu - and eases back quickly
// when let go. Not while picking: there a tap ticks and a hold does nothing.
const pressStyle = computed(() => {
  const held = longPress.pressing.value && !props.picking && props.holdable;
  return {
    transform: held ? "scale(0.97)" : "scale(1)",
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
      // Square and full width: the row is the list's own stripe, not a card
      // inside it, so a press or a selection colours it edge to edge. Rings
      // are inset for the same reason - an outside ring would be clipped.
      'px-4 py-2 cursor-pointer select-none touch-callout-none',
      longPress.pressing.value && !picking ? 'bg-gray-100 dark:bg-gray-700/50' : '',
      picking && checked
        ? 'bg-primary/10 dark:bg-primary/20 ring-1 ring-inset ring-primary/40'
        : selected
        ? 'bg-primary/10 dark:bg-primary/20 ring-1 ring-inset ring-primary/30 dark:ring-primary-light/30'
        : hasGaps
          ? 'bg-linear-to-r from-amber-100 via-amber-50 to-transparent hover:from-amber-200 dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent dark:hover:from-amber-500/30'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
    ]"
  >
    <!-- Name and nickname only: the full record lives one tap away in the
         details panel, so the list stays scannable. -->
    <div class="flex items-center gap-3">
      <span
        v-if="picking"
        :class="[
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          checked
            ? 'bg-primary border-primary text-white'
            : 'border-gray-300 dark:border-gray-600 text-transparent',
        ]"
      >
        <Check class="h-4 w-4" />
      </span>
      <MemberAvatar :member="member" size="h-10 w-10" :data-member-avatar="member.firestoreId || member.id" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
            {{ getFullName(member) }}
          </p>
          <MemberAttentionBadge :member="member" />
          <YouBadge :member="member" />
        </div>
        <p
          v-if="member.nickname"
          class="text-xs text-gray-500 dark:text-gray-400 truncate"
        >
          "{{ member.nickname }}"
        </p>
      </div>
    </div>
  </div>
</template>
