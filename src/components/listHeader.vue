<template>
  <!-- Drag/drop handlers live on the OUTER .weekly-to-do-header so a drop
       is accepted anywhere on the header strip, even over the chevron, the
       three-dots icon or the inner badges. If we only attach dragover /
       drop to the inner title div, the browser cancels the drop as soon as
       the pointer passes over any child that is not preventDefault'd.
       The inner title div still carries draggable + dragstart because
       that is where the user grabs the project to initiate the drag. -->
  <div class="weekly-to-do-header d-flex" :class="{ 'header-drag-hover': headerDragHover }"
    @dragover="onHeaderDragOver" @drop="onHeaderDrop"
    @dragenter.prevent="onHeaderDragEnter" @dragleave="onHeaderDragLeave" @dragend="onHeaderDragLeave">
    <i v-show="!editing" class="bi-info header-menu-icons align-self-center dropdown-toggle-split "
      style="visibility: hidden"></i>
    <div style="flex-grow: 1" class="noselect" :draggable="customTodoList && !editing"
      @dragstart="onHeaderDragStart">
      <div v-if="!customTodoList">
        <h4 :class="{ 'today-date': is_today }">
          {{ moments(id).locale(language).format("dddd") }}
        </h4>
        <span class="weekly-to-do-subheader">
          {{ moments(id).locale(language).format("LL") }}
        </span>
      </div>
      <div v-else>
        <h4 v-show="!editing" @dblclick="editToDoListName">
          <i v-if="listIcon" :class="listIcon" class="list-type-icon"></i>
          <span class="dropdown-center list-color-dropdown" @click.stop>
            <span class="list-color-dot" :style="{ background: listColor || autoColorGradient }"
              :title="$t('ui.projectColor')" type="button" data-bs-toggle="dropdown"></span>
            <ul class="dropdown-menu color-picker-dropdown px-2">
              <li v-for="row in colorPaletteRows" :key="row[0] || 'row'" class="d-flex align-items-center">
                <i v-for="c in row" :key="c || 'none'" class="colors-menu-icons"
                  :class="c ? 'bi-circle-fill' : 'bi-circle'" :style="c ? { color: c } : {}" type="button"
                  @click="setColor(c)"></i>
              </li>
            </ul>
          </span>
          <span class="project-title-click" @click="openCrystal" :title="$t('ui.openCrystal') || 'Open project crystal'">{{ todo_list_name }}</span>
          <i v-if="folderPath && !editingFolder" class="bi-folder2-open folder-link-icon" :title="folderPath"
            @click.stop="openFolder"></i>
        </h4>
        <input class="custom-todo-input" v-show="editing" type="text" v-model="name" ref="cTodoInput" @blur="doneEdit()"
          @keyup.enter="doneEdit()" @keyup.esc="cancelEdit()" />
        <div v-show="!editing && toDoList.length" class="list-stats-badges">
          <span v-if="deadlineStats.overdue" class="stat-badge badge-overdue" :title="$t('todoDetails.overdue')">
            <i class="bi-exclamation-circle-fill"></i> {{ deadlineStats.overdue }}
          </span>
          <span v-if="deadlineStats.dueToday" class="stat-badge badge-due-today" :title="$t('todoDetails.today')">
            <i class="bi-calendar-check-fill"></i> {{ deadlineStats.dueToday }}
          </span>
          <span class="stat-badge badge-progress">{{ progressStats.done }}/{{ progressStats.total }}</span>
        </div>
        <div v-show="!editing && toDoList.length && !isPhased" class="list-progress-bar">
          <div class="list-progress-fill" :style="{ width: progressStats.percent + '%' }"></div>
        </div>
        <div v-if="!editing && customTodoList && isPhased" class="phased-view-toggle" @click.stop>
          <button
            type="button"
            :class="{ active: phasedView === 'tasks' }"
            @click="$emit('setPhasedView', 'tasks')"
          ><i class="bi-check2-square"></i>{{ $t('phased.viewTasks') || 'Tasks' }}</button>
          <button
            type="button"
            :class="{ active: phasedView === 'timeline' }"
            @click="$emit('setPhasedView', 'timeline')"
          ><i class="bi-bar-chart-steps"></i>{{ $t('phased.viewTimeline') || 'Timeline' }}</button>
          <button
            type="button"
            :class="{ active: phasedView === 'feed' }"
            @click="$emit('setPhasedView', 'feed')"
          ><i class="bi-journal-text"></i>{{ $t('phased.viewFeed') || 'Feed' }}</button>
        </div>
        <button v-if="!editing && customTodoList && paperSummary" type="button" class="paper-chip"
          :title="$t('ui.paperTracker')" @click.stop="openPaperTracker">
          <i class="bi-file-earmark-text"></i>
          <span>{{ paperSummary.label }}</span>
          <span v-if="paperSummary.pct !== null" class="paper-chip-bar"><span :style="{ width: paperSummary.pct + '%' }"></span></span>
        </button>
        <p v-if="!editing && !editingNotes && notes" class="project-notes-preview" @click="openNotesEdit"
          :title="$t('ui.projectNotes')">{{ notes }}</p>
        <textarea v-if="editingNotes" v-model="notesDraft" class="project-notes-input"
          :placeholder="$t('ui.projectNotesPlaceholder')" @blur="saveNotes" @keyup.esc="cancelNotes" ref="notesInput"></textarea>
        <input v-if="editingFolder" v-model="folderDraft" class="folder-path-input" type="text"
          :placeholder="$t('ui.folderPathPlaceholder')" @blur="saveFolderPath" @keyup.enter="saveFolderPath"
          @keyup.esc="cancelFolderEdit" ref="folderInput" />
      </div>
    </div>
    <i class="bi-chevron-up header-menu-icons collapse-toggle align-self-center" :class="{ 'collapsed-icon': collapsed }"
      @click="$emit('toggleCollapse')" :title="collapsed ? $t('ui.expandList') : $t('ui.collapseList')"></i>
    <i v-show="!editing" class="bi-three-dots-vertical header-menu-icons dropdown-toggle-split align-self-center"
      type="button" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}'></i>
    <ul class="dropdown-menu floating-menu" aria-labelledby="btnTaskOptionMenu">
      <li>
        <button class="dropdown-item" type="button" @click="newTask">
          <i class="bi-plus-lg"></i> <span>{{ $t('ui.newTask') }}</span>
        </button>
      </li>
      <li v-show="!allTodoChecked()">
        <button class="dropdown-item" type="button" @click="check_all_items">
          <i class="bi-check2-all"></i> <span>{{ $t('ui.completeAll') }}</span>
        </button>
      </li>
      <li v-show="!customTodoList && !allTodoChecked()">
        <button class="dropdown-item" type="button" @click="moveUndoneItems">
          <i class="bi-reply-all"></i> <span>{{ $t('ui.postpone') }}</span>
        </button>
      </li>
      <li>
        <button class="dropdown-item" type="button" @click="copyListTasksToClipboard">
          <i class="bi-clipboard"></i> <span>{{ $t('ui.copyTasks') }}</span>
        </button>
      </li>
      <li v-show="customTodoList">
        <button class="dropdown-item" type="button" data-bs-toggle="modal" data-bs-target="#ReorderCustomListsModal">
          <i class="bi-sort-down"></i> <span>{{ $t('ui.reorderCustomLists') || 'Reorder projects' }}</span>
        </button>
      </li>
      <li>
        <hr class="dropdown-divider" />
      </li>
      <li v-show="customTodoList && isPhased">
        <button class="dropdown-item" type="button" @click="$emit('addPhase')">
          <i class="bi-bar-chart-steps"></i> <span>{{ $t('phased.addPhase') || 'Add phase' }}</span>
        </button>
      </li>
      <li v-show="customTodoList && isPhased">
        <button class="dropdown-item" type="button" @click="$emit('addLogEntry')">
          <i class="bi-journal-plus"></i> <span>{{ $t('phased.addEntry') || 'Add log entry' }}</span>
        </button>
      </li>
      <li v-show="customTodoList && isPhased">
        <button class="dropdown-item" type="button" @click="exportTimelineLog">
          <i class="bi-journal-text"></i> <span>{{ $t('phased.exportLog') }}</span>
        </button>
      </li>
      <li v-show="customTodoList && isPhased">
        <hr class="dropdown-divider" />
      </li>
      <li v-show="customTodoList">
        <button class="dropdown-item" type="button" @click="openNotesEdit">
          <i class="bi-sticky"></i> <span>{{ $t('ui.projectNotes') }}</span>
        </button>
      </li>
      <li v-show="customTodoList">
        <button class="dropdown-item" type="button" @click="exportMarkdown">
          <i class="bi-file-earmark-arrow-down"></i> <span>{{ $t('ui.exportMarkdown') }}</span>
        </button>
      </li>
      <li v-show="customTodoList">
        <button class="dropdown-item" type="button" @click="openFolderEdit">
          <i class="bi-folder2-open"></i> <span>{{ $t('ui.linkFolder') }}</span>
        </button>
      </li>
      <li v-show="customTodoList">
        <button class="dropdown-item" type="button" @click="openBatchTracker">
          <i class="ph ph-stack"></i> <span>{{ $t('ui.batchTracker') || 'Batch tracker' }}</span>
        </button>
      </li>
      <li v-show="customTodoList">
        <button class="dropdown-item" type="button" @click="openPaperTracker">
          <i class="bi-file-earmark-text"></i> <span>{{ $t('ui.paperTracker') }}</span>
        </button>
      </li>
      <li v-show="customTodoList">
        <button class="dropdown-item" type="button" @click="toggleArchive">
          <i :class="isArchived ? 'bi-box-arrow-up' : 'bi-archive'"></i>
          <span>{{ isArchived ? $t('ui.unarchive') : $t('ui.archive') }}</span>
        </button>
      </li>
      <li>
        <button class="dropdown-item" type="button" @click="clearList" data-bs-toggle="modal"
          data-bs-target="#clearListModal">
          <i class="bi-trash"></i> <span>{{ $t('ui.clearList') }}</span>
        </button>
      </li>
      <li v-show="customTodoList">
        <button class="dropdown-item" type="button" data-bs-dismiss="modal" @click="removeList" data-bs-toggle="modal"
          data-bs-target="#customListRemoveModal">
          <i class="bi-x-circle"></i> <span>{{ $t('ui.removeList') }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
import moment from "moment";
import toDoListRepository from "../repositories/toDoListRepository";
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";
import notifications from "../helpers/notifications";
import tasksHelper from "../helpers/tasksHelper";
import isElectron from "is-electron";
import projectColorHelper from "../helpers/projectColorHelper";
import paperTrackerHelper from "../helpers/paperTrackerHelper";
import projectLogMarkdown from "../helpers/projectLogMarkdown";
import { Toast, Modal } from 'bootstrap';

export default {
  props: {
    id: { required: false, type: String },
    customTodoList: { required: false, default: false, type: Boolean },
    cTodoListIndex: { required: false, type: Number },
    toDoList: { required: false, type: Array },
    collapsed: { required: false, default: false, type: Boolean },
    isPhased: { required: false, default: false, type: Boolean },
    phasedView: { required: false, default: "tasks", type: String },
  },
  emits: ["toggleCollapse", "forceCollapse", "setPhasedView", "addPhase", "addLogEntry"],
  data() {
    return {
      editing: false,
      name: "",
      headerDragHover: false,
      editingNotes: false,
      notesDraft: "",
      editingFolder: false,
      folderDraft: "",
      colorPalette: [
        "",
        "#77e785",
        "#06b6d4",
        "#5e6ef2",
        "#8b5cf6",
        "#ed56a1",
        "#ed544b",
        "#f97316",
        "#f9d54a",
        "#10b981",
        "#ba7956",
        "#6b7280",
        "#030712",
      ],
    };
  },
  mounted() {
    if (this.customTodoList) {
      if (this.$store.getters.actions.cListCreated) {
        this.$store.commit("actionsCListCreatedUpdate", false);
        this.editing = true;
        this.$nextTick(function () {
          this.$refs.cTodoInput.focus();
          this.$refs.cTodoInput.select();
        });
      }
    }
  },
  methods: {
    check_all_items: function () {
      this.$store.commit("checkAllItems", this.id);
      this.updateTodoList(this.id, this.$store.getters.todoLists[this.id]);
    },
    moveUndoneItems: async function () {
      let towmorrow_id = this.moments(this.id).add(1, "d").format("YYYYMMDD");
      // In "today only" mode tomorrow's list is not rendered, so it may not be
      // in the store. The mutation needs it there (and the write below would
      // overwrite its stored tasks otherwise), so load it first.
      if (!this.$store.getters.todoLists[towmorrow_id]) {
        await this.$store.dispatch("loadTodoLists", towmorrow_id);
      }
      this.$store.commit("moveUndoneItems", {
        origenId: this.id,
        destinyId: towmorrow_id,
      });
      this.updateTodoList(this.id, this.$store.getters.todoLists[this.id]);

      if (this.$store.getters.config.autoReorderTasks) {
        this.updateTodoList(towmorrow_id, tasksHelper.reorderTasksList(this.$store.getters.todoLists[towmorrow_id]));
      } else {
        this.updateTodoList(towmorrow_id, this.$store.getters.todoLists[towmorrow_id]);
      }

    },
    moments: function (date) {
      return moment(date);
    },
    updateTodoList: function (todoListId, TodoList) {
      notifications.refreshDayNotifications(this, todoListId);
      toDoListRepository.update(todoListId, TodoList);
    },
    allTodoChecked: function () {
      let allChecked = true;
      this.toDoList.forEach(function (todo) {
        if (!todo.checked) {
          allChecked = false;
          return;
        }
      });
      return allChecked;
    },
    editToDoListName: function () {
      this.name = this.$store.getters.cTodoListIds[this.cTodoListIndex].listName;
      this.editing = true;
      this.$nextTick(function () {
        this.$refs.cTodoInput.focus();
        this.$refs.cTodoInput.select();
      });
    },
    doneEdit: function () {
      this.editing = false;
      this.$store.commit("updateCustomTodoList", {
        index: this.cTodoListIndex, name: this.name,
      });
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
    cancelEdit: function () {
      this.name = this.$store.getters.cTodoListIds[this.cTodoListIndex].listName || "";
      this.editing = false;
    },
    removeList: function () {
      this.$store.commit("actionsCListToRmvUpdate", {
        id: this.id,
        index: this.cTodoListIndex,
        name: this.$store.getters.cTodoListIds[this.cTodoListIndex].listName,
      });
    },
    sortItems: function () {
      toDoListRepository.update(this.id, tasksHelper.reorderTasksList(this.toDoList));
    },
    clearList: function () {
      this.$store.commit("setListToClear", this.id);
    },
    copyListTasksToClipboard: async function () {
      await navigator.clipboard.writeText(this.todoListToString());
      let toast = new Toast(document.getElementById("copiedTaskToClipboard"));
      toast.show();
    },
    todoListToString: function () {
      return this.toDoList.map((x) => {
        let task = `- ${x.text}`;
        if (x.time) task += ` [${x.time}]`;
        return task;
      }).join('\n')
    },
    newTask: function () {
      this.$nextTick(function () {
        document
          .getElementById("list" + this.id)
          .getElementsByClassName("new-todo-input")[0]
          .focus();
      });
    },
    toggleArchive: function () {
      let archived = !this.isArchived;
      // Archiving unmounts this card (unless archived projects are shown). The
      // options menu is portaled out of the card while open (floatingDropdown),
      // so unmounting in the same tick as the click would leave it orphaned and
      // visible. Wait one tick so the dropdown closes and the menu returns to
      // its place first.
      setTimeout(() => {
        this.$store.commit("setListArchived", { index: this.cTodoListIndex, archived: archived });
        customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
        if (archived) this.$emit("forceCollapse");
      }, 0);
    },
    onHeaderDragStart: function (event) {
      if (!this.customTodoList) return;
      // dataTransfer accepts strings only; coerce explicitly so Vue's
      // reactivity-wrapped number does not surprise us. Also write the
      // index under two keys: the custom "list-reorder-index" plus a
      // vendor-prefixed MIME string, because some browsers (notably older
      // Chromium in Electron) strip non-standard custom types during
      // dragover readback. The drop handler reads either.
      let payload = String(this.cTodoListIndex);
      try { event.dataTransfer.setData("list-reorder-index", payload); } catch (e) { /* unsupported MIME, fall through to next format */ }
      try { event.dataTransfer.setData("application/x-lattice-list-reorder", payload); } catch (e) { /* unsupported MIME, fall through to text/plain */ }
      // Also tag a text/plain fallback so the browser does not pick up any
      // selection it might think is being dragged.
      try { event.dataTransfer.setData("text/plain", "lattice-list-reorder:" + payload); } catch (e) { /* text/plain refused, nothing more we can do */ }
      event.dataTransfer.effectAllowed = "move";
    },
    onHeaderDragOver: function (event) {
      // Must preventDefault during dragover for the drop to be allowed. We
      // allow unconditionally and verify in onHeaderDrop that the payload
      // is a reorder, because browsers restrict reading dataTransfer during
      // dragover.
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    },
    onHeaderDragEnter: function (event) {
      if (!this.customTodoList) return;
      event.preventDefault();
      this.headerDragHover = true;
    },
    onHeaderDragLeave: function (event) {
      // Only clear hover when the pointer actually leaves the header
      // rectangle, otherwise moving over an inner child fires dragleave on
      // the parent and flickers the highlight.
      if (!event || !event.currentTarget) {
        this.headerDragHover = false;
        return;
      }
      let r = event.currentTarget.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX >= r.right ||
          event.clientY < r.top || event.clientY >= r.bottom) {
        this.headerDragHover = false;
      }
    },
    onHeaderDrop: function (event) {
      this.headerDragHover = false;
      if (!event.dataTransfer) return;
      let fromIndexRaw =
        event.dataTransfer.getData("list-reorder-index") ||
        event.dataTransfer.getData("application/x-lattice-list-reorder");
      if (!fromIndexRaw) {
        // Fallback: text/plain tagged with our marker
        let txt = event.dataTransfer.getData("text/plain") || "";
        let m = txt.match(/^lattice-list-reorder:(\d+)$/);
        if (m) fromIndexRaw = m[1];
      }
      if (!fromIndexRaw) return;
      event.preventDefault();
      let fromIndex = parseInt(fromIndexRaw, 10);
      let toIndex = this.cTodoListIndex;
      if (isNaN(fromIndex) || fromIndex === toIndex) return;
      // Go through a mutation so Vuex sees the reorder and every component
      // that reads cTodoListIds (sidebar, project grid, deadline radar...)
      // re-renders.
      this.$store.commit("reorderCustomTodoLists", { from: fromIndex, to: toIndex });
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
    setColor: function (color) {
      this.$store.commit("updateCustomListField", {
        index: this.cTodoListIndex,
        field: "color",
        value: color,
      });
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
    openNotesEdit: function () {
      this.notesDraft = this.notes;
      this.editingNotes = true;
      this.$nextTick(function () {
        if (this.$refs.notesInput) this.$refs.notesInput.focus();
      });
    },
    saveNotes: function () {
      this.editingNotes = false;
      this.$store.commit("updateCustomListField", {
        index: this.cTodoListIndex,
        field: "notes",
        value: this.notesDraft.trim(),
      });
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
    cancelNotes: function () {
      this.editingNotes = false;
    },
    openFolderEdit: function () {
      this.folderDraft = this.folderPath;
      this.editingFolder = true;
      this.$nextTick(function () {
        if (this.$refs.folderInput) this.$refs.folderInput.focus();
      });
    },
    saveFolderPath: function () {
      this.editingFolder = false;
      this.$store.commit("updateCustomListField", {
        index: this.cTodoListIndex,
        field: "folderPath",
        value: this.folderDraft.trim(),
      });
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
    cancelFolderEdit: function () {
      this.editingFolder = false;
    },
    openFolder: function () {
      if (!isElectron() || !this.folderPath) return;
      require("electron").shell.openPath(this.folderPath);
    },
    // Project crystal: a dedicated detail view with the project's framework
    // rotating in 3D plus its stats and open tasks. Only wired on custom
    // project lists (day lists don't have a stable framework identity).
    openCrystal: function () {
      if (!this.customTodoList) return;
      window.dispatchEvent(new CustomEvent("open-project-crystal", { detail: { listId: this.id } }));
    },
    openBatchTracker: function () {
      this.$store.commit("setBatchTrackerTarget", this.id);
      let modalEl = document.getElementById("batchTrackerModal");
      if (modalEl) new Modal(modalEl).show();
    },
    openPaperTracker: function () {
      this.$store.commit("setPaperTrackerTarget", this.id);
      let modalEl = document.getElementById("paperTrackerModal");
      if (modalEl) Modal.getOrCreateInstance(modalEl).show();
    },
    // Phased projects only: Gantt (Mermaid + table) and log feed as one .md,
    // meant to be dropped into a report or an LLM project as context.
    exportTimelineLog: async function () {
      if (!this.customTodoList || !this.isPhased) return;
      let listId = this.id;
      // Normally already in the store (loaded when the project mounts); load
      // from the DB only if it is missing.
      if (!this.$store.getters.phases[listId]) await this.$store.dispatch("loadPhases", listId);
      if (!this.$store.getters.logEntries[listId]) await this.$store.dispatch("loadLogEntries", listId);
      let project = this.$store.getters.cTodoListIds[this.cTodoListIndex] || {};
      let text = projectLogMarkdown.build(
        project,
        this.$store.getters.phases[listId] || [],
        this.$store.getters.logEntries[listId] || []
      );
      projectLogMarkdown.download(projectLogMarkdown.filename(project.listName), text);
    },
    exportMarkdown: function () {
      let title = this.todo_list_name || "list";
      let lines = [`# ${title}`, ""];
      if (this.notes) {
        lines.push(this.notes, "");
      }
      this.toDoList.forEach((t) => {
        let box = t.checked ? "[x]" : "[ ]";
        let line = `- ${box} ${t.text}`;
        if (t.deadline) line += ` (${this.moments(t.deadline).format("DD/MM/YYYY")})`;
        if (t.tags && t.tags.length) line += ` #${t.tags.join(" #")}`;
        lines.push(line);
        if (t.subTaskList && t.subTaskList.length) {
          t.subTaskList.forEach((s) => {
            lines.push(`  - ${s.checked ? "[x]" : "[ ]"} ${s.text}`);
          });
        }
      });
      let blob = new Blob([lines.join("\n")], { type: "text/markdown" });
      let url = URL.createObjectURL(blob);
      let a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "list"}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  },
  computed: {
    is_today: function () {
      return moment().format("YYYYMMDD") == this.id;
    },
    todo_list_name: function () {
      return this.$store.getters.cTodoListIds[this.cTodoListIndex].listName;
    },
    language: function () {
      return this.$store.getters.config.language;
    },
    isArchived: function () {
      if (!this.customTodoList || this.cTodoListIndex == null) return false;
      let list = this.$store.getters.cTodoListIds[this.cTodoListIndex];
      return !!(list && list.archived);
    },
    progressStats: function () {
      let total = this.toDoList ? this.toDoList.length : 0;
      let done = this.toDoList ? this.toDoList.filter((t) => t.checked).length : 0;
      return { total: total, done: done, percent: total ? Math.round((done / total) * 100) : 0 };
    },
    deadlineStats: function () {
      let today = moment().format("YYYYMMDD");
      let overdue = 0;
      let dueToday = 0;
      (this.toDoList || []).forEach((t) => {
        if (t.checked || !t.deadline) return;
        if (t.deadline < today) overdue++;
        else if (t.deadline == today) dueToday++;
      });
      return { overdue: overdue, dueToday: dueToday };
    },
    listColor: function () {
      if (!this.customTodoList || this.cTodoListIndex == null) return "";
      let list = this.$store.getters.cTodoListIds[this.cTodoListIndex];
      return list ? list.color || "" : "";
    },
    listIcon: function () {
      if (!this.customTodoList || this.cTodoListIndex == null) return "";
      let list = this.$store.getters.cTodoListIds[this.cTodoListIndex];
      return list ? list.icon || "" : "";
    },
    notes: function () {
      if (!this.customTodoList || this.cTodoListIndex == null) return "";
      let list = this.$store.getters.cTodoListIds[this.cTodoListIndex];
      return list ? list.notes || "" : "";
    },
    folderPath: function () {
      if (!this.customTodoList || this.cTodoListIndex == null) return "";
      let list = this.$store.getters.cTodoListIds[this.cTodoListIndex];
      return list ? list.folderPath || "" : "";
    },
    // Compact summary of the project's manuscript plan for the header chip.
    // null when the project has no plan (nothing is shown in that case).
    paperSummary: function () {
      if (!this.customTodoList || this.cTodoListIndex == null) return null;
      let list = this.$store.getters.cTodoListIds[this.cTodoListIndex];
      if (!list || !list.paper || !Array.isArray(list.paper.sections) || !list.paper.sections.length) return null;
      let tot = paperTrackerHelper.totals(list.paper);
      let label = tot.pct !== null ? tot.pct + "%" : tot.words.toLocaleString() + " " + this.$t("ui.paperWordsWord");
      return { pct: tot.pct, label: label };
    },
    autoColorGradient: function () {
      return projectColorHelper.gradientFor(this.id);
    },
    colorPaletteRows: function () {
      let rows = [];
      for (let i = 0; i < this.colorPalette.length; i += 4) {
        rows.push(this.colorPalette.slice(i, i + 4));
      }
      return rows;
    },
  },
};
</script>

<style scoped lang="scss">
.weekly-to-do-header {
  text-align: center;
  margin-bottom: 23px;
  margin-top: 10px;
  display: flex;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.today-date {
  text-decoration: underline;
}

/* Project / day titles in the editorial display serif. The custom-list
   variant and the day heading share the same voice so the column grid
   reads as one typographic system. */
.weekly-to-do-header h4 {
  margin-bottom: 4px;
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: calc(var(--fs-title, 21px) + 2px);
  font-weight: 400;
  font-variation-settings: "opsz" 48, "wght" 460;
  letter-spacing: -0.012em;
  text-transform: capitalize;
  min-height: 25px;
  line-height: 1.1;
}

.dark-theme .weekly-to-do-header h4 {
  font-variation-settings: "opsz" 48, "wght" 420;
}

/* The project title inside h4 is clickable (opens the crystal view). Use a
   subtle hover-color + underline-offset trick instead of a full button so
   the editorial typography of h4 stays intact. */
.project-title-click {
  cursor: pointer;
  transition: color 0.2s ease;
}

.project-title-click:hover {
  color: var(--project-color, var(--accent-color, #5e6ef2));
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--project-color, #5e6ef2) 50%, transparent);
  text-underline-offset: 4px;
  text-decoration-thickness: 1px;
}

.weekly-to-do-subheader {
  margin-top: 0px;
  font-size: var(--fs-subtitle, 12px);
  color: grey;
  font-variant-numeric: oldstyle-nums;
}

.weekly-to-do-header .header-menu-icons {
  color: grey;
}

.dark-theme .weekly-to-do-header .header-menu-icons {
  color: #c9d1d9;
}

.weekly-to-do-header .header-menu-icons:hover {
  color: var(--accent-color, #5e6ef2);
}

.dark-theme .weekly-to-do-header .header-menu-icons:hover {
  color: var(--accent-color, #5e6ef2);
}

.weekly-to-do-header .header-menu-icons {
  font-size: 20px;
  flex-grow: 0;
  align-self: start;
  cursor: pointer;
  visibility: hidden;
  opacity: 0;
  transition: 0.4s cubic-bezier(0.2, 1, 0.1, 1);
}

.custom-todo-input {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: calc(var(--fs-title, 21px) + 2px);
  font-weight: 400;
  font-variation-settings: "opsz" 48, "wght" 460;
  letter-spacing: -0.012em;
  width: 100%;
  background: transparent;
}

.custom-todo-input:focus {
  outline: black auto 1px;
}

.dark-theme .custom-todo-input:focus {
  color: white;
  outline: #13171d auto 1px;
}

.weekly-to-do-header:hover .header-menu-icons,
.header-menu-icons.show {
  visibility: visible;
  opacity: 1;
}

.dropdown-menu {
  font-size: 0.865rem;
  min-width: unset;
  border-radius: 8px;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, .20);
  border: none;
  color: #3c3c3c;

  .dropdown-item {
    padding: .4rem 1.9rem .4rem .65rem;
  }

  .dropdown-divider {
    margin: .3rem;
  }

  i {
    font-size: 0.99rem;
    margin-right: 11px;
    display: inline-block;
  }
}

.dark-theme .dropdown-menu {
  background-color: #1c2128;
  color: #e6edf3;
  box-shadow: 0 2px 14px 0 rgba(0, 0, 0, .45);
  border: 1px solid #30363d;

  .dropdown-item {
    color: #e6edf3;

    &:hover, &:focus {
      background-color: #2a313a;
      color: #ffffff;
    }

    &:active {
      background-color: #343b43;
      color: #ffffff;
    }
  }

  .dropdown-divider {
    border-color: #30363d;
  }
}

.dropdown-toggle-split {
  padding: 0px;
}

.bi-reply-all,
.bi-files {
  transform: scaleX(-1);
}

.header-drag-hover {
  background-color: rgb(250, 249, 249);
  border-radius: 6px;
}

.dark-theme .header-drag-hover {
  background-color: #1c2128;
}

.collapse-toggle {
  font-size: 15px !important;
  transition: transform 0.2s ease-out, opacity 0.4s, visibility 0.4s;
}

.collapse-toggle.collapsed-icon {
  transform: rotate(180deg);
}

.list-stats-badges {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: -2px;
  margin-bottom: 4px;
}

.stat-badge {
  font-size: var(--fs-badge, 0.72rem);
  padding: 0px 7px;
  border-radius: 10px;
  background-color: #eaecef;
  color: #6b7280;

  .dark-theme & {
    background-color: #21262d;
    color: #babbbe;
  }

  i {
    margin-right: 2px;
    font-size: 0.68rem;
  }
}

.stat-badge.badge-overdue {
  background-color: rgba(237, 84, 75, 0.15);
  color: #ed544b;
}

.stat-badge.badge-due-today {
  background-color: rgba(249, 115, 22, 0.15);
  color: #f97316;
}

.list-progress-bar {
  height: 3px;
  border-radius: 2px;
  background-color: rgba(0, 0, 0, 0.06);
  margin-bottom: 6px;
  overflow: hidden;

  .dark-theme & {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.list-progress-fill {
  height: 100%;
  border-radius: 2px;
  background-color: var(--accent-color, #5e6ef2);
  transition: width 0.35s cubic-bezier(0.2, 1, 0.1, 1);
}

.list-type-icon {
  font-size: 15px;
  margin-right: 4px;
  opacity: 0.8;
  vertical-align: middle;
}

.list-color-dropdown {
  display: inline-block;
}

.list-color-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 6px;
  cursor: pointer;
  vertical-align: middle;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.color-picker-dropdown {
  min-width: 7rem;

  i {
    margin-right: 0px;
  }
}

.colors-menu-icons {
  margin-left: 1px;
  font-size: 18px;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background-color: #eaecef;
  }

  .dark-theme &:hover {
    background-color: #21262d;
  }
}

.project-notes-preview {
  font-size: 0.72rem;
  color: grey;
  margin: 0px 6px 4px 6px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .dark-theme & {
    color: #8b949e;
  }

  &:hover {
    text-decoration: underline;
  }
}

.project-notes-input {
  width: 100%;
  font-size: 0.75rem;
  border: 1px solid #eaecef;
  border-radius: 6px;
  padding: 4px 6px;
  margin-bottom: 4px;
  resize: vertical;
  min-height: 44px;

  .dark-theme & {
    background-color: #13171d;
    border-color: #30363d;
    color: #c9d1d9;
  }
}

.paper-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  padding: 1px 8px;
  font-size: 0.75rem;
  border: 1px solid rgba(128, 128, 128, 0.35);
  border-radius: 10px;
  background: transparent;
  color: inherit;
  opacity: 0.85;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }

  .paper-chip-bar {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(128, 128, 128, 0.25);
    overflow: hidden;

    span {
      display: block;
      height: 100%;
      background: #2ea043;
    }
  }
}

.folder-link-icon {
  font-size: 0.78rem;
  margin-left: 5px;
  opacity: 0.55;
  cursor: pointer;
  vertical-align: middle;

  &:hover {
    opacity: 1;
    color: var(--accent-color, #5e6ef2);
  }
}

.folder-path-input {
  width: 100%;
  font-size: 0.75rem;
  border: 1px solid #eaecef;
  border-radius: 6px;
  padding: 4px 6px;
  margin-bottom: 4px;

  .dark-theme & {
    background-color: #13171d;
    border-color: #30363d;
    color: #c9d1d9;
  }
}

/* Phased project view toggle: three mini-tabs that live in the header of a
   phased project card. The toggle sits inside the header so it is only
   visible when the project itself is open on screen, with no competing
   stat badges above it. */
.phased-view-toggle {
  display: inline-flex;
  gap: 4px;
  margin-top: 6px;
  background: rgba(140, 140, 140, 0.08);
  padding: 2px;
  border-radius: 5px;

  .dark-theme & {
    background: rgba(255, 255, 255, 0.04);
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    color: #5c5c5c;
    font-size: 0.72rem;
    padding: 3px 8px;
    border-radius: 3px;
    cursor: pointer;

    i {
      font-size: 0.78rem;
    }

    .dark-theme & {
      color: #c9d1d9;
    }

    &:hover {
      color: var(--accent-color, #5e6ef2);
    }

    &.active {
      background: #fff;
      color: var(--accent-color, #5e6ef2);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);

      .dark-theme & {
        background: #21262d;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
    }
  }
}
</style>