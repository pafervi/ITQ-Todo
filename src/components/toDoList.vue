<template>
  <!-- Backdrop teleported to body so the phased panel floats above every
       other card and the sidebar. Dismisses with the mousedown+mouseup
       pattern so a click that STARTED inside the panel (e.g. hitting
       "+ Add phase" and releasing after Bootstrap mounted its own stacking
       context) does not accidentally close the overlay. Only a press-and-
       release that both occur on the backdrop itself counts. ESC still
       works through handlePhasedEscape. -->
  <Teleport to="body" v-if="isElevated">
    <div
      class="phased-overlay-backdrop"
      @mousedown="onBackdropMouseDown"
      @mouseup="onBackdropMouseUp"
    ></div>
  </Teleport>
  <!-- The project card itself is teleported to body only while elevated.
       position:fixed inside the app shell was being broken by an ancestor
       with a transform / filter, which makes "fixed" behave like
       "absolute" relative to that ancestor and causes the panel to drift
       and flicker as the parent reflows. Teleporting the node to body
       moves it out from under any transformed ancestor so the viewport is
       the actual containing block. :disabled flips the teleport off when
       the panel is back to the Tasks view, so the DOM returns to the
       normal column grid without re-mounting the subtree. -->
  <Teleport to="body" :disabled="!isElevated">
  <div :id="'list' + id" class="to-do-list-container d-flex flex-column" ref="listContainer" :class="{
    'old-date': !customTodoList && moments(id).isBefore(Date(), 'day'),
    'has-accent-color': listColor || customTodoList,
    'kind-meeting': listKind === 'meeting',
    'kind-activelearning': listKind === 'activelearning',
    'phased-elevated': isElevated,
    'project-reorder-hover': projectReorderHover,
  }" :style="containerStyle"
    @dragover="onProjectDragOver" @drop="onProjectDrop"
    @dragenter="onProjectDragEnter" @dragleave="onProjectDragLeave">
  <!-- Close button lives on top of the elevated panel. Hidden when the
       panel is in its collapsed-card state. -->
  <button
    v-if="isElevated"
    type="button"
    class="phased-close-btn"
    @click="closePhasedPanel"
    :title="($t('phased.closePanel') || 'Close') + ' (ESC)'"
    aria-label="Close phased panel"
  ><i class="bi-x-lg"></i></button>
    <i v-if="listKind === 'meeting'" class="bi-people-fill kind-watermark" aria-hidden="true"></i>
    <i v-if="listKind === 'activelearning'" class="bi-cpu-fill kind-watermark" aria-hidden="true"></i>

    <!-- Project cover: a stylised hex of the project's zeolite framework
         sitting as a watermark on the top-right of custom project cards.
         Deterministic per project id so the identity stays stable; tinted
         with the project colour via currentColor. Hidden on day lists
         (they already carry the date headline), on 'kind' variants (they
         own the top-right slot), and on manually-coloured lists where the
         user chose a plain colour (keeps their intent). -->
    <svg
      v-if="showProjectCover"
      class="project-cover"
      :viewBox="projectThemeItem.viewBox || '0 0 100 100'"
      :aria-label="projectThemeItem.fullName"
      v-html="projectThemeItem.svgShape"
    ></svg>
    <div v-if="loading" class="loading-spinner">
      <svg class="orbital-spinner" viewBox="0 0 40 40" width="30" height="30" role="status" aria-hidden="true">
        <circle class="orbital-nucleus" cx="20" cy="20" r="3"></circle>
        <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5"></ellipse>
        <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(60 20 20)"></ellipse>
        <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(120 20 20)"></ellipse>
      </svg>
      <span class="visually-hidden">{{ $t('ui.loadingCalc') }}</span>
    </div>

    <list-header :id="id" :customTodoList="customTodoList" :cTodoListIndex="cTodoListIndex" :toDoList="toDoListState"
      :collapsed="collapsed" :is-phased="isPhased" :phased-view="phasedView"
      @toggle-collapse="toggleCollapse" @force-collapse="forceCollapse"
      @set-phased-view="setPhasedView" @add-phase="openPhaseEditor" @add-log-entry="openAddLogEntry">
    </list-header>
    <transition name="fade-collapse">
      <phase-timeline
        v-if="!collapsed && isPhased && phasedView === 'timeline' && cList"
        :project-id="id"
        :c-list="cList"
        :phases="phasedPhases"
        :log-entries="phasedLogEntries"
        @add-phase="openPhaseEditor"
        @edit-phase="openPhaseEditor"
      />
    </transition>
    <transition name="fade-collapse">
      <phase-feed
        v-if="!collapsed && isPhased && phasedView === 'feed' && cList"
        :project-id="id"
        :c-list="cList"
        :phases="phasedPhases"
        :log-entries="phasedLogEntries"
        @add-entry="openAddLogEntry"
        @edit-entry="(entry) => openAddLogEntry({ entry: entry })"
        @remove-entry="removeLogEntry"
      />
    </transition>
    <transition name="fade-collapse">
      <div v-if="!collapsed && showTasksView && firstLoadDone && toDoListState && toDoListState.length === 0" class="empty-list-placeholder">
        <i :class="customTodoList ? 'bi-inbox' : 'bi-emoji-smile'"></i>
        <span>{{ customTodoList ? $t('ui.emptyListPlaceholder') : $t('ui.emptyListPlaceholderToday') }}</span>
      </div>
    </transition>
    <transition name="fade-collapse">
      <div v-if="!collapsed && showTasksView && allDone" class="all-done-banner">
        <i class="bi-check2-circle"></i>
        <span>{{ $t('ui.allTasksDone') }}</span>
        <!-- Nucleation celebration: a small cluster of particles converges
             from a circle onto the vertices of a hexagonal unit cell when
             the last task of the day gets checked. On-brand replacement
             for the generic confetti burst. -->
        <svg v-if="celebrate" class="nucleation-burst" viewBox="-40 -40 80 80" aria-hidden="true">
          <polygon class="nucleation-cell" :points="hexCellPoints"></polygon>
          <circle v-for="(p, i) in nucleationParticles" :key="i"
            class="nucleation-dot" :class="'np-' + i"
            :cx="p.sx" :cy="p.sy" r="3"
            :style="{ '--tx': p.tx + 'px', '--ty': p.ty + 'px', animationDelay: (i * 0.03) + 's' }"
          />
        </svg>
      </div>
    </transition>
    <transition name="fade-collapse">
      <ul class="to-do-list" v-show="!collapsed && showTasksView">
        <li v-for="entry in visibleEntries" :key="entry.hostListId + '-' + entry.trueIndex">
          <div class="drop-zone" @drop="onDrop($event, entry.hostListId, entry.trueIndex)" @dragover.prevent @dragenter.prevent>
            <to-do-item :to-do="entry.toDo" :index="entry.trueIndex" :to-do-list-id="entry.hostListId" :render-context="id"></to-do-item>
          </div>
        </li>
        <li v-if="hasHiddenTasks" class="show-more-row">
          <button type="button" class="show-more-btn" @click="tasksExpanded = !tasksExpanded">
            <i :class="tasksExpanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            <span v-if="!tasksExpanded">{{ hiddenTasksCount }} {{ $t('ui.moreTasks') || 'more' }}</span>
            <span v-else>{{ $t('ui.showLess') || 'Show less' }}</span>
          </button>
        </li>
      </ul>
    </transition>
    <transition name="fade-collapse">
      <div v-show="!collapsed && showTasksView" class="fake-drop-zone flex-grow-1 margin-bottom-2" @drop="onDropAtEnd($event, id)"
        @dragenter.self="onDragenter" @dragleave.self="onDragleave" @dragover.prevent
        :class="{ 'fake-drag-hover': fakeItemsDragHover }">
        <div class="todo-item-container">
          <input class="todo-input new-todo-input" type="text" ref="newToDoInput" v-model="newToDo.text" @blur="addToDo()"
            @keyup.enter="addToDo()" @keyup.esc="cancelAdd()" @paste="handlePasteNewTodo" />
        </div>
        <div class="fake-lines" :class="{ 'custom-list': customTodoList }" @click="$refs.newToDoInput.focus()"></div>
      </div>
    </transition>
  </div>
  </Teleport>
</template>

<script>
import toDoItem from "./toDoItem";
import moment from "moment";
import toDoListRepository from "../repositories/toDoListRepository";
import listHeader from "./listHeader";
import notifications from "../helpers/notifications";
import repeatingEventHelper from "../helpers/repeatingEvents.js";
import tasksHelper from "../helpers/tasksHelper";
import collapsedListsRepository from "../repositories/collapsedListsRepository";
import projectColorHelper from "../helpers/projectColorHelper";
import autoTagHelper from "../helpers/autoTagHelper";
// zeoliteHelper no longer imported directly: themesHelper routes to the
// active theme (zeolites by default).
import phaseTimeline from "./phased/phaseTimeline.vue";
import phaseFeed from "./phased/phaseFeed.vue";
import phasedProjectHelper from "../helpers/phasedProjectHelper";
import themesHelper from "../helpers/themesHelper";
import { Modal } from "bootstrap";

export default {
  components: {
    listHeader,
    toDoItem,
    phaseTimeline,
    phaseFeed,
  },
  props: {
    id: { required: false, type: String },
    customTodoList: { required: false, default: false, type: Boolean },
    cTodoListIndex: { required: false, type: Number },
    showCustomList: { required: false, type: Boolean },
    forceFullWidth: { required: false, default: false, type: Boolean },
  },
  data() {
    return {
      newToDo: { text: "", checked: false },
      fakeItemCounts: 6,
      fakeItemsDragHover: false,
      loading: false,
      collapsed: false,
      celebrate: false,
      celebrateTimeout: null,
      firstLoadDone: false,
      // Which view is active for a phased project. Ignored for day lists and
      // for checklist projects. Lives in the component so it does not persist
      // across sessions, i.e. opening a project always lands on Tasks first.
      phasedView: "tasks",
      // Panel open is separate from phasedView so the user can switch to the
      // Tasks tab from inside the elevated modal and still keep the panel
      // open. The panel is dismissed only by the X button, the backdrop, or
      // the ESC key.
      phasedPanelOpen: false,
      backdropArmed: false,
      // Visual feedback while another project header is being dragged over
      // THIS card as a reorder target.
      projectReorderHover: false,
      // Whether the task list is expanded (showing all tasks) or compact
      // (showing only the first MAX_VISIBLE_TASKS tasks).
      tasksExpanded: false,
    };
  },
  mounted() {
    this.collapsed = collapsedListsRepository.isCollapsed(this.id);
    this.setTodoListHeight();
    window.addEventListener("resize", this.setTodoListHeight);
    let listId = this.id;
    this.loading = true;
    this.$store.dispatch("loadTodoLists", listId).then(() => {
      this.$store.dispatch("loadRepeatingEventGeneratedByDate", listId).then(() => {
        this.loading = false;
        repeatingEventHelper.generateRepeatingEventsIntances(listId, this);
      });
      this.clearRemovedRepeatingEvents();
      this.$emit("todoListMounted", listId);
      this.$nextTick(() => {
        this.firstLoadDone = true;
      });
    });
    // For phased projects, pull the phases and log entries into the store so
    // the Timeline/Feed views can render straight from state once the user
    // toggles into them. Cheap enough to always do on project mount.
    if (this.customTodoList && this.isPhased) {
      this.$store.dispatch("loadPhases", listId);
      this.$store.dispatch("loadLogEntries", listId);
    }
    // ESC closes the elevated phased panel. Scoped to window because the
    // listener fires while the overlay has focus and no form input is
    // interfering.
    window.addEventListener("keydown", this.handlePhasedEscape);
  },
  unmounted() {
    window.removeEventListener("resize", this.setTodoListHeight);
    window.removeEventListener("keydown", this.handlePhasedEscape);
    document.body.classList.remove("phased-overlay-open");
    clearTimeout(this.celebrateTimeout);
  },
  beforeCreate() {
    let listId = this.id;
    this.$store.commit("loadTodoLists", { todoListId: listId, todoList: [] });
  },
  methods: {
    addToDo: function () {
      if (this.newToDo.text != "") {
        var newTodo = {
          text: this.newToDo.text,
          checked: false,
          listId: this.id,
          desc: "",
          subTaskList: [],
          color: this.listColor || "none",
          priority: 0,
          tags: this.autoTags(this.newToDo.text),
          deadline: null,
          time: null,
          alarm: false,
          repeatingEvent: null,
        };
        this.$store.commit("addTodo", newTodo);
        this.updateTodoList(this.id, this.$store.getters.todoLists[this.id]);
        this.newToDo.text = "";
      }
    },
    cancelAdd: function () {
      this.newToDo.text = "";
    },
    handlePasteNewTodo: function (event) {
      let text = (event.clipboardData || window.clipboardData).getData("text");
      if (!text) return;
      let lines = text
        .split(/\r\n|\r|\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length <= 1) return;
      event.preventDefault();
      lines.forEach((line) => {
        this.$store.commit("addTodo", {
          text: line,
          checked: false,
          listId: this.id,
          desc: "",
          subTaskList: [],
          color: this.listColor || "none",
          priority: 0,
          tags: this.autoTags(line),
          deadline: null,
          time: null,
          alarm: false,
          repeatingEvent: null,
        });
      });
      this.updateTodoList(this.id, this.$store.getters.todoLists[this.id]);
      this.newToDo.text = "";
    },
    autoTags: function (text) {
      if (this.$store.getters.config.autoTagEnabled === false) return [];
      return autoTagHelper.tagsFor(text, []);
    },
    moments: function (date) {
      return moment(date);
    },
    toggleCollapse: function () {
      this.collapsed = !this.collapsed;
      collapsedListsRepository.setCollapsed(this.id, this.collapsed);
    },
    forceCollapse: function () {
      this.collapsed = true;
      collapsedListsRepository.setCollapsed(this.id, true);
    },
    onDrop: function (event, list, new_index) {
      if (!event.dataTransfer.getData("item")) return;
      let toDo = JSON.parse(event.dataTransfer.getData("item"));
      let index = event.dataTransfer.getData("index");
      this.$store.commit("removeTodo", {
        toDoListId: toDo.listId,
        index: index,
      });
      this.updateTodoList(toDo.listId, this.$store.getters.todoLists[toDo.listId]);
      if (toDo.listId != list) toDo.repeatingEvent = null;
      toDo.listId = list;
      this.$store.commit("insertTodo", {
        toDoListId: list,
        index: new_index,
        toDo: toDo,
      });
      if(this.$store.getters.config.autoReorderTasks){
        this.updateTodoList(list, tasksHelper.reorderTasksList(this.$store.getters.todoLists[list]));
      } else {
        this.updateTodoList(list, this.$store.getters.todoLists[list]);
      }
    },
    onDropAtEnd: function (event, list) {
      if (!event.dataTransfer.getData("item")) return;
      let toDo = JSON.parse(event.dataTransfer.getData("item"));
      let index = event.dataTransfer.getData("index");
      this.$store.commit("removeTodo", { toDoListId: toDo.listId, index: index, });
      this.updateTodoList(toDo.listId, this.$store.getters.todoLists[toDo.listId]);
      if (toDo.listId != list) toDo.repeatingEvent = null;
      toDo.listId = list;
      this.$store.commit("addTodo", toDo);

      if(this.$store.getters.config.autoReorderTasks){
        this.updateTodoList(list, tasksHelper.reorderTasksList(this.$store.getters.todoLists[list]));
      } else {
        this.updateTodoList(list, this.$store.getters.todoLists[list]);
      }
      this.fakeItemsDragHover = false;
    },
    updateTodoList: function (todoListId, TodoList) {
      notifications.refreshDayNotifications(this, todoListId);
      toDoListRepository.update(todoListId, TodoList);
    },
    setTodoListHeight: function () {
      if (this.showCustomList) {
        this.fakeItemCounts = Math.floor(this.$refs.listContainer.clientHeight / 40);
      } else {
        this.fakeItemCounts = Math.floor(this.$refs.listContainer.clientHeight / 34);
      }
    },
    onDragenter: function () {
      this.fakeItemsDragHover = true;
    },
    onDragleave: function () {
      this.fakeItemsDragHover = false;
    },
    clearRemovedRepeatingEvents: function () {
      if (this.customTodoList) return;
      repeatingEventHelper.removeGeneratedRepeatingEvents(this.id, this);
    },
    // Project reorder drop target. The project card acts as a whole drop
    // zone for reorder drags so the user can land anywhere on another
    // project (not only on its tiny header strip) and have it swap. Task
    // drags carry a different payload ("item") and bubble to the inner
    // drop-zone handlers unchanged.
    onProjectDragOver: function (event) {
      if (!this.customTodoList) return;
      if (!event.dataTransfer) return;
      let types = event.dataTransfer.types || [];
      let isReorder = false;
      // DataTransferItemList in the spec is iterable; convert for includes
      // because some browsers expose it as a bare object.
      for (let i = 0; i < types.length; i++) {
        let t = types[i];
        if (t === "list-reorder-index" || t === "application/x-lattice-list-reorder") {
          isReorder = true;
          break;
        }
      }
      if (!isReorder) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    onProjectDragEnter: function (event) {
      if (!this.customTodoList || !event.dataTransfer) return;
      let types = event.dataTransfer.types || [];
      for (let i = 0; i < types.length; i++) {
        if (types[i] === "list-reorder-index" || types[i] === "application/x-lattice-list-reorder") {
          event.preventDefault();
          this.projectReorderHover = true;
          return;
        }
      }
    },
    onProjectDragLeave: function (event) {
      if (!this.projectReorderHover) return;
      // Only clear when the pointer actually leaves the card rectangle,
      // not when it just crosses onto an inner child.
      if (!event || !event.currentTarget) {
        this.projectReorderHover = false;
        return;
      }
      let r = event.currentTarget.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX >= r.right ||
          event.clientY < r.top || event.clientY >= r.bottom) {
        this.projectReorderHover = false;
      }
    },
    onProjectDrop: function (event) {
      this.projectReorderHover = false;
      if (!this.customTodoList) return;
      if (!event.dataTransfer) return;
      let fromIndexRaw =
        event.dataTransfer.getData("list-reorder-index") ||
        event.dataTransfer.getData("application/x-lattice-list-reorder");
      if (!fromIndexRaw) {
        let txt = event.dataTransfer.getData("text/plain") || "";
        let m = txt.match(/^lattice-list-reorder:(\d+)$/);
        if (m) fromIndexRaw = m[1];
      }
      if (!fromIndexRaw) return;
      event.preventDefault();
      let fromIndex = parseInt(fromIndexRaw, 10);
      let toIndex = this.cTodoListIndex;
      if (isNaN(fromIndex) || fromIndex === toIndex) return;
      this.$store.commit("reorderCustomTodoLists", { from: fromIndex, to: toIndex });
      let customToDoListIdsRepository =
        require("../repositories/customToDoListIdsRepository").default;
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
    // Phased project view switching, driven from listHeader.
    setPhasedView: function (view) {
      if (!this.isPhased) return;
      this.phasedView = view || "tasks";
      // Switching to Timeline or Feed opens the elevated panel if it was not
      // already up. Switching to Tasks does NOT close the panel, so the user
      // can bounce between Timeline, Feed and the task list without losing
      // the modal context. Explicit dismissal is the X, the backdrop or ESC.
      if (this.phasedView === "timeline" || this.phasedView === "feed") {
        this.phasedPanelOpen = true;
        document.body.classList.add("phased-overlay-open");
      }
    },
    closePhasedPanel: function () {
      this.phasedPanelOpen = false;
      this.phasedView = "tasks";
      document.body.classList.remove("phased-overlay-open");
    },
    handlePhasedEscape: function (e) {
      if (e.key === "Escape" && this.isElevated) {
        this.closePhasedPanel();
      }
    },
    // Backdrop dismiss uses a down/up pair so a click that started inside
    // the panel (its mousedown was on a button, not on the backdrop) does
    // not close the overlay when the pointer happens to be over the
    // backdrop at mouseup time. The dismiss only fires when BOTH press and
    // release landed on the backdrop itself.
    onBackdropMouseDown: function (e) {
      if (e.target === e.currentTarget) {
        this.backdropArmed = true;
      } else {
        this.backdropArmed = false;
      }
    },
    onBackdropMouseUp: function (e) {
      let armed = this.backdropArmed;
      this.backdropArmed = false;
      if (armed && e.target === e.currentTarget) {
        this.closePhasedPanel();
      }
    },
    openPhaseEditor: function (phase) {
      this.$store.commit("setPhaseEditorTarget", {
        projectId: this.id,
        phase: phase || null,
      });
      let modalEl = document.getElementById("phaseEditorModal");
      if (!modalEl) return;
      let modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.show();
    },
    openAddLogEntry: function (payload) {
      this.$store.commit("setLogEntryEditorTarget", {
        projectId: this.id,
        entry: payload && payload.entry ? payload.entry : null,
        kind: payload && payload.kind ? payload.kind : null,
        phaseId: payload && payload.phaseId ? payload.phaseId : null,
      });
      let modalEl = document.getElementById("addLogEntryModal");
      if (!modalEl) return;
      let modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.show();
    },
    removeLogEntry: function (entry) {
      if (!entry) return;
      let ok = window.confirm(this.$t("phased.confirmRemoveEntry") || "Remove this log entry?");
      if (!ok) return;
      this.$store.commit("removeLogEntry", { projectId: this.id, entryId: entry.id });
      let logEntryRepository = require("../repositories/logEntryRepository").default;
      logEntryRepository.update(this.id, this.$store.getters.logEntries[this.id] || []);
    },
  },
  watch: {
    showCustomList: function () {
      this.$nextTick(function () {
        this.setTodoListHeight();
      });
    },
    allDone: function (val, oldVal) {
      // Small celebration the moment the last pending task of a (non-empty)
      // list gets checked off, not when the list is simply empty, or when
      // it simply arrives already-completed on the initial load.
      if (val && !oldVal && this.firstLoadDone && this.toDoListState && this.toDoListState.length > 0) {
        this.celebrate = true;
        clearTimeout(this.celebrateTimeout);
        this.celebrateTimeout = setTimeout(() => {
          this.celebrate = false;
        }, 1100);
        // Day lists broadcast a global event so the sidebar's streak badge
        // can light up alongside the confetti. Project lists stay silent to
        // avoid repeated celebrations on routine project closures.
        if (/^\d{8}$/.test(this.id)) {
          window.dispatchEvent(new CustomEvent("wtd-day-completed", {
            detail: { listId: this.id },
          }));
        }
      }
    },
  },
  computed: {
    // Entries carry the HOST listId (where the task really lives) and the
    // trueIndex inside that host, so every mutation hits the right slot even
    // when the task is only visible here as a dueDate reference from another
    // list.
    toDoListEntries: function () {
      let all = this.$store.getters.todoLists || {};
      let own = (all[this.id] || []).map((t, idx) => ({
        toDo: t,
        trueIndex: idx,
        hostListId: this.id,
      }));
      // dueDate references only land in day lists (listId = YYYYMMDD). If
      // this list is a day, pick up every task from other lists whose dueDate
      // matches it. Keep a dedup set on (hostListId, trueIndex) so a task
      // sitting in its own home day never doubles up.
      let isDayList = /^\d{8}$/.test(this.id);
      if (isDayList) {
        let seen = new Set(own.map((e) => e.hostListId + "@" + e.trueIndex));
        Object.keys(all).forEach((lid) => {
          if (lid === this.id) return;
          let list = all[lid] || [];
          list.forEach((t, idx) => {
            if (!t || t.dueDate !== this.id) return;
            let key = lid + "@" + idx;
            if (seen.has(key)) return;
            seen.add(key);
            own.push({ toDo: t, trueIndex: idx, hostListId: lid });
          });
        });
      }
      // In a day list, a task whose dueDate points to ANOTHER day belongs
      // there, not here, so hide it from its home day.
      if (isDayList) {
        own = own.filter((e) => {
          let d = e.toDo && e.toDo.dueDate;
          return !d || d === this.id;
        });
      }
      return own;
    },
    toDoListState: function () {
      // Flat task array for the pieces of UI that just count/scan tasks
      // (header progress, empty-state, all-done banner). Includes references.
      return this.toDoListEntries.map((e) => e.toDo);
    },
    visibleEntries: function () {
      const COMPACT_LIMIT = 3;
      if (!this.customTodoList || this.tasksExpanded || this.toDoListEntries.length <= COMPACT_LIMIT) {
        return this.toDoListEntries;
      }
      return this.toDoListEntries.slice(0, COMPACT_LIMIT);
    },
    hasHiddenTasks: function () {
      return this.customTodoList && !this.tasksExpanded && this.toDoListEntries.length > 3;
    },
    hiddenTasksCount: function () {
      return Math.max(0, this.toDoListEntries.length - 3);
    },
    columns: function () {
      if (this.forceFullWidth) return 1;
      if (this.customTodoList)
        return this.$store.getters.config.customColumns;

      return this.$store.getters.config.columns;
    },
    listColor: function () {
      if (!this.customTodoList || this.cTodoListIndex == null) return "";
      let list = this.$store.getters.cTodoListIds[this.cTodoListIndex];
      return list ? list.color || "" : "";
    },
    listKind: function () {
      if (!this.customTodoList || this.cTodoListIndex == null) return "";
      let list = this.$store.getters.cTodoListIds[this.cTodoListIndex];
      return list ? list.kind || "" : "";
    },
    containerStyle: function () {
      // Column-grid card as always. The elevated state (phased in Timeline
      // or Feed view) is handled by the .phased-elevated class in CSS, not
      // here, so this computed can stay a simple column-width expression.
      let style = { flex: `0 0 ${100 / this.columns}%` };
      // Resolve the single colour that identifies this project: the user's
      // manual pick wins, otherwise a stable auto-colour derived from the
      // list id. Expose it via CSS vars so the stylesheet draws the side
      // bar, the tint wash, and the hover state from one source.
      let color = this.listColor;
      if (!color && this.customTodoList) {
        color = projectColorHelper.solidFor(this.id);
      }
      if (color) {
        style["--project-color"] = color;
        style["--project-tint"] =
          `color-mix(in srgb, ${color} 7%, transparent)`;
        style["--project-tint-strong"] =
          `color-mix(in srgb, ${color} 11%, transparent)`;
      }
      return style;
    },
    isElevated: function () {
      return !!(this.customTodoList && this.isPhased && this.phasedPanelOpen);
    },
    allDone: function () {
      return !!(this.toDoListState && this.toDoListState.length > 0 && this.toDoListState.every((t) => t.checked));
    },
    cList: function () {
      if (!this.customTodoList || this.cTodoListIndex == null) return null;
      return this.$store.getters.cTodoListIds[this.cTodoListIndex] || null;
    },
    isPhased: function () {
      return phasedProjectHelper.isPhased(this.cList);
    },
    phasedPhases: function () {
      if (!this.isPhased) return [];
      return this.$store.getters.phases[this.id] || [];
    },
    phasedLogEntries: function () {
      if (!this.isPhased) return [];
      return this.$store.getters.logEntries[this.id] || [];
    },
    // Tasks view is shown unless the project is phased AND the user picked
    // Timeline or Feed from the header toggle. For checklist projects and
    // day lists this is always true.
    showTasksView: function () {
      return !this.isPhased || this.phasedView === "tasks";
    },
    // ---- Project cover (feature 8) ----
    //
    // Each custom project card gets a stylised hex watermark derived
    // deterministically from its id. Day lists have their own date-driven
    // identity in the mesh and heading, so they don't get one. The
    // 'kind-meeting' and 'kind-activelearning' variants already own the
    // top-right watermark slot, so we skip them too.
    showProjectCover: function () {
      if (!this.customTodoList) return false;
      if (this.listKind === "meeting" || this.listKind === "activelearning") return false;
      return true;
    },
    projectFramework: function () {
      // Back-compat alias so code that still reads projectFramework keeps
      // working. The real source of truth is projectThemeItem below, which
      // routes through themesHelper for whatever theme the user picked.
      return this.projectThemeItem;
    },
    projectThemeItem: function () {
      // The silhouette on the project cover is picked from the active
      // theme (zeolites, organic, oxides, photochem). An explicit per-
      // project override wins when the user set it: the code is stored
      // on the cTodoListIds record as `zeoliteFramework` (kept its old
      // name for back-compat even though it now holds the active theme's
      // item code). Falls back to a deterministic hash of the project id
      // so the same project always maps to the same silhouette.
      let cfg = this.$store.getters.config;
      if (this.customTodoList && this.cTodoListIndex != null) {
        let list = this.$store.getters.cTodoListIds[this.cTodoListIndex];
        if (list && list.zeoliteFramework) {
          let it = themesHelper.getItemByCode(list.zeoliteFramework, cfg);
          if (it) return it;
        }
      }
      return themesHelper.getItemFor(this.id, cfg);
    },
    // ---- Nucleation particles (feature 6) ----
    //
    // Six particles start on a wide circle around the centre and fly inward
    // to land exactly on the six vertices of a pointy-top hexagon of
    // radius R. Each starting angle is matched to its landing vertex (same
    // bearing), so the motion reads as nucleation onto a lattice site.
    nucleationParticles: function () {
      let R = 14;        // final unit-cell radius
      let START_R = 40;  // starting ring radius (edge of the viewBox)
      let pts = [];
      for (let i = 0; i < 6; i++) {
        let a = (Math.PI / 3) * i - Math.PI / 2;
        let sx = (START_R * Math.cos(a)).toFixed(2);
        let sy = (START_R * Math.sin(a)).toFixed(2);
        let tx = (R * Math.cos(a) - START_R * Math.cos(a)).toFixed(2);
        let ty = (R * Math.sin(a) - START_R * Math.sin(a)).toFixed(2);
        pts.push({ sx, sy, tx, ty });
      }
      return pts;
    },
    hexCellPoints: function () {
      let R = 14;
      let pts = [];
      for (let i = 0; i < 6; i++) {
        let a = (Math.PI / 3) * i - Math.PI / 2;
        let x = (R * Math.cos(a)).toFixed(2);
        let y = (R * Math.sin(a)).toFixed(2);
        pts.push(x + "," + y);
      }
      return pts.join(" ");
    },
  },
};
</script>

<style scoped lang="scss">
.to-do-list {
  list-style: none;
  padding-inline-start: 0px;
  margin-bottom: 0px;
}

.to-do-list li {
  -webkit-transition: all 0.4s ease-out;
  transition: all 0.4s ease-out;
}

.show-more-row {
  list-style: none;
}

.show-more-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  border: none;
  background: none;
  padding: 4px 6px;
  font-size: 0.78rem;
  color: #6e7681;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #24292f;
  }

  i {
    font-size: 0.7rem;
  }
}

.dark-theme .show-more-btn {
  color: #8b949e;

  &:hover {
    color: #e6edf3;
  }
}

.todo-input {
  height: 1.28rem;
  line-height: 1.3rem;
  font-size: 0.865rem;
  margin: 2px 0px 2px 0px;
  padding: 0 6px 0 6px;
}

.to-do-list-container {
  padding-left: 13px;
  padding-right: 13px;
  scroll-snap-align: start;
  margin-bottom: 5px;
  position: relative;
  transition: background 0.35s ease;
}

/* Project colour as a protagonist: a thick vertical bar on the left plus
   a diagonal wash of the same hue tinting the card. The bar lives on
   ::after (kind-* variants already own ::before) and the tint is a
   background on the container itself so it reads through the whole
   column without competing with the task text. */
.to-do-list-container.has-accent-color {
  padding-top: 10px;
  padding-left: 18px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  background: linear-gradient(
    135deg,
    var(--project-tint, transparent) 0%,
    transparent 58%
  );
}

.to-do-list-container.has-accent-color::after {
  content: "";
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 0;
  width: 4px;
  border-radius: 3px;
  background-color: var(--project-color, var(--accent-color, #5e6ef2));
  box-shadow: 0 0 10px -2px
    color-mix(in srgb, var(--project-color, #5e6ef2) 45%, transparent);
  z-index: 1;
  pointer-events: none;
}

.to-do-list-container.has-accent-color:hover {
  background: linear-gradient(
    135deg,
    var(--project-tint-strong, transparent) 0%,
    transparent 62%
  );
}

/* Project reorder drop target highlight. Painted while another project
   header is being dragged over THIS card. Dashed outline + soft tint so
   it reads clearly as a drop target without competing with the project's
   own identity colour. */
.to-do-list-container.project-reorder-hover {
  outline: 2px dashed var(--accent-color, #5e6ef2);
  outline-offset: -4px;
  background: color-mix(in srgb, var(--accent-color, #5e6ef2) 6%, transparent) !important;
  transition: background 0.1s ease, outline-color 0.1s ease;
}

/* ---- Meeting / active-learning list identity ---- */

.kind-watermark {
  position: absolute;
  top: -6px;
  right: 4px;
  font-size: 4.5rem;
  opacity: 0.07;
  pointer-events: none;
  z-index: 0;
}

.kind-meeting,
.kind-activelearning {
  isolation: isolate;
}

.kind-meeting::before,
.kind-activelearning::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  border-radius: inherit;
}

.kind-meeting::before {
  background: radial-gradient(circle at 100% 0%, rgba(237, 86, 161, 0.1), transparent 60%);
}

.kind-activelearning::before {
  background: radial-gradient(circle at 100% 0%, rgba(6, 182, 212, 0.1), transparent 60%);
}

.dark-theme .kind-watermark {
  opacity: 0.12;
}

.to-do-fake-item {
  height: 1.2rem;
  width: 100%;
}

.weekly-to-do-header h4 {
  margin-bottom: 4px;
}

.weekly-to-do-header span {
  margin-top: 0px;
}

.weekly-to-do-header i {
  color: grey;
}

.weekly-to-do-header i:hover {
  color: black;
}
.weekly-to-do-header i {
  font-size: 1.4rem;
  flex-grow: 0;
  align-self: start;
  cursor: pointer;
}

.fake-item-container {
  border-bottom: 1px solid #eaecef;
  height: 1.6rem;
}

.dark-theme .fake-item-container {
  border-bottom: 1px solid #30363d;
}

.fake-drop-zone * {
  pointer-events: none;
}

.fake-drop-zone:hover * {
  pointer-events: unset;
}

.fake-drag-hover .todo-item-container {
  box-shadow: rgb(244, 243, 243) 0px 0px 4px 1px inset;
  background-color: rgb(250, 249, 249);
}

.dark-theme .fake-drag-hover .todo-item-container {
  box-shadow: #0b0d12 0px 0px 4px 1px inset;
  background-color: #0c0d14;
}

.fake-drag-hover input,
.dark-theme .fake-drag-hover input {
  background-color: unset;
}

.fake-lines {
  background: transparent;
  height: calc(100% - 23px);
}

.fake-lines.custom-list {
  height: calc(100% - 24px);
}

.todo-input {
  line-height: 1.3rem;
  width: 100%;
  border: none;
  font-size: 0.865rem;
  background: transparent;
  color: inherit;
}

.todo-input:focus {
  outline: none;
}

.loading-spinner {
  position: relative;
  margin: auto;
  top: 200px;
  height: 0px;
  display: flex;
  justify-content: center;
}

/* ---- Orbital spinner (atom motif, used instead of a generic spinner) ---- */

.orbital-spinner {
  color: var(--accent-color, #5e6ef2);
  animation: orbitalSpin 1.1s linear infinite;
}

.orbital-nucleus {
  fill: currentColor;
}

.orbital-ring {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  opacity: 0.55;
}

@keyframes orbitalSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .orbital-spinner {
    animation: none;
  }
}

.todo-item-container {
  border-bottom: 1px solid #eaecef;
  height: 26px;
  z-index: 1;
  margin-bottom: -1px;
}

.empty-list-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #b0b3b8;
  font-size: 0.78rem;
  padding: 10px 0px 16px 0px;

  i {
    font-size: 1.3rem;
    opacity: 0.7;
  }

  .dark-theme & {
    color: #4b5158;
  }
}

.fade-collapse-enter-active,
.fade-collapse-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-collapse-enter-from,
.fade-collapse-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.all-done-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #2dbd6e;
  font-size: var(--fs-badge, 0.72rem);
  padding: 4px 0px 16px 0px;
  position: relative;

  i {
    font-size: 0.95rem;
  }
}

/* ---- Nucleation celebration (feature 6) ----
   Replaces the old confetti burst. Six particles fly inward from a wide
   circle and land on the vertices of a hexagonal unit cell that fades in
   underneath them, as if the day's work had crystallised. */

.nucleation-burst {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 80px;
  height: 80px;
  margin-left: -40px;
  margin-top: -40px;
  pointer-events: none;
  color: var(--accent-color, #5e6ef2);
  overflow: visible;
}

.nucleation-cell {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linejoin: round;
  opacity: 0;
  transform-origin: center;
  animation: nucleationCellIn 0.9s cubic-bezier(0.2, 0.8, 0.3, 1) 0.45s forwards;
}

.nucleation-dot {
  fill: currentColor;
  opacity: 0;
  animation: nucleationFlyIn 0.75s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
}

/* Each dot picks up a slightly different accent so the lattice doesn't
   read as monochrome mid-flight. The gold at the end is intentional, it
   echoes the 100% progress colour of the day greeting. */
.np-0 { color: var(--accent-color, #5e6ef2); }
.np-1 { color: #2dbd6e; }
.np-2 { color: #06b6d4; }
.np-3 { color: #f59e0b; }
.np-4 { color: #ed56a1; }
.np-5 { color: #10b981; }

@keyframes nucleationFlyIn {
  0%   { opacity: 0; transform: translate(0, 0) scale(1.3); }
  40%  { opacity: 1; }
  100% { opacity: 1; transform: translate(var(--tx, 0), var(--ty, 0)) scale(1); }
}

@keyframes nucleationCellIn {
  0%   { opacity: 0; stroke-dasharray: 0 120; }
  70%  { opacity: 0.85; }
  100% { opacity: 0.75; stroke-dasharray: 120 0; }
}

@media (prefers-reduced-motion: reduce) {
  .nucleation-dot,
  .nucleation-cell {
    animation: none !important;
    opacity: 0 !important;
  }
}

/* ---- Project cover (feature 8) ----
   A stylised hex of the project's deterministic zeolite framework, sitting
   as a watermark in the top-right of a custom project card. Tinted with
   the project's own colour via currentColor, so it reinforces the per-card
   identity without competing with the task list. */
.project-cover {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 60px;
  height: 60px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.28;
  color: var(--project-color, var(--accent-color, #5e6ef2));
  transition: opacity 0.35s ease, transform 0.6s cubic-bezier(0.2, 1, 0.1, 1);
}

.dark-theme .project-cover {
  opacity: 0.42;
}

.to-do-list-container:hover .project-cover {
  opacity: 0.5;
  animation: projectCoverSpin 30s linear infinite;
  /* subtle scale on top of the spin animation */
  transform: scale(1.08);
}

.dark-theme .to-do-list-container:hover .project-cover {
  opacity: 0.7;
}

@keyframes projectCoverSpin {
  from { transform: scale(1.08) rotate(0deg); }
  to   { transform: scale(1.08) rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .to-do-list-container:hover .project-cover {
    animation: none;
    transform: rotate(6deg) scale(1.06);
  }
}

/* On meeting / activelearning variants the slot is already taken by the
   kind-watermark icon; the v-if in the template handles that, but keep
   this guard too in case either is toggled dynamically. */
.kind-meeting .project-cover,
.kind-activelearning .project-cover {
  display: none;
}

/* ---- Phased elevated panel ----

   When a phased project toggles into Timeline or Feed, it lifts out of the
   column grid and pins itself over the whole app as a wide modal panel.
   Clicking the backdrop or pressing ESC drops it back to Tasks.

   The !important on position/width overrides whatever containerStyle set
   via the inline style attribute, so a card that was flex: 0 0 <N>%
   becomes a fixed, centred rectangle for as long as the elevated state
   holds. The slide-up and fade-in come from a short CSS animation that
   plays once at mount; closing is instant to not drag out the backdrop. */
.to-do-list-container.phased-elevated {
  position: fixed !important;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(94vw, 940px);
  max-height: 90vh;
  min-height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1055;
  background: #fff;
  border-radius: 14px;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.28),
    0 10px 24px rgba(0, 0, 0, 0.16);
  padding: 14px 26px 24px !important;
  margin: 0 !important;
  flex: none !important;
  max-width: none !important;
  animation: phasedPanelIn 0.22s ease-out forwards;
  will-change: transform, opacity;

  .dark-theme & {
    background: #1c1f22;
    box-shadow:
      0 24px 70px rgba(0, 0, 0, 0.6),
      0 10px 24px rgba(0, 0, 0, 0.45);
  }

  /* Keep the project colour bar on the elevated panel too, but anchored
     to the left edge of the bigger rectangle so it still reads as the
     project's identity strip. */
  &.has-accent-color::after {
    top: 14px;
    bottom: 14px;
    left: 0;
    width: 5px;
    border-radius: 0 3px 3px 0;
  }

  /* The base .has-accent-color card paints a diagonal tint gradient and
     flips to a stronger gradient on hover; on top of the panel's solid
     white that reads as the background going transparent when the mouse
     enters. Lock the elevated panel to a solid, opaque background in both
     themes, idle and hover. */
  &.has-accent-color,
  &.has-accent-color:hover {
    background: #fff !important;
  }

  .dark-theme &.has-accent-color,
  .dark-theme &.has-accent-color:hover {
    background: #1c1f22 !important;
  }
}

/* Close button pinned to the panel's top-right corner. Only rendered
   while the panel is elevated. ESC and the backdrop are the other two
   dismiss routes. */
.phased-close-btn {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(140, 140, 140, 0.1);
  color: #5c5c5c;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 6;
  transition: background 0.15s, color 0.15s;
  i { font-size: 1rem; }
  &:hover {
    background: rgba(200, 75, 59, 0.14);
    color: #c84b3b;
  }
  .dark-theme & {
    background: rgba(255, 255, 255, 0.07);
    color: #c9d1d9;
    &:hover {
      background: rgba(224, 120, 102, 0.18);
      color: #e07866;
    }
  }
}

/* Soft fade at the bottom of the scrollable panel to hint at more
   content below the fold. The gradient fades to the panel background in
   both themes. */
.to-do-list-container.phased-elevated::before {
  content: "";
  position: sticky;
  display: block;
  bottom: 0;
  left: 0;
  right: 0;
  height: 28px;
  margin: -28px -26px 0;
  background: linear-gradient(transparent, #fff 90%);
  pointer-events: none;
  z-index: 1;
  flex-shrink: 0;
  .dark-theme & {
    background: linear-gradient(transparent, #1c1f22 90%);
  }
}

@keyframes phasedPanelIn {
  from {
    opacity: 0;
    transform: translate(-50%, -46%) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .to-do-list-container.phased-elevated {
    animation: none;
  }
}
</style>

<!-- Non-scoped styles for the backdrop. Teleport moves the backdrop node
     out of the component's DOM subtree, which strips the scoped
     data-v-* attribute, so a scoped rule would never match it. -->
<style lang="scss">
.phased-overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.48);
  z-index: 1050;
  animation: phasedBackdropIn 0.2s ease-out forwards;
  cursor: pointer;
}

@keyframes phasedBackdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .phased-overlay-backdrop { animation: none; }
}

/* While the elevated panel is up, keep the sidebar and app chrome from
   scrolling behind it; the backdrop handles the dim, this just stops
   the host from reflowing on scroll gestures. */
body.phased-overlay-open {
  overflow: hidden;
}

/* When Bootstrap opens any modal (phaseEditor, addLogEntry, snapshot
   prompt, etc.) it adds body.modal-open and inserts its own backdrop at
   z-index 1050 and the modal at 1055. The phased panel sits at 1055 too,
   so without this rule it would stack on top of the modal and swallow its
   clicks. Lower the phased panel and its backdrop below Bootstrap's
   backdrop while any modal is open, so the modal (and its dismiss click)
   always wins. The elevated panel stays mounted and visible once the
   modal closes. */
body.modal-open .to-do-list-container.phased-elevated {
  z-index: 1040 !important;
}
body.modal-open .phased-overlay-backdrop {
  z-index: 1035 !important;
}
</style>
