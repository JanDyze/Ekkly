<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, onActivated } from "vue";
import { motionLevel } from "../../composables/useMotion";
import { useRouter, useRoute } from "vue-router";
import { useMembers } from "../../composables/useMembers";
import { useMemberSearch } from "../../composables/useMemberSearch";
import { useMemberSorting } from "../../composables/useMemberSorting";
import { useMemberForm } from "../../composables/useMemberForm";
import { useListScrollMemory } from "../../composables/useListScrollMemory";
import { useToast } from "../../composables/useToast";
import PeopleDock from "../../components/members/PeopleDock.vue";
import PeopleMenu from "../../components/members/PeopleMenu.vue";
import SortSheet from "../../components/common/SortSheet.vue";
import MemberEditSheet from "../../components/members/MemberEditSheet.vue";
import MemberContextMenu from "../../components/members/MemberContextMenu.vue";
import ExportDialog from "../../components/members/ExportDialog.vue";
import MemberCard from "../../components/members/MemberCard.vue";
import MemberListItem from "../../components/members/MemberListItem.vue";
import ConfirmationModal from "../../components/common/ConfirmationModal.vue";
import BulkAssignSheet from "../../components/members/BulkAssignSheet.vue";
import AppScreen from "../../components/appframe/AppScreen.vue";
import { exportToExcel } from "../../utils/exportUtils";
import { mergeTagSources } from "../../utils/memberUtils";
import { usePermissions } from "../../composables/usePermissions";
import { useMinistries } from "../../composables/useMinistries";
import { areaLabel } from "../../data/capabilities";
import { CheckCircle, Church, Download, Plus, Tag, UsersThree, X } from "../../icons";
import {
  subscribeToCustomTags,
  addCustomTag,
  addTagToMembers,
  removeTagFromMembers,
} from "../../api/tagsService";
import {
  addMinistryToMembers,
  removeMinistryFromMembers,
} from "../../api/ministriesService";

const toast = useToast();

const router = useRouter();
const route = useRoute();
// The roll can be a list (names first, quick to scan) or a grid (faces first,
// for putting names to people you have seen). Remembered on this device only -
// it is how this person likes to read, not a church setting - and blocked or
// private-mode storage just falls back to the list. A desktop chooses the
// same way now: inside the People app the roll is one centred column there
// too, which is a phone's width rather than room for faces and names both.
const VIEW_KEY = "ekkly:people-view";
const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
};
const mobileView = ref(readView());

// Switching between them, each face on screen glides from its place in one
// to its place in the other, growing or shrinking as it goes, so the eye
// keeps hold of who was where instead of the roll simply being redrawn. Only
// the faces in view take part: measuring the whole roll would cost what the
// view transition into a record once did (router/viewTransitions.js). Faces
// with nowhere to come from fade in. None of it for anyone who has asked for
// less motion.
const FACE = "[data-member-avatar]";
const facesInView = () => {
  const root = screen.value?.scroller;
  const faces = new Map();
  if (!root) return faces;
  root.querySelectorAll(FACE).forEach((el) => {
    const box = el.getBoundingClientRect();
    if (box.width && box.bottom > 0 && box.top < window.innerHeight) faces.set(el.dataset.memberAvatar, { el, box });
  });
  return faces;
};

const wantsMotion = () =>
  motionLevel() !== "off" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const glideFaces = (before) => {
  facesInView().forEach(({ el, box }, id) => {
    const from = before.get(id)?.box;
    const timing = { duration: 380, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
    if (!from) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, duration: 260 });
      return;
    }
    const dx = from.left - box.left;
    const dy = from.top - box.top;
    const s = from.width / box.width;
    el.animate(
      [
        { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${s})` },
        { transformOrigin: "0 0", transform: "none" },
      ],
      timing
    );
  });
};

const toggleMobileView = async () => {
  const before = wantsMotion() ? facesInView() : null;
  mobileView.value = mobileView.value === "grid" ? "list" : "grid";
  try {
    localStorage.setItem(VIEW_KEY, mobileView.value);
  } catch {
    // Not remembered this time; the switch itself still happened.
  }
  if (!before) return;
  await nextTick();
  glideFaces(before);
};
const showGrid = computed(() => mobileView.value === "grid");

// Shown again after a record (the page is kept alive while one is open), the
// list slides in a short way rather than simply appearing. The way in to the
// record is a full view transition; the way back is not, because snapshotting
// a long roll froze the screen for as long as it took to paint every row
// (router/viewTransitions.js). This animates the live page instead.
const returning = ref(false);
let shownBefore = false;
let returnTimer = null;
onActivated(() => {
  if (!shownBefore) {
    shownBefore = true;
    return;
  }
  clearTimeout(returnTimer);
  returning.value = true;
  returnTimer = setTimeout(() => {
    returning.value = false;
  }, 300);
});

const searchQuery = ref("");

// Member data management
const { members, loading, addMemberToFirestore, removeMember } = useMembers();

// Search is the only way the list is narrowed - it matches tags, sex, civil
// status, occupation and address as well as names.
const { allTags, filteredMembers: searchedMembers } = useMemberSearch(members, searchQuery);

// The whole roll, under the title - never the searched count, which the
// search bar already says as "8 of 142" - and how it is sorted, which the
// sort button at the foot only shows as an icon. Nothing while loading, so a
// zero never flashes up for a church that has people.
const subtitle = computed(() => {
  if (loading.value) return "";
  const n = members.value.length;
  const people = `${n.toLocaleString()} ${n === 1 ? "person" : "people"}`;
  const sort = currentSort.value.key === "recent" ? "newest first" : `by ${currentSort.value.label.toLowerCase()}`;
  return `${people} · ${sort}`;
});

// The split under the last row: the one breakdown the title has no room for.
const rollSummary = computed(() => {
  const total = members.value.length;
  const memberCount = members.value.filter((m) => m.isMember).length;
  const attendeeCount = total - memberCount;
  const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
  return [
    plural(total, "person", "people"),
    plural(memberCount, "member", "members"),
    plural(attendeeCount, "attendee", "attendees"),
  ];
});

// Custom tags created from the toolbar's "Add tag" control, registered as
// selectable options without being applied to any member yet.
const customTags = ref([]);
let unsubscribeCustomTags = null;

onMounted(() => {
  unsubscribeCustomTags = subscribeToCustomTags((tags) => {
    customTags.value = tags.map((t) => t.name);
  });
});

onUnmounted(() => {
  if (unsubscribeCustomTags) unsubscribeCustomTags();
});

// Tags offered when assigning/editing a member's tags: existing tags plus
// ready-to-pick presets and toolbar-created tags, even before anyone has
// been tagged with them.
const assignableTags = computed(() => mergeTagSources(allTags.value, customTags.value));

// Sorting
const { sortBy, sortOrder, sortOptions, currentSort, sortMembers, arrangeMembers } = useMemberSorting();
const showSort = ref(false);

// Apply sorting to the searched members
const filteredMembers = computed(() => {
  return sortMembers(searchedMembers.value);
});

// The sort decides the headings as well as the order.
//
// By default the list is divided the way the attendance recorder checks
// people off — kids, youth, adults,
// seniors, then whoever has no age on record. Sorting by ministry or tag
// replaces those headings with its own, because you cannot group by age band
// and by choir at once; sorting by birthday or by when somebody joined drops
// the headings entirely, since those are questions about the whole roll.
// A section with no band is a flat list and renders without a heading.
const memberGroups = computed(() => arrangeMembers(filteredMembers.value));

/* ------------------------------------------------------------ bulk tagging */
// A tag is picked one person at a time in the details drawer, which is fine for
// one person and hopeless for thirty — and thirty is the normal case, because a
// tag is what an event now counts its expected attendance from.
//
// Two ways in, both landing on the same sheet and the same batched write:
// tag everyone the search is showing, or pick names off the list by hand.
//
// The same selection also assigns ministries — but a ministry grants access
// and a tag grants nothing, so the two are not offered on equal terms. Tagging
// is one tap from the search bar; a ministry can only be applied to a
// selection someone picked deliberately, and states what it hands out first.
const { canManage, roleMap } = usePermissions();
const { ministryNames } = useMinistries();
const canTag = computed(() => canManage("members"));

const picking = ref(false);
// Ids, not member records: the list is live, and holding copies would write
// against a stale version of someone edited elsewhere mid-selection.
const pickedIds = ref(new Set());
const tagTargetIds = ref(new Set());
/** null, or which sheet is open: 'tags' | 'ministries'. */
const sheet = ref(null);
const tagging = ref(false);

// What joining one actually hands out, in the words Settings uses. Read from
// the same roleMap that resolves permissions, so the sheet cannot promise
// something the app would not honour.
const ministryOptions = computed(() =>
  ministryNames.value.map((name) => {
    const areas = [
      ...new Set((roleMap.value[name] || []).map((cap) => areaLabel(cap.split(".")[0]))),
    ];
    return {
      name,
      hint: areas.length ? `Grants ${areas.join(", ")}` : "Grants nothing on its own yet",
    };
  })
);

const sheetConfig = computed(() => {
  const count = tagTargets.value.length;
  const people = `${count} ${count === 1 ? "person" : "people"}`;
  if (sheet.value === "ministries") {
    return {
      field: "ministries",
      icon: Church,
      title: `Ministry for ${people}`,
      hint: "Tap to put everyone in, again to take them out",
      note: "A ministry grants access. Everyone added can do what the role allows.",
      options: ministryOptions.value,
      allowCreate: false,
      emptyText: "No ministries yet — add them in Settings > Ministries.",
    };
  }
  return {
    field: "tags",
    icon: Tag,
    title: `Tag ${people}`,
    hint: "Tap a tag to add it to everyone, again to take it off",
    note: "",
    options: assignableTags.value,
    allowCreate: true,
    emptyText: `No tags yet. Type one above and it lands on all ${count} of them at once.`,
  };
});

const memberId = (member) => String(member.firestoreId || member.id);
const pickedCount = computed(() => pickedIds.value.size);

// Resolved from the live list every time, so the sheet's "8 of 34" recounts
// itself the moment a batch lands.
const tagTargets = computed(() =>
  members.value.filter((m) => tagTargetIds.value.has(memberId(m)))
);

// The Set is replaced rather than mutated: a mutation in place is not what the
// rows are watching, and half of them would keep their old tick.
const togglePicked = (member) => {
  const id = memberId(member);
  const next = new Set(pickedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  pickedIds.value = next;
};

const startPicking = (member) => {
  if (!canTag.value) return;
  picking.value = true;
  pickedIds.value = member ? new Set([memberId(member)]) : new Set();
};

const stopPicking = () => {
  picking.value = false;
  pickedIds.value = new Set();
};

/** "Select all" means what is on screen — which is whatever the search left. */
const pickAllVisible = () => {
  pickedIds.value = new Set(filteredMembers.value.map(memberId));
};

// Whole-band selection, off the band's own heading. Tagging an age group is
// the common bulk edit — the kids become WLA Kids — and picking forty names by
// hand to do it is the thing the headings are there to save.
const isBandPicked = (group) =>
  group.members.length > 0 && group.members.every((m) => pickedIds.value.has(memberId(m)));

const toggleBand = (group) => {
  const next = new Set(pickedIds.value);
  const drop = isBandPicked(group);
  group.members.forEach((member) => {
    const id = memberId(member);
    if (drop) next.delete(id);
    else next.add(id);
  });
  pickedIds.value = next;
};

const openSheetForPicked = (kind) => {
  if (!pickedIds.value.size) return;
  tagTargetIds.value = new Set(pickedIds.value);
  sheet.value = kind;
};

/** Straight from the toolbar: the search narrowed the list, so it is the group.
 *  Tags only — see the note above on why a ministry never starts here. */
const openTagSheetForResults = () => {
  if (!canTag.value || !filteredMembers.value.length) return;
  tagTargetIds.value = new Set(filteredMembers.value.map(memberId));
  sheet.value = "tags";
};

/** How many of the selection the write would actually touch. */
const countChanging = (field, name, mode) =>
  tagTargets.value.filter((member) => {
    const held = (member[field] || []).some(
      (value) => String(value).toLowerCase() === name.toLowerCase()
    );
    return mode === "remove" ? held : !held;
  }).length;

// A ministry is the field that hands out access, so a batch of them is
// confirmed with the number and the grant spelled out. Tags need no such
// ceremony: they grant nothing, and a wrong one is one tap to undo.
const confirmMinistry = ({ value, mode }) => {
  const count = countChanging("ministries", value, mode);
  if (!count) {
    toast.success(
      mode === "remove"
        ? `Nobody selected was in "${value}"`
        : `Everyone selected was already in "${value}"`
    );
    return;
  }

  const people = `${count} ${count === 1 ? "person" : "people"}`;
  const grants = ministryOptions.value.find((o) => o.name === value)?.hint || "";

  showConfirmModal({
    title: mode === "remove" ? "Remove from ministry" : "Add to ministry",
    message:
      mode === "remove"
        ? `Take ${people} out of "${value}"? They lose whatever access it granted them.`
        : `Put ${people} into "${value}"? A ministry grants access — ${grants.toLowerCase()}.`,
    confirmText: mode === "remove" ? "Remove" : "Add",
    cancelText: "Cancel",
    confirmButtonClass:
      mode === "remove"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-primary text-white hover:bg-primary-hover",
    onConfirm: () => {
      showConfirmation.value = false;
      applyBulk({ value, mode });
    },
  });
};

const handleSheetApply = (payload) => {
  if (sheet.value === "ministries") {
    confirmMinistry(payload);
    return;
  }
  applyBulk(payload);
};

const applyBulk = async ({ value, mode, register }) => {
  const targets = tagTargets.value;
  const kind = sheet.value;
  if (!targets.length || tagging.value || !kind) return;

  tagging.value = true;
  try {
    // A tag typed into the sheet is registered as well as applied, so it turns
    // up in Settings and in every picker instead of only on these people. A
    // ministry can never arrive this way — the sheet offers no input for one.
    if (register && kind === "tags") await addCustomTag(value);

    const changed =
      kind === "ministries"
        ? mode === "remove"
          ? await removeMinistryFromMembers(targets, value)
          : await addMinistryToMembers(targets, value)
        : mode === "remove"
          ? await removeTagFromMembers(targets, value)
          : await addTagToMembers(targets, value);

    if (!changed) {
      toast.success(
        mode === "remove"
          ? `Nobody selected had "${value}"`
          : `Everyone selected already had "${value}"`
      );
    } else {
      const people = `${changed} ${changed === 1 ? "person" : "people"}`;
      toast.success(
        mode === "remove" ? `"${value}" removed from ${people}` : `"${value}" added to ${people}`
      );
    }
  } catch (error) {
    console.error("Error applying a change to several members:", error);
    toast.error(error?.message || "Could not apply that. Please try again.");
  } finally {
    tagging.value = false;
  }
};

const showExport = ref(false);

// Member form
const { showAddMember, addMemberFrom } = useMemberForm(
  members,
  addMemberToFirestore,
  allTags
);

// URL query parameter helpers
const updateQueryParams = (params) => {
  const query = { ...route.query };

  // Remove null/false params
  Object.keys(params).forEach(key => {
    if (params[key] === null || params[key] === false || params[key] === undefined) {
      delete query[key];
    } else {
      query[key] = params[key];
    }
  });

  router.replace({ query });
};

// Computed property for showAddMember to work with v-model and URL params.
// Only while People is the page on screen: it stays alive, hidden, while a
// profile is open (AdminLayout's KEPT_ALIVE), and its sheet is teleported to
// the body, so another page's ?add=true must not open it over that page.
const showAddMemberComputed = computed({
  get: () => route.name === 'Members' && route.query.add === 'true',
  set: (value) => {
    if (value) {
      showAddMember.value = true;
      updateQueryParams({ add: 'true' });
    } else {
      showAddMember.value = false;
      updateQueryParams({ add: null });
    }
  }
});

// Watch URL params to sync state on navigation
watch(() => route.query, (query) => {
  showAddMember.value = query.add === 'true';
}, { immediate: true });

// Adding is the same stepper as editing (MemberEditSheet.vue), opened from the
// plus button. It is driven by the `add` query param, so a successful save has
// to close it there (not via the form's own ref).
const addingPerson = ref(false);
const handleAddMember = async (record) => {
  addingPerson.value = true;
  try {
    const added = await addMemberFrom(record);
    if (added) showAddMemberComputed.value = false;
  } finally {
    addingPerson.value = false;
  }
};

// Export handler. "search" exports exactly what the search is showing; the
// others start from the whole roll and narrow by standing.
const handleExport = (config) => {
  const base = config.scope === "search" ? filteredMembers.value : members.value;
  const rows =
    config.scope === "members"
      ? base.filter((m) => m.isMember)
      : config.scope === "attendees"
        ? base.filter((m) => !m.isMember)
        : base;
  exportToExcel(rows, config);
  toast.success('Export downloaded');
};

// Opening a record leaves the page, so the list has to remember where it was.
// The box that scrolls is the app screen's own.
const screen = ref(null);
const listScroller = computed(() => screen.value?.scroller || null);
useListScrollMemory(listScroller);

// One record, one destination: the focus page. It reads the record as facts
// and carries its own way back, so there is nothing a drawer would add here
// that the list does not already do better through search.
const openMember = (member, { edit = false } = {}) => {
  const memberId = member?.firestoreId || member?.id;
  if (!memberId) return;
  router.push({ path: `/members/${memberId}`, query: edit ? { edit: '1' } : {} });
};

const handleMemberClick = (member) => openMember(member);

// Context menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  member: null,
});

// Everything on the menu changes the roll - select, edit, delete - so someone
// who can only read it gets no menu rather than one that refuses them.
// `el` comes only with a long press: the held row is lifted above a dimmed
// screen while its menu is open (HoldFocus.vue).
const handleContextMenu = ({ member, x, y, el = null }) => {
  if (!canTag.value) return;
  contextMenu.value = { show: true, x, y, member, el };
};

const closeContextMenu = () => {
  contextMenu.value.show = false;
};

// Context menu action handlers
// `?edit=1` puts the page straight into edit mode. It used to be a timed
// querySelector against the drawer's DOM; the record now owns that state.
const handleContextEdit = (member) => openMember(member, { edit: true });

// Confirmation modal state
const showConfirmation = ref(false);
const confirmationConfig = ref({
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmButtonClass: 'bg-primary text-white hover:bg-primary-hover',
  onConfirm: null
});

// Helper function to show confirmation modal
const showConfirmModal = (config) => {
  confirmationConfig.value = { ...confirmationConfig.value, ...config };
  showConfirmation.value = true;
};

const handleConfirmation = () => {
  if (confirmationConfig.value.onConfirm) {
    confirmationConfig.value.onConfirm();
  }
};

const handleMemberDelete = async (member) => {
  const getFullName = (m) => {
    return `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'This person';
  };

  showConfirmModal({
    title: 'Delete this person',
    message: `${getFullName(member)} will be taken off the roll for good, with everything on their record.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmButtonClass: 'bg-red-600 text-white hover:bg-red-700',
    onConfirm: async () => {
      try {
        await removeMember(member);
        toast.success(`${getFullName(member)} is off the roll`);
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error('Could not delete them. Please try again.');
      }
    }
  });
};

// Three faces across, the width of the app's column on any screen.
const gridClass = "grid grid-cols-3 gap-2 p-2";

// Search sits at the foot of the screen (PeopleDock), which also clears the
// query when it is closed: a search you cannot see must not still be
// filtering the list.
const searchOpen = ref(false);

// The dock steps aside while picking, when the selection bar owns the foot of
// the screen, and while the add sheet is over it. While the list scrolls
// down it is tucked to a round button, on the same flick as the header.
const showDock = computed(() => !showAddMemberComputed.value && !picking.value);
const dockTucked = computed(() => Boolean(screen.value?.hidden));

// Adding one person is the header's plus. Everything else that changes or
// takes from the whole roll is under its "…", in the order it is reached
// for: picking people to tag or place, then adding a list, then exporting.
const canAdd = computed(() => canManage("members"));
const menuItems = computed(() => [
  ...(canTag.value ? [{ key: "select", label: "Select people", icon: CheckCircle }] : []),
  ...(canAdd.value ? [{ key: "add-many", label: "Add several people", icon: UsersThree }] : []),
  { key: "export", label: "Export", icon: Download },
]);

const onMenu = (key) => {
  if (key === "select") startPicking();
  else if (key === "add-many") router.push({ name: "PeopleAdd" });
  else if (key === "export") showExport.value = true;
};
</script>

<template>
  <div :class="['relative h-full', returning ? 'page-return' : '']">
    <AppScreen ref="screen" title="Everyone" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/members">
      <template #action>
        <PeopleMenu :items="menuItems" @pick="onMenu" />
        <button
          v-if="canAdd"
          type="button"
          class="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          @click="showAddMemberComputed = true"
        >
          <Plus class="size-4" />
          Person
        </button>
      </template>

      <!-- Loading: the shape of whichever view is on, so nothing jumps when
           the rows arrive. -->
      <div
        v-if="loading"
        class="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70"
      >
        <div v-if="showGrid" :class="gridClass">
          <div
            v-for="i in 12"
            :key="`skeleton-${i}`"
            class="flex flex-col items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50"
          >
            <div class="h-14 w-14 animate-pulse rounded-full bg-gray-200 dark:bg-gray-600"></div>
            <div class="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
          </div>
        </div>
        <template v-else>
          <div v-for="i in 10" :key="`skeleton-${i}`" class="flex items-center gap-3 px-4 py-2">
            <div class="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-600"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
              <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
            </div>
          </div>
        </template>
      </div>

      <!-- The sort's groups, each a heading with its own count — so "we are
           short on youth" reads without counting rows — over its people in
           one white block, the way every list in an app reads (ListGroup).
           A group well off screen is skipped when the list is laid out and
           painted, so showing the roll again only draws what can be seen; the
           intrinsic size keeps the scrollbar honest meanwhile. -->
      <div v-else class="flex flex-col gap-5">
        <section
          v-for="group in memberGroups"
          :key="group.band?.key || 'all'"
          class="[content-visibility:auto] [contain-intrinsic-size:auto_600px]"
        >
          <div v-if="group.band" class="mb-1.5 flex items-end justify-between gap-3 px-1">
            <h2 class="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <span :class="['size-2 shrink-0 rounded-full', group.band.dotClass]" aria-hidden="true" />
              <span class="truncate">{{ group.band.label }}</span>
              <span class="font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ group.members.length }}</span>
            </h2>
            <!-- Tagging a whole age band is the common bulk edit — the kids
                 become WLA Kids — so picking one is one tap from its heading
                 rather than a scroll and forty. -->
            <button
              v-if="picking"
              type="button"
              class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 dark:text-primary-light"
              @click="toggleBand(group)"
            >
              {{ isBandPicked(group) ? 'Clear' : `Select all ${group.members.length}` }}
            </button>
          </div>

          <div
            :class="[
              'overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70',
              showGrid ? gridClass : 'divide-y divide-gray-100 dark:divide-gray-700/60',
            ]"
          >
            <template v-if="showGrid">
              <MemberCard
                v-for="member in group.members"
                :key="member.id"
                :member="member"
                stacked
                :picking="picking"
                :checked="pickedIds.has(String(member.firestoreId || member.id))"
                :holdable="canTag"
                @click="handleMemberClick"
                @contextmenu="handleContextMenu"
                @toggle="togglePicked"
              />
            </template>
            <template v-else>
              <MemberListItem
                v-for="member in group.members"
                :key="member.id"
                :member="member"
                :picking="picking"
                :checked="pickedIds.has(String(member.firestoreId || member.id))"
                :holdable="canTag"
                @click="handleMemberClick"
                @contextmenu="handleContextMenu"
                @toggle="togglePicked"
              />
            </template>
          </div>
        </section>

        <p v-if="filteredMembers.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
          {{ members.length ? 'Nobody matches your search.' : 'Nobody on the roll yet.' }}
        </p>

        <!-- Where the roll ends, what it adds up to. Only for the whole roll:
             under a search it would describe people who are not on screen. -->
        <p
          v-else-if="!searchQuery.trim()"
          class="px-4 pt-1 text-center text-xs tabular-nums text-gray-400 dark:text-gray-500"
        >
          <template v-for="(part, i) in rollSummary" :key="i">
            <span v-if="i" class="px-1.5 text-gray-300 dark:text-gray-600">·</span>{{ part }}
          </template>
        </p>
      </div>

      <!-- Room for the search at the foot, so the last person scrolls clear
           of it. -->
      <div v-if="searchOpen && searchQuery" class="h-12" aria-hidden="true" />
      <div class="h-20" aria-hidden="true" />
    </AppScreen>

    <!-- Adding someone: the same four steps as editing them. -->
    <MemberEditSheet
      mode="add"
      :show="showAddMemberComputed"
      :ministry-names="ministryNames"
      :all-tags="assignableTags"
      :busy="addingPerson"
      @close="showAddMemberComputed = false"
      @save="handleAddMember"
    />

    <ConfirmationModal
      :show="showConfirmation"
      :title="confirmationConfig.title"
      :message="confirmationConfig.message"
      :confirm-text="confirmationConfig.confirmText"
      :cancel-text="confirmationConfig.cancelText"
      :confirm-button-class="confirmationConfig.confirmButtonClass"
      @update:show="showConfirmation = $event"
      @confirm="handleConfirmation"
      @cancel="showConfirmation = false"
    />

    <MemberContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :member="contextMenu.member"
      :anchor="contextMenu.el"
      @close="closeContextMenu"
      @edit="handleContextEdit"
      @delete="handleMemberDelete"
      @select="startPicking"
    />

    <!-- Picking mode. The selection takes the search capsule's place and
         shape at the foot of the screen, so the thumb does not travel and
         the two read as one control changing what it does. -->
    <div
      v-if="picking"
      class="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom),calc(var(--bottom-bar-space)+0.75rem))] z-50 px-4 lg:left-(--app-rail)"
    >
      <div class="pointer-events-auto mx-auto flex max-w-xl items-center gap-1.5 rounded-full bg-gray-900 p-1.5 text-white dark:bg-gray-100 dark:text-gray-900">
        <button
          type="button"
          @click="stopPicking"
          aria-label="Cancel selection"
          class="flex size-9 shrink-0 items-center justify-center rounded-full opacity-70 transition-colors hover:bg-white/10 hover:opacity-100 dark:hover:bg-gray-900/10"
        >
          <X class="size-5" />
        </button>

        <!-- Truncating keeps the capsule one row deep on a narrow phone, where
             two actions and a count are already all it can hold. -->
        <div class="min-w-0 flex-1 leading-tight">
          <p class="truncate text-sm font-semibold">{{ pickedCount }} selected</p>
          <button
            type="button"
            @click="pickAllVisible"
            class="block max-w-full truncate text-xs font-medium opacity-70 hover:opacity-100"
          >
            Select all {{ filteredMembers.length }}
          </button>
        </div>

        <!-- Ministry sits beside Tag rather than inside its sheet: they write
             different fields and only one of them grants access. -->
        <button
          type="button"
          @click="openSheetForPicked('ministries')"
          :disabled="!pickedCount"
          class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-900/10 dark:hover:bg-gray-900/15"
        >
          <Church class="size-4" />
          Ministry
        </button>

        <button
          type="button"
          @click="openSheetForPicked('tags')"
          :disabled="!pickedCount"
          class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Tag class="size-4" />
          Tag
        </button>
      </div>
    </div>

    <SortSheet
      :show="showSort"
      :options="sortOptions"
      v-model="sortBy"
      title="Sort people by"
      hint="The headings follow the sort"
      @close="showSort = false"
    />

    <PeopleDock
      v-if="showDock"
      v-model:query="searchQuery"
      v-model:open="searchOpen"
      :tucked="dockTucked"
      :sortLabel="currentSort.label"
      :view="mobileView"
      :resultCount="filteredMembers.length"
      :totalCount="members.length"
      :canTag="canTag"
      @sort="showSort = true"
      @toggle-view="toggleMobileView"
      @tag-results="openTagSheetForResults"
    />

    <BulkAssignSheet
      :show="!!sheet"
      :members="tagTargets"
      :field="sheetConfig.field"
      :options="sheetConfig.options"
      :title="sheetConfig.title"
      :hint="sheetConfig.hint"
      :note="sheetConfig.note"
      :icon="sheetConfig.icon"
      :allow-create="sheetConfig.allowCreate"
      :empty-text="sheetConfig.emptyText"
      create-placeholder="New tag, e.g. Choir"
      :busy="tagging"
      @close="sheet = null"
      @apply="handleSheetApply"
    />

    <ExportDialog
      v-model:showExport="showExport"
      :members="members"
      :visibleCount="filteredMembers.length"
      :currentSortBy="sortBy"
      :currentSortOrder="sortOrder"
      @export="handleExport"
    />
  </div>
</template>

