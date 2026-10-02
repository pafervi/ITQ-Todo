<template>
  <div class="modal fade spotlight-modal" id="searchModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog spotlight-dialog">
      <div class="modal-content spotlight-content">
        <div class="modal-header d-flex align-items-center">
          <div class="search-input-container flex-grow-1">
            <i :class="modeIcon"></i>
            <input
              type="text"
              class="search-input"
              :placeholder="placeholder"
              v-model="query"
              ref="searchInput"
              autocomplete="off"
              @keydown="onInputKeydown"
            />
            <span v-if="modeChip" class="mode-chip" :class="'mode-chip-' + mode">{{ modeChip }}</span>
          </div>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body" ref="paletteBody">
          <!-- Quick-actions: only on the empty default-mode palette. The ">"
               and "+" modes replace this with their own result stream. -->
          <div v-if="mode === 'search' && !query && !activeTags.length" class="quick-actions">
            <button class="quick-action-btn" type="button" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#missionControlModal">
              <i class="bi-speedometer2"></i> <span>{{ $t('ui.missionControl') }}</span><kbd class="qa-kbd">G</kbd>
            </button>
            <button class="quick-action-btn" type="button" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#deadlinesModal">
              <i class="bi-calendar-check"></i> <span>{{ $t('ui.deadlines') }}</span><kbd class="qa-kbd">D</kbd>
            </button>
            <button class="quick-action-btn" type="button" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#newListTemplateModal">
              <i class="bi-clipboard-plus"></i> <span>{{ $t('ui.newCustomList') }}</span><kbd class="qa-kbd">N</kbd>
            </button>
            <button class="quick-action-btn" type="button" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#shortcutsModal">
              <i class="bi-keyboard"></i> <span>{{ $t('ui.shortcuts') }}</span><kbd class="qa-kbd">K</kbd>
            </button>
            <button class="quick-action-btn" type="button" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#weeklySummaryModal">
              <i class="bi-calendar-week"></i> <span>{{ $t('ui.weeklySummary') }}</span><kbd class="qa-kbd">W</kbd>
            </button>
            <button class="quick-action-btn" type="button" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#dailySummaryModal">
              <i class="bi-moon-stars"></i> <span>{{ $t('ui.dailySummary') }}</span><kbd class="qa-kbd">M</kbd>
            </button>
            <button class="quick-action-btn" type="button" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#deadlineRadarModal">
              <i class="bi-bullseye"></i> <span>{{ $t('ui.deadlineRadar') }}</span><kbd class="qa-kbd">R</kbd>
            </button>
            <button class="quick-action-btn" type="button" @click="toggleTodayOnlyMode">
              <i class="bi-calendar2"></i> <span>{{ todayOnlyMode ? ($t('ui.switchToWeek') || 'Switch to week') : ($t('ui.switchToToday') || 'Switch to today') }}</span><kbd class="qa-kbd">V</kbd>
            </button>
            <button class="quick-action-btn" type="button" @click="toggleTheme">
              <i class="bi-moon-stars"></i> <span>{{ $t('settings.darkTheme') }}</span><kbd class="qa-kbd">T</kbd>
            </button>
          </div>

          <!-- Scope hints only in search mode -->
          <div v-if="mode === 'search' && allTags.length" class="tag-filter-row">
            <span
              v-for="tag in allTags"
              :key="tag"
              class="tag-filter-chip"
              :class="{ active: activeTags.includes(tag) }"
              :style="activeTags.includes(tag) ? { backgroundColor: tagColor(tag), color: 'white' } : {}"
              @click="toggleTag(tag)"
            >{{ tag }}</span>
          </div>

          <div v-if="mode === 'search' && allCalcStatuses.length" class="tag-filter-row">
            <span
              v-for="status in allCalcStatuses"
              :key="status"
              class="tag-filter-chip"
              :class="{ active: activeCalcStatuses.includes(status) }"
              :style="activeCalcStatuses.includes(status) ? { backgroundColor: calcStatusColor(status), color: 'white' } : {}"
              @click="toggleCalcStatus(status)"
            ><i :class="calcStatusIcon(status)"></i> {{ calcStatusLabel(status) }}</span>
          </div>

          <div v-if="mode === 'search' && allKinds.length" class="tag-filter-row">
            <span
              v-for="kind in allKinds"
              :key="kind"
              class="tag-filter-chip"
              :class="{ active: activeKinds.includes(kind) }"
              @click="toggleKind(kind)"
            >{{ kindLabel(kind) }}</span>
          </div>

          <!-- Command mode: an action list, keyboard-navigable with up/down + enter. -->
          <ul v-if="mode === 'command'" class="command-list">
            <li
              v-for="(cmd, i) in filteredCommands"
              :key="cmd.id"
              class="command-row"
              :class="{ selected: i === selectedIndex }"
              @mouseenter="selectedIndex = i"
              @click="runCommand(cmd)"
            >
              <i :class="cmd.icon" class="command-icon"></i>
              <div class="command-text">
                <div class="command-title">{{ cmd.title }}</div>
                <div v-if="cmd.hint" class="command-hint">{{ cmd.hint }}</div>
              </div>
              <kbd v-if="i === selectedIndex" class="qa-kbd">↵</kbd>
            </li>
            <li v-if="!filteredCommands.length" class="command-empty">
              <i class="bi-slash-circle"></i>
              <span>{{ $t('ui.noCommandsMatch') || 'No command matches' }}</span>
            </li>
          </ul>

          <!-- Add mode: live preview of the parsed task before enter -->
          <div v-if="mode === 'add'" class="add-preview">
            <div class="add-preview-headline">
              <i class="bi-plus-lg"></i>
              <span class="add-preview-title">{{ addPreview.text || ($t('ui.addTaskPlaceholder') || 'Type a task...') }}</span>
            </div>
            <div v-if="addPreview.text" class="add-preview-meta">
              <span class="add-chip add-chip-list">
                <i class="bi-folder2"></i>
                {{ listLabel(addPreview.listId) }}
              </span>
              <span v-if="addPreview.deadline" class="add-chip add-chip-deadline">
                <i class="bi-calendar-event"></i>
                {{ addPreview.deadlineLabel }}
              </span>
              <span v-if="addPreview.time" class="add-chip add-chip-time">
                <i class="bi-clock"></i>
                {{ addPreview.time }}
              </span>
              <span v-for="t in addPreview.tags" :key="t" class="add-chip add-chip-tag" :style="{ backgroundColor: tagColor(t), color: 'white' }">
                #{{ t }}
              </span>
              <span v-if="addPreview.priority" class="add-chip add-chip-priority" :class="'priority-' + addPreview.priority">
                <i class="bi-flag-fill"></i> P{{ addPreview.priority }}
              </span>
            </div>
            <div class="add-preview-hint">{{ $t('ui.addTaskHint') || 'tomorrow, 10am, #tag, !1/!2/!3, @project' }}</div>
          </div>

          <!-- Default search mode: tasks table -->
          <table class="table table-hover" v-if="mode === 'search' && filteredTasks.length">
            <tbody>
              <tr v-for="(task, i) in filteredTasks" :key="task.listId + '-' + task.index"
                :class="{ selected: i === selectedIndex }"
                @mouseenter="selectedIndex = i"
                @click="openTask(task)">
                <td class="search-task-check">
                  <i :class="task.checked ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                </td>
                <td class="search-task-text" :class="{ 'checked-todo': task.checked }">
                  <i v-if="task.priority" class="bi-flag-fill priority-flag" :class="'priority-' + task.priority"></i>
                  {{ task.text }}
                  <span v-for="tag in task.tags" :key="tag" class="mini-tag-chip" :style="{ backgroundColor: tagColor(tag) }">{{ tag }}</span>
                </td>
                <td class="search-list-label">{{ listLabel(task.listId) }}</td>
              </tr>
            </tbody>
          </table>

          <p v-if="mode === 'search' && !loading && query && !filteredTasks.length" class="no-results-text">{{ $t("ui.noSearchResults") }}</p>

          <div class="palette-foot">
            <span class="palette-foot-hint"><kbd class="qa-kbd">&gt;</kbd> commands</span>
            <span class="palette-foot-hint"><kbd class="qa-kbd">+</kbd> add task</span>
            <span class="palette-foot-hint"><kbd class="qa-kbd">↑↓</kbd> navigate</span>
            <span class="palette-foot-hint"><kbd class="qa-kbd">↵</kbd> run</span>
            <span class="palette-foot-hint"><kbd class="qa-kbd">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from "bootstrap";
import moment from "moment";
import searchHelper from "../helpers/searchHelper";
import tagHelper from "../helpers/tagHelper";
import calcStatusHelper from "../helpers/calcStatusHelper";
import configRepository from "../repositories/configRepository";
import toDoListRepository from "../repositories/toDoListRepository";
import notifications from "../helpers/notifications";
import autoTagHelper from "../helpers/autoTagHelper";

// Natural-language-ish parser for the "+ add" mode. Supports:
//   #tag           → tags
//   !1 !2 !3       → priority (1 = low, 3 = urgent)
//   @project       → send to a project list by (fuzzy) name
//   today / tomorrow / mon..sun / "22/11" / "22-11" → deadline
//   10am / 14:30   → time (24h or 12h)
// Everything else becomes the task text. Order is free.
function parseTaskInput(raw, projects) {
  let text = String(raw || "");
  let tags = [];
  let priority = 0;
  let projectName = null;
  let deadline = null;
  let deadlineLabel = null;
  let time = null;

  // Priority: !1 !2 !3
  text = text.replace(/(^|\s)!([123])(?=\s|$)/g, (m, pre, p) => {
    priority = Math.max(priority, parseInt(p, 10));
    return pre;
  });

  // Tags: #foo
  text = text.replace(/(^|\s)#([^\s#]+)/g, (m, pre, tag) => {
    if (tag && !tags.includes(tag)) tags.push(tag);
    return pre;
  });

  // Project: @name (fuzzy match against project list)
  text = text.replace(/(^|\s)@([^\s@]+)/g, (m, pre, name) => {
    projectName = name.toLowerCase();
    return pre;
  });

  // Time: 10am | 10:30am | 14:30 | 14h30. Only accept as a time if there's
  // either an explicit am/pm or a ":" / "h" separator — a bare integer is
  // too ambiguous and reads as text.
  let timeM = text.match(/(^|\s)(\d{1,2})([:h])(\d{2})\s*(am|pm)?(?=\s|$)/i)
    || text.match(/(^|\s)(\d{1,2})()()(am|pm)(?=\s|$)/i);
  if (timeM) {
    let hh = parseInt(timeM[2], 10);
    let mm = timeM[4] ? parseInt(timeM[4], 10) : 0;
    let ampm = (timeM[5] || "").toLowerCase();
    if (!isNaN(hh) && hh <= 23 && mm <= 59) {
      if (ampm === "pm" && hh < 12) hh += 12;
      if (ampm === "am" && hh === 12) hh = 0;
      time = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
      text = text.replace(timeM[0], " ");
    }
  }

  // Deadline keywords
  let today = moment();
  let dateMap = {
    today: today.clone(),
    tomorrow: today.clone().add(1, "day"),
    mon: today.clone().isoWeekday(today.isoWeekday() >= 1 ? 8 : 1),
    tue: today.clone().isoWeekday(today.isoWeekday() >= 2 ? 9 : 2),
    wed: today.clone().isoWeekday(today.isoWeekday() >= 3 ? 10 : 3),
    thu: today.clone().isoWeekday(today.isoWeekday() >= 4 ? 11 : 4),
    fri: today.clone().isoWeekday(today.isoWeekday() >= 5 ? 12 : 5),
    sat: today.clone().isoWeekday(today.isoWeekday() >= 6 ? 13 : 6),
    sun: today.clone().isoWeekday(today.isoWeekday() >= 7 ? 14 : 7),
  };
  for (let kw in dateMap) {
    let re = new RegExp("(^|\\s)" + kw + "(?=\\s|$)", "i");
    if (re.test(text)) {
      let d = dateMap[kw];
      deadline = d.format("YYYYMMDD");
      deadlineLabel = d.format("ddd D MMM");
      text = text.replace(re, " ");
      break;
    }
  }
  // DD/MM or DD-MM
  if (!deadline) {
    let dm = text.match(/(^|\s)(\d{1,2})[/-](\d{1,2})(?=\s|$)/);
    if (dm) {
      let d = parseInt(dm[2], 10);
      let m = parseInt(dm[3], 10) - 1;
      let candidate = moment({ year: today.year(), month: m, day: d });
      if (candidate.isBefore(today, "day")) candidate.add(1, "year");
      deadline = candidate.format("YYYYMMDD");
      deadlineLabel = candidate.format("ddd D MMM");
      text = text.replace(dm[0], " ");
    }
  }

  // Resolve project: fuzzy prefix match against listNames.
  let listId = null;
  if (projectName && projects && projects.length) {
    let match = projects.find((p) => (p.listName || "").toLowerCase().startsWith(projectName));
    if (!match) match = projects.find((p) => (p.listName || "").toLowerCase().includes(projectName));
    if (match) listId = match.listId;
  }
  // Default: today's day list, unless a deadline moved it elsewhere.
  if (!listId) listId = deadline || today.format("YYYYMMDD");

  return {
    text: text.replace(/\s+/g, " ").trim(),
    tags: tags,
    priority: priority,
    deadline: deadline,
    deadlineLabel: deadlineLabel,
    time: time,
    listId: listId,
  };
}

export default {
  name: "searchModal",
  data() {
    return {
      tasks: [],
      loading: false,
      query: "",
      activeTags: [],
      activeCalcStatuses: [],
      activeKinds: [],
      selectedIndex: 0,
    };
  },
  mounted() {
    document.getElementById("searchModal").addEventListener("show.bs.modal", this.loadTasks);
    document.getElementById("searchModal").addEventListener("shown.bs.modal", this.focusInput);
    document.getElementById("searchModal").addEventListener("keydown", this.onPaletteKeydown);
  },
  unmounted() {
    document.getElementById("searchModal").removeEventListener("show.bs.modal", this.loadTasks);
    document.getElementById("searchModal").removeEventListener("shown.bs.modal", this.focusInput);
    document.getElementById("searchModal").removeEventListener("keydown", this.onPaletteKeydown);
  },
  methods: {
    loadTasks: function () {
      this.loading = true;
      this.query = "";
      this.activeTags = [];
      this.activeCalcStatuses = [];
      this.activeKinds = [];
      this.selectedIndex = 0;
      searchHelper.getAllTasks().then((tasks) => {
        this.tasks = tasks;
        this.loading = false;
      });
    },
    focusInput: function () {
      this.$refs.searchInput.focus();
    },
    toggleTag: function (tag) {
      let idx = this.activeTags.indexOf(tag);
      if (idx === -1) this.activeTags.push(tag);
      else this.activeTags.splice(idx, 1);
    },
    toggleCalcStatus: function (status) {
      let idx = this.activeCalcStatuses.indexOf(status);
      if (idx === -1) this.activeCalcStatuses.push(status);
      else this.activeCalcStatuses.splice(idx, 1);
    },
    toggleKind: function (kind) {
      let idx = this.activeKinds.indexOf(kind);
      if (idx === -1) this.activeKinds.push(kind);
      else this.activeKinds.splice(idx, 1);
    },
    tagColor: function (tag) {
      return tagHelper.colorForTag(tag);
    },
    calcStatusColor: function (status) {
      return calcStatusHelper.colorFor(status);
    },
    calcStatusIcon: function (status) {
      return calcStatusHelper.iconFor(status);
    },
    calcStatusLabel: function (status) {
      let key = calcStatusHelper.labelKeyFor(status);
      return key ? this.$t(key) : status;
    },
    kindLabel: function (kind) {
      return kind === "meeting" ? this.$t("ui.templateMeeting") : this.$t("ui.templateActiveLearning");
    },
    listKindFor: function (listId) {
      let found = this.$store.getters.cTodoListIds.find((l) => l.listId == listId);
      return found ? found.kind || "" : "";
    },
    listLabel: function (listId) {
      if (moment(listId, "YYYYMMDD", true).isValid()) {
        return moment(listId, "YYYYMMDD").locale(this.language).format("ddd D MMM");
      }
      let found = this.$store.getters.cTodoListIds.find((l) => l.listId == listId);
      return found ? found.listName : listId;
    },
    toggleTheme: function () {
      let val = !this.$store.getters.config.darkTheme;
      this.$store.commit("updateConfig", { val: val, key: "darkTheme" });
      configRepository.update(this.$store.getters.config);
    },
    toggleTodayOnlyMode: function () {
      let val = !(this.$store.getters.config.todayOnlyMode !== false);
      this.$store.commit("updateConfig", { val: val, key: "todayOnlyMode" });
      configRepository.update(this.$store.getters.config);
      this.hidePalette();
    },
    hidePalette: function () {
      Modal.getOrCreateInstance(document.getElementById("searchModal")).hide();
    },
    openModal: function (id) {
      this.hidePalette();
      setTimeout(() => {
        let el = document.getElementById(id);
        if (el) new Modal(el).show();
      }, 150);
    },
    // Keystroke handling at the input level: arrow nav + enter run.
    onInputKeydown: function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, Math.max(this.resultCount - 1, 0));
        this.scrollSelectedIntoView();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.scrollSelectedIntoView();
      } else if (event.key === "Enter") {
        event.preventDefault();
        this.runSelected();
      }
    },
    scrollSelectedIntoView: function () {
      this.$nextTick(() => {
        let el = this.$refs.paletteBody && this.$refs.paletteBody.querySelector(".selected");
        if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
      });
    },
    runSelected: function () {
      if (this.mode === "command") {
        let cmd = this.filteredCommands[this.selectedIndex];
        if (cmd) this.runCommand(cmd);
      } else if (this.mode === "add") {
        this.confirmAdd();
      } else {
        let task = this.filteredTasks[this.selectedIndex];
        if (task) this.openTask(task);
      }
    },
    runCommand: function (cmd) {
      if (cmd.openModal) {
        this.openModal(cmd.openModal);
      } else if (typeof cmd.run === "function") {
        cmd.run.call(this);
      }
    },
    // ---- Command actions (feature 1) ----
    cmdToggleTheme: function () { this.toggleTheme(); },
    cmdToggleTodayOnly: function () { this.toggleTodayOnlyMode(); },
    cmdRolloverOverdue: function () {
      // Walks every day list older than today, finds unchecked tasks, moves
      // them to today's list in one commit. Does not touch tasks that live
      // in custom projects.
      let today = moment().format("YYYYMMDD");
      let all = this.$store.getters.todoLists || {};
      let keys = Object.keys(all).filter((k) => /^\d{8}$/.test(k) && k < today);
      keys.forEach((k) => {
        let list = all[k] || [];
        let keep = [];
        list.forEach((t) => {
          if (t && !t.checked) {
            t.listId = today;
            this.$store.commit("addTodo", t);
          } else {
            keep.push(t);
          }
        });
        // Overwrite the source day with the kept (checked) items only.
        toDoListRepository.update(k, keep);
      });
      toDoListRepository.update(today, this.$store.getters.todoLists[today]);
      notifications.refreshDayNotifications(this, today);
      this.hidePalette();
    },
    cmdCheckAllToday: function () {
      let today = moment().format("YYYYMMDD");
      this.$store.commit("checkAllItems", today);
      toDoListRepository.update(today, this.$store.getters.todoLists[today]);
      notifications.refreshDayNotifications(this, today);
      this.hidePalette();
    },
    cmdEndOfDay: function () { this.openModal("dailySummaryModal"); },
    cmdWeeklyReview: function () { this.openModal("weeklySummaryModal"); },
    cmdMissionControl: function () { this.openModal("missionControlModal"); },
    cmdDeadlines: function () { this.openModal("deadlinesModal"); },
    cmdNewProject: function () { this.openModal("newListTemplateModal"); },
    cmdOpenSettings: function () { this.openModal("configModal"); },
    confirmAdd: function () {
      // Parse inline so we're never racing a computed update: Enter fires on
      // keydown, Vue flushes v-model + computed after the event dispatch,
      // and a stale this.addPreview would silently drop the task.
      let parsed = parseTaskInput(this.stripped, this.$store.getters.cTodoListIds || []);
      if (!parsed.text) return;
      let newTodo = {
        text: parsed.text,
        checked: false,
        listId: parsed.listId,
        desc: "",
        subTaskList: [],
        color: "none",
        priority: parsed.priority || 0,
        tags: parsed.tags.length ? parsed.tags : autoTagHelper.tagsFor(parsed.text, []),
        deadline: parsed.deadline || null,
        time: parsed.time || null,
        alarm: false,
        repeatingEvent: null,
      };
      // addTodo mutation self-heals a missing array (see todolist.store.js),
      // so no dispatch-first dance is needed. Keep the write side-effects in
      // the exact order toDoList.vue uses: commit → repository → notify.
      this.$store.commit("addTodo", newTodo);
      toDoListRepository.update(parsed.listId, this.$store.getters.todoLists[parsed.listId]);
      try { notifications.refreshDayNotifications(this, parsed.listId); } catch (e) { /* notifications are best-effort */ }
      this.hidePalette();
    },
    // Single-letter shortcuts on the empty default-mode palette. Letters
    // still flow into the input when there's a query.
    onPaletteKeydown: function (event) {
      // Fallback Enter in command/add modes: if focus ever drifts off the
      // input (e.g. after hovering a command row and clicking back), the
      // input's @keydown doesn't fire. Catch it at the modal level so Enter
      // always runs the selected action.
      if (event.key === "Enter" && (this.mode === "command" || this.mode === "add")) {
        if (event.target && event.target.classList && event.target.classList.contains("search-input")) {
          // Already handled by onInputKeydown — don't double-fire.
          return;
        }
        event.preventDefault();
        this.runSelected();
        return;
      }
      if (this.mode !== "search" || this.query || this.activeTags.length) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      let key = (event.key || "").toUpperCase();
      let targets = {
        G: "missionControlModal",
        D: "deadlinesModal",
        N: "newListTemplateModal",
        K: "shortcutsModal",
        W: "weeklySummaryModal",
        M: "dailySummaryModal",
        R: "deadlineRadarModal",
      };
      if (targets[key]) {
        event.preventDefault();
        this.openModal(targets[key]);
        return;
      }
      if (key === "V") {
        event.preventDefault();
        this.toggleTodayOnlyMode();
      } else if (key === "T") {
        event.preventDefault();
        this.toggleTheme();
      }
    },
    openTask: function (task) {
      this.$store.dispatch("loadTodoLists", task.listId).then(() => {
        let todoList = this.$store.getters.todoLists[task.listId];
        let todo = todoList ? todoList[task.index] : null;
        if (!todo) return;
        this.$store.commit("actionsSelectedTodoIdUpdate", { toDo: todo, index: task.index });
        this.hidePalette();
        let modal = new Modal(document.getElementById("toDoModal"), { keyboard: false });
        modal.show();
      });
    },
  },
  computed: {
    todayOnlyMode: function () {
      return this.$store.getters.config.todayOnlyMode !== false;
    },
    language: function () {
      return this.$store.getters.config.language;
    },
    // ---- Mode detection: the first character of the query flips the
    // palette into command (`>`) or add (`+`) modes. Everything else is
    // search. ----
    mode: function () {
      let q = this.query;
      if (q.startsWith(">")) return "command";
      if (q.startsWith("+")) return "add";
      return "search";
    },
    modeIcon: function () {
      if (this.mode === "command") return "ph ph-terminal-window";
      if (this.mode === "add") return "ph ph-plus-circle";
      return "ph ph-magnifying-glass";
    },
    modeChip: function () {
      if (this.mode === "command") return this.$t('ui.commandMode') || "command";
      if (this.mode === "add") return this.$t('ui.addMode') || "new task";
      return "";
    },
    placeholder: function () {
      if (this.mode === "command") return this.$t('ui.commandPlaceholder') || "> command, or type to filter";
      if (this.mode === "add") return this.$t('ui.addPlaceholder') || "+ task tomorrow 10am #tag !1 @project";
      return this.$t('ui.searchPlaceholder');
    },
    // Trimmed query without the mode prefix.
    stripped: function () {
      if (this.mode === "search") return this.query;
      return this.query.slice(1).trim();
    },
    allTags: function () {
      let set = new Set();
      this.tasks.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
      return Array.from(set).sort();
    },
    allCalcStatuses: function () {
      let set = new Set();
      this.tasks.forEach((t) => {
        if (t.calcStatus) set.add(t.calcStatus);
      });
      let order = calcStatusHelper.list.map((s) => s.key);
      return order.filter((key) => set.has(key));
    },
    allKinds: function () {
      let set = new Set();
      this.tasks.forEach((t) => {
        let kind = this.listKindFor(t.listId);
        if (kind === "meeting" || kind === "activelearning") set.add(kind);
      });
      return Array.from(set);
    },
    filteredTasks: function () {
      if (this.mode !== "search") return [];
      let q = this.query.trim().toLowerCase();
      return this.tasks
        .filter((t) => !t.checked)
        .filter((t) => (q ? t.text && t.text.toLowerCase().includes(q) : true))
        .filter((t) => (this.activeTags.length ? this.activeTags.every((tag) => t.tags.includes(tag)) : true))
        .filter((t) => (this.activeCalcStatuses.length ? this.activeCalcStatuses.includes(t.calcStatus) : true))
        .filter((t) => (this.activeKinds.length ? this.activeKinds.includes(this.listKindFor(t.listId)) : true))
        .slice(0, 200);
    },
    // ---- Command catalog: shown in command mode, filtered by the query
    // after the ">" prefix. Each command has an id, title, hint, icon,
    // and either openModal (modal id to open) or run (handler). ----
    allCommands: function () {
      let darkOn = this.$store.getters.config.darkTheme;
      let todayView = this.todayOnlyMode;
      return [
        { id: "today",      title: "Jump to today",        hint: "Switch to today view",     icon: "bi-sun",            run: function () { if (!todayView) this.cmdToggleTodayOnly(); else this.hidePalette(); } },
        { id: "week",       title: "Switch to week view",  hint: "See the full week grid",   icon: "bi-calendar3-week", run: this.cmdToggleTodayOnly, hidden: !todayView },
        { id: "rollover",   title: "Rollover overdue → today", hint: "Move every unchecked task from past days", icon: "bi-arrow-return-left", run: this.cmdRolloverOverdue },
        { id: "checkall",   title: "Check all tasks today", hint: "Close the day in one click", icon: "bi-check2-all",    run: this.cmdCheckAllToday },
        { id: "endday",     title: "End of day summary",   hint: "Open the daily recap",     icon: "bi-moon-stars",    run: this.cmdEndOfDay },
        { id: "weekly",     title: "Weekly review",        hint: "Open this week's summary", icon: "bi-calendar-week", run: this.cmdWeeklyReview },
        { id: "mission",    title: "Mission control",      hint: "Overview dashboard",       icon: "bi-speedometer2",  run: this.cmdMissionControl },
        { id: "deadlines",  title: "Deadlines",            hint: "Everything with a due date", icon: "bi-calendar-check", run: this.cmdDeadlines },
        { id: "radar",      title: "Deadline radar",       hint: "What's hot in the next weeks", icon: "bi-bullseye",      run: function () { this.openModal("deadlineRadarModal"); } },
        { id: "newproject", title: "New project",          hint: "Create a custom list",     icon: "bi-folder-plus",   run: this.cmdNewProject },
        { id: "settings",   title: "Settings",             hint: "Open preferences",         icon: "bi-gear",          run: this.cmdOpenSettings },
        { id: "shortcuts",  title: "Shortcuts",            hint: "Keyboard reference",       icon: "bi-keyboard",      run: function () { this.openModal("shortcutsModal"); } },
        { id: "dark",       title: darkOn ? "Switch to light theme" : "Switch to dark theme", hint: "Toggle colour theme", icon: "bi-circle-half", run: this.cmdToggleTheme },
      ];
    },
    filteredCommands: function () {
      if (this.mode !== "command") return [];
      let q = this.stripped.toLowerCase();
      let list = this.allCommands.filter((c) => !c.hidden);
      if (!q) return list;
      return list.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.hint && c.hint.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q)
      );
    },
    addPreview: function () {
      if (this.mode !== "add") return { text: "", tags: [], priority: 0, listId: null };
      return parseTaskInput(this.stripped, this.$store.getters.cTodoListIds || []);
    },
    resultCount: function () {
      if (this.mode === "command") return this.filteredCommands.length;
      if (this.mode === "add") return 1;
      return this.filteredTasks.length;
    },
  },
  watch: {
    query: function () { this.selectedIndex = 0; },
    activeTags: function () { this.selectedIndex = 0; },
    activeCalcStatuses: function () { this.selectedIndex = 0; },
    activeKinds: function () { this.selectedIndex = 0; },
  },
};
</script>

<style scoped lang="scss">
/* Spotlight-style: anchored near the top of the viewport instead of
   vertically centered, a single borderless surface (no visible seam
   between the search field and the results), heavier blur than an
   ordinary modal so it reads as its own floating command layer. */
.spotlight-dialog {
  max-width: 640px;
  margin: 11vh auto 0 auto;
}

.modal-content.spotlight-content {
  border-radius: 14px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 16px 46px rgba(0, 0, 0, 0.22), 0 2px 10px rgba(0, 0, 0, 0.12);
  background-color: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(34px) saturate(180%);
  -webkit-backdrop-filter: blur(34px) saturate(180%);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .spotlight-content {
    background-color: #fcfcfc;
  }
}

.dark-theme .spotlight-content {
  background-color: rgba(18, 26, 51, 0.86);
  border: 1px solid rgba(94, 110, 242, 0.18);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .dark-theme .spotlight-content {
    background-color: #121a33;
  }
}

.spotlight-modal .modal-header {
  padding: 16px 18px 12px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.dark-theme .spotlight-modal .modal-header {
  border-bottom-color: rgba(94, 110, 242, 0.18);
}

.search-input-container {
  display: flex;
  align-items: center;
  gap: 10px;

  > i {
    font-size: 1.25rem;
    color: grey;
    flex-shrink: 0;
  }
}

.search-input {
  border: none;
  outline: unset;
  font-size: 1.15rem;
  width: 100%;
  padding: 4px 2px;
  background-color: unset;

  .dark-theme & {
    background-color: unset;
    color: #d7dcee;
  }
}

/* Mode indicator chip at the right of the input. */
.mode-chip {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.mode-chip-command {
  background: color-mix(in srgb, var(--accent-color, #5e6ef2) 15%, transparent);
  color: var(--accent-color, #5e6ef2);
}

.mode-chip-add {
  background: color-mix(in srgb, #2dbd6e 18%, transparent);
  color: #15803d;
}

.dark-theme .mode-chip-add {
  color: #4ade80;
}

.modal-body {
  max-height: 520px;
  overflow: auto;
  margin-bottom: 4px;
  padding-top: 10px;
}

.tag-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 4px 14px 4px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 4px 16px 4px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background-color: #eaecef;
  color: #3c3c3c;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.82rem;
  cursor: pointer;

  .dark-theme & {
    background-color: rgba(94, 110, 242, 0.12);
    color: #d7dcee;
  }

  &:hover { filter: brightness(0.95); }

  i { font-size: 0.9rem; }
}

/* ---- Command list ---- */
.command-list {
  list-style: none;
  padding: 2px 0 8px 0;
  margin: 0;
}

.command-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.command-row.selected {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 10%, transparent);
}

.dark-theme .command-row.selected {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 20%, transparent);
}

.command-icon {
  font-size: 1rem;
  color: var(--accent-color, #5e6ef2);
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.command-text {
  flex: 1 1 auto;
  min-width: 0;
}

.command-title {
  font-size: 0.9rem;
  font-weight: 500;
}

.command-hint {
  font-size: 0.75rem;
  color: grey;
  margin-top: 1px;

  .dark-theme & { color: #8b94b8; }
}

.command-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 10px;
  color: grey;
  font-size: 0.85rem;
}

/* ---- Add-mode preview card ---- */
.add-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px 14px 12px;
  margin: 2px 0 8px 0;
  border-radius: 10px;
  background: color-mix(in srgb, #2dbd6e 7%, transparent);
}

.dark-theme .add-preview {
  background: color-mix(in srgb, #2dbd6e 10%, transparent);
}

.add-preview-headline {
  display: flex;
  align-items: center;
  gap: 10px;

  > i {
    font-size: 1.1rem;
    color: #15803d;
  }
}

.dark-theme .add-preview-headline > i {
  color: #4ade80;
}

.add-preview-title {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: 1.1rem;
  font-weight: 400;
  font-variation-settings: "opsz" 48, "wght" 460;
  letter-spacing: -0.01em;
}

.add-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.add-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.06);
  color: #3c3c3c;

  i { font-size: 0.75rem; }

  .dark-theme & {
    background: rgba(94, 110, 242, 0.14);
    color: #c8cfe8;
  }
}

.add-chip.add-chip-priority.priority-1 { color: #5e6ef2; background: rgba(94, 110, 242, 0.12); }
.add-chip.add-chip-priority.priority-2 { color: #d97706; background: rgba(249, 115, 22, 0.14); }
.add-chip.add-chip-priority.priority-3 { color: #b91c1c; background: rgba(237, 84, 75, 0.14); }

.add-preview-hint {
  font-size: 0.7rem;
  color: grey;
  font-style: italic;

  .dark-theme & { color: #6b7599; }
}

/* ---- Palette footer (keybind legend) ---- */
.palette-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 10px 4px 2px 4px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  margin-top: 6px;
}

.dark-theme .palette-foot {
  border-top-color: rgba(94, 110, 242, 0.14);
}

.palette-foot-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: grey;

  .dark-theme & { color: #8b94b8; }
}

/* Small badge after each quick action, showing the keyboard shortcut that
   triggers it when the palette is open with no query. */
.qa-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.3rem;
  height: 1.3rem;
  padding: 0 5px;
  margin-left: 4px;
  background: rgba(0, 0, 0, 0.08);
  color: #525864;
  border-radius: 5px;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: inherit;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.1);
}

.dark-theme .qa-kbd {
  background: rgba(94, 110, 242, 0.14);
  color: #c8cfe8;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
}

.tag-filter-chip {
  font-size: 0.78rem;
  padding: 2px 10px;
  border-radius: 12px;
  cursor: pointer;
  background-color: #eaecef;
  color: #3c3c3c;

  .dark-theme & {
    background-color: #121a33;
    color: #c8cfe8;
    border: 1px solid rgba(94, 110, 242, 0.14);
  }
}

.tag-filter-chip.active {
  font-weight: 600;
}

.table {
  --bs-table-hover-bg: #f4f4f4;
  color: #212529;
  margin-bottom: 0px;
}

.dark-theme .table {
  --bs-table-bg: transparent;
  --bs-table-hover-bg: rgba(94, 110, 242, 0.1);
  --bs-table-hover-color: #eef1ff;
  color: #d7dcee;
  border-color: rgba(94, 110, 242, 0.14);
}

.table tr { cursor: pointer; }

.table tr.selected {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 10%, transparent);
}

.search-task-check {
  width: 26px;
  color: grey;
}

.search-task-text.checked-todo {
  text-decoration: line-through;
  opacity: 0.6;
}

.search-list-label {
  color: grey;
  font-size: 0.85rem;
  white-space: nowrap;

  .dark-theme & { color: #8b94b8; }
}

.mini-tag-chip {
  display: inline-block;
  color: white;
  font-size: 0.68rem;
  padding: 0px 6px;
  border-radius: 8px;
  margin-left: 5px;
}

.priority-flag {
  font-size: 9px;
  margin-right: 5px;
  vertical-align: middle;
}

.priority-flag.priority-1 { color: #5e6ef2; }
.priority-flag.priority-2 { color: #f97316; }
.priority-flag.priority-3 { color: #ed544b; }

.no-results-text {
  text-align: center;
  color: grey;
  padding: 30px 0px;
}
</style>
