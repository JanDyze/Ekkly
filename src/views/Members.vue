<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useMembers } from "../composables/useMembers";
import { useMediaQuery } from "../composables/useMediaQuery";
import { useMemberSearch } from "../composables/useMemberSearch";
import { useMemberSorting } from "../composables/useMemberSorting";
import { useMemberForm } from "../composables/useMemberForm";
import { useListScrollMemory } from "../composables/useListScrollMemory";
import { useToast } from "../composables/useToast";
import { useTitleCount } from "../composables/useTitleCount";
import MembersToolbar from "../components/members/MembersToolbar.vue";
import MembersFab from "../components/members/MembersFab.vue";
import SortSheet from "../components/common/SortSheet.vue";
import MemberEditSheet from "../components/members/MemberEditSheet.vue";
import MemberContextMenu from "../components/members/MemberContextMenu.vue";
import ExportDialog from "../components/members/ExportDialog.vue";
import MemberCard from "../components/members/MemberCard.vue";
import MemberListItem from "../components/members/MemberListItem.vue";
import MemberCardSkeleton from "../components/members/MemberCardSkeleton.vue";
import MemberBandHeader from "../components/members/MemberBandHeader.vue";
import ConfirmationModal from "../components/common/ConfirmationModal.vue";
import BulkAssignSheet from "../components/members/BulkAssignSheet.vue";
import { exportToExcel } from "../utils/exportUtils";
import { mergeTagSources } from "../utils/memberUtils";
import { usePermissions } from "../composables/usePermissions";
import { useMinistries } from "../composables/useMinistries";
import { areaLabel } from "../data/capabilities";
import { Church, Tag, X } from "../icons";
import {
  subscribeToCustomTags,
  addCustomTag,
  addTagToMembers,
  removeTagFromMembers,
} from "../api/tagsService";
import {
  addMinistryToMembers,
  removeMinistryFromMembers,
} from "../api/ministriesService";

const toast = useToast();

const router = useRouter();
const route = useRoute();
const isMobile = useMediaQuery("(max-width: 1023px)");

// On a phone the roll can be a list (names first, quick to scan) or a grid
// (faces first, for putting names to people you have seen). Remembered on
// this device only - it is how this person likes to read, not a church
// setting - and blocked or private-mode storage just falls back to the list.
// A desktop always shows the grid: it has the width for faces and names both.
const VIEW_KEY = "ekkly:people-view";
const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
};
const mobileView = ref(readView());
const toggleMobileView = () => {
  mobileView.value = mobileView.value === "grid" ? "list" : "grid";
  try {
    localStorage.setItem(VIEW_KEY, mobileView.value);
  } catch {
    // Not remembered this time; the switch itself still happened.
  }
};
const showGrid = computed(() => !isMobile.value || mobileView.value === "grid");

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

// The whole roll, beside the title - never the searched count, which the
// search bar already says as "8 of 142". Nothing while loading, so a zero
// never flashes up for a church that has people.
useTitleCount(() => (loading.value ? null : members.value.length));

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
const { sortBy, sortOptions, currentSort, sortMembers, arrangeMembers } = useMemberSorting();
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
const listScroller = ref(null);
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
    return `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'this member';
  };

  showConfirmModal({
    title: 'Delete Member',
    message: `Are you sure you want to delete ${getFullName(member)}? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmButtonClass: 'bg-red-600 text-white hover:bg-red-700',
    onConfirm: async () => {
      try {
        await removeMember(member);
        toast.success('Member deleted');
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error('Failed to delete member. Please try again.');
      }
    }
  });
};

// Three faces across a phone, four on a desktop. Adding opens over the page
// now rather than as a column beside it, so the grid no longer makes room.
const gridClass = computed(() =>
  isMobile.value ? "grid grid-cols-3 gap-2 p-2" : "grid grid-cols-4 gap-3 p-3"
);

// The button would sit on top of whatever a drawer or the details modal is
// showing, and both carry their own actions anyway.
// While picking, the action bar owns the bottom of the screen.
// Search is a mode now, not furniture. Closing it clears the query, because a
// bar you cannot see must not still be filtering the list.
const searchOpen = ref(false);
const openSearch = () => {
  searchOpen.value = true;
};
const closeSearch = () => {
  searchOpen.value = false;
  searchQuery.value = "";
};

const showFab = computed(
  () => !showAddMemberComputed.value && !picking.value
);
</script>

<template>
  <div :class="['relative flex flex-col h-full', returning ? 'page-return' : '']">
    <!-- Opened from the plus button rather than always sitting there: an
         always-on search bar costs a row of the list on every visit, and most
         visits are a scroll rather than a lookup. -->
    <MembersToolbar
      v-model:searchQuery="searchQuery"
      :open="searchOpen"
      :resultCount="filteredMembers.length"
      :totalCount="members.length"
      :canTag="canTag"
      @tag-results="openTagSheetForResults"
      @close="closeSearch"
    />

    <!-- Members List -->
    <div class="flex-1 overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex">
      <!-- Members Content. No strip above the list: the sort is opened from
           the plus button, which names the sort that is on so it can still be
           checked without opening the sheet. -->
      <div class="flex flex-1 min-w-0 h-full flex-col">
        <!-- Room at the foot for the plus button as well as the bottom bar it
             floats over (bar 4.6rem + button 3.5rem + air), so the last
             person can be scrolled clear of both rather than stopping
             under the button. -->
        <div
          ref="listScroller"
          class="min-h-0 flex-1 overflow-y-auto pb-28 max-lg:pb-[calc(10rem+env(safe-area-inset-bottom))]"
        >

      <!-- A grid on a desktop; on a phone, a list or a grid of faces as the
           reader chose from the plus button. All of them are divided into the
           sort's groups, each heading carrying its own count so "we are short
           on youth" reads without counting rows. -->
        <template v-if="showGrid">
          <div v-if="loading" :class="gridClass">
            <template v-if="isMobile">
              <div
                v-for="i in 12"
                :key="`skeleton-${i}`"
                class="flex flex-col items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50"
              >
                <div class="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse"></div>
                <div class="h-3 w-16 rounded bg-gray-200 dark:bg-gray-600 animate-pulse"></div>
              </div>
            </template>
            <MemberCardSkeleton v-else v-for="i in 12" :key="`skeleton-${i}`" />
          </div>

          <!-- A group well off screen is skipped when the list is laid out and
               painted - showing the roll again only draws what can be seen.
               The intrinsic size keeps the scrollbar honest meanwhile. -->
          <section
            v-else
            v-for="group in memberGroups"
            :key="group.band?.key || 'all'"
            class="[content-visibility:auto] [contain-intrinsic-size:auto_600px]"
          >
            <MemberBandHeader
              v-if="group.band"
              :band="group.band"
              :count="group.members.length"
              :picking="picking"
              :checked="isBandPicked(group)"
              @toggle="toggleBand(group)"
            />
            <div :class="gridClass">
              <MemberCard
                v-for="member in group.members"
                :key="member.id"
                :member="member"
                :stacked="isMobile"
                :picking="picking"
                :checked="pickedIds.has(String(member.firestoreId || member.id))"
                :holdable="canTag"
                @click="handleMemberClick"
                @contextmenu="handleContextMenu"
                @toggle="togglePicked"
              />
            </div>
          </section>
        </template>

        <template v-else>
          <div v-if="loading">
            <div
              v-for="i in 10"
              :key="`skeleton-${i}`"
              class="px-4 py-2 flex items-center gap-3"
            >
              <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                <div class="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          <!-- A group well off screen is skipped when the list is laid out and
               painted - showing the roll again only draws what can be seen.
               The intrinsic size keeps the scrollbar honest meanwhile. -->
          <section
            v-else
            v-for="group in memberGroups"
            :key="group.band?.key || 'all'"
            class="[content-visibility:auto] [contain-intrinsic-size:auto_600px]"
          >
            <MemberBandHeader
              v-if="group.band"
              :band="group.band"
              :count="group.members.length"
              :picking="picking"
              :checked="isBandPicked(group)"
              @toggle="toggleBand(group)"
            />
            <!-- No padding or gaps: a row is the full width of the list, so
                 the press colour fills it edge to edge like a native list
                 instead of a rounded block floating inside it. -->
            <div>
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
            </div>
          </section>
        </template>

        <div v-if="!loading && filteredMembers.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
          Nobody matches your search.
        </div>

        <!-- Where the roll ends, what it adds up to. Only for the whole roll:
             under a search it would describe people who are not on screen. -->
        <p
          v-else-if="!loading && !searchQuery.trim()"
          class="px-4 pt-6 pb-2 text-center text-xs tabular-nums text-gray-400 dark:text-gray-500"
        >
          <template v-for="(part, i) in rollSummary" :key="i">
            <span v-if="i" class="px-1.5 text-gray-300 dark:text-gray-600">·</span>{{ part }}
          </template>
        </p>
        </div>
      </div>

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

      <!-- Confirmation Modal -->
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

      <!-- Context Menu -->
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
    </div>

    <!-- Picking mode. One bar for the whole selection, sitting where the FAB
         would be so the thumb does not have to travel. -->
    <div
      v-if="picking"
      class="absolute inset-x-0 bottom-0 bottom-bar! z-50 border-t border-gray-200 bg-white/95 px-3 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700 dark:bg-gray-900/95"
    >
      <div class="flex items-center gap-3">
        <button
          @click="stopPicking"
          aria-label="Cancel selection"
          class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <X class="h-5 w-5" />
        </button>

        <!-- Truncating keeps the bar one row deep on a narrow phone, where two
             actions and a count are already all it can hold. -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {{ pickedCount }} selected
          </p>
          <button
            @click="pickAllVisible"
            class="block max-w-full truncate text-xs font-medium text-primary dark:text-primary-light"
          >
            Select all {{ filteredMembers.length }}
          </button>
        </div>

        <!-- Ministry sits beside Tag rather than inside its sheet: they write
             different fields and only one of them grants access. -->
        <button
          @click="openSheetForPicked('ministries')"
          :disabled="!pickedCount"
          :class="[
            'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
            pickedCount
              ? 'border border-primary/40 text-primary hover:bg-primary/10 dark:text-primary-light'
              : 'cursor-not-allowed border border-gray-200 text-gray-400 dark:border-gray-700',
          ]"
        >
          <Church class="h-4 w-4" />
          Ministry
        </button>

        <button
          @click="openSheetForPicked('tags')"
          :disabled="!pickedCount"
          :class="[
            'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors',
            pickedCount
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700',
          ]"
        >
          <Tag class="h-4 w-4" />
          Tag
        </button>
      </div>
    </div>

    <!-- Floating actions -->
    <SortSheet
      :show="showSort"
      :options="sortOptions"
      v-model="sortBy"
      title="Sort people by"
      hint="The headings follow the sort"
      @close="showSort = false"
    />

    <MembersFab
      v-if="showFab"
      :sortLabel="currentSort.label"
      :view="isMobile ? mobileView : null"
      @search="openSearch"
      @toggle-view="toggleMobileView"
      @sort="showSort = true"
      @add="showAddMemberComputed = true"
      @export="showExport = true"
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

    <!-- Export Dialog -->
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

