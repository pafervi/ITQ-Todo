<template>
  <div class="modal fade spotlight-modal" id="searchModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog spotlight-dialog">
      <div class="modal-content spotlight-content">
        <div class="modal-header d-flex align-items-center">
          <div class="search-input-container flex-grow-1">
            <i class="ph ph-magnifying-glass"></i>
            <input
              type="text"
              class="search-input"
              :placeholder="$t('ui.searchPlaceholder')"
              v-model="query"
              ref="searchInput"
              autocomplete="off"
            />
          </div>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div v-if="!query && !activeTags.length" class="quick-actions">
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

          <div v-if="allTags.length" class="tag-filter-row">
            <span
              v-for="tag in allTags"
              :key="tag"
              class="tag-filter-chip"
              :class="{ active: activeTags.includes(tag) }"
              :style="activeTags.includes(tag) ? { backgroundColor: tagColor(tag), color: 'white' } : {}"
              @click="toggleTag(tag)"
            >{{ tag }}</span>
          </div>

          <div v-if="allCalcStatuses.length" class="tag-filter-row">
            <span
              v-for="status in allCalcStatuses"
              :key="status"
              class="tag-filter-chip"
              :class="{ active: activeCalcStatuses.includes(status) }"
              :style="activeCalcStatuses.includes(status) ? { backgroundColor: calcStatusColor(status), color: 'white' } : {}"
              @click="toggleCalcStatus(status)"
            ><i :class="calcStatusIcon(status)"></i> {{ calcStatusLabel(status) }}</span>
          </div>

          <div v-if="allKinds.length" class="tag-filter-row">
            <span
              v-for="kind in allKinds"
              :key="kind"
              class="tag-filter-chip"
              :class="{ active: activeKinds.includes(kind) }"
              @click="toggleKind(kind)"
            >{{ kindLabel(kind) }}</span>
          </div>

          <table class="table table-hover" v-if="filteredTasks.length">
            <tbody>
              <tr v-for="task in filteredTasks" :key="task.listId + '-' + task.index" @click="openTask(task)">
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

          <p v-if="!loading && !filteredTasks.length" class="no-results-text">{{ $t("ui.noSearchResults") }}</p>
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
      if (idx === -1) {
        this.activeTags.push(tag);
      } else {
        this.activeTags.splice(idx, 1);
      }
    },
    toggleCalcStatus: function (status) {
      let idx = this.activeCalcStatuses.indexOf(status);
      if (idx === -1) {
        this.activeCalcStatuses.push(status);
      } else {
        this.activeCalcStatuses.splice(idx, 1);
      }
    },
    toggleKind: function (kind) {
      let idx = this.activeKinds.indexOf(kind);
      if (idx === -1) {
        this.activeKinds.push(kind);
      } else {
        this.activeKinds.splice(idx, 1);
      }
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
        return moment(listId, "YYYYMMDD").locale(this.language).format("LL");
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
      Modal.getOrCreateInstance(document.getElementById("searchModal")).hide();
    },
    // Single-letter shortcuts on the empty palette. We only react when the
    // user hasn't started typing a query, so letters still flow into the
    // search field normally.
    onPaletteKeydown: function (event) {
      if (this.query || this.activeTags.length) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      let key = (event.key || "").toUpperCase();
      let targets = {
        G: "#missionControlModal",
        D: "#deadlinesModal",
        N: "#newListTemplateModal",
        K: "#shortcutsModal",
        W: "#weeklySummaryModal",
        M: "#dailySummaryModal",
        R: "#deadlineRadarModal",
      };
      if (targets[key]) {
        event.preventDefault();
        Modal.getOrCreateInstance(document.getElementById("searchModal")).hide();
        setTimeout(() => {
          let el = document.querySelector(targets[key]);
          if (el) new Modal(el).show();
        }, 150);
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
        Modal.getOrCreateInstance(document.getElementById("searchModal")).hide();
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
      let q = this.query.trim().toLowerCase();
      return this.tasks
        .filter((t) => !t.checked)
        .filter((t) => (q ? t.text && t.text.toLowerCase().includes(q) : true))
        .filter((t) => (this.activeTags.length ? this.activeTags.every((tag) => t.tags.includes(tag)) : true))
        .filter((t) => (this.activeCalcStatuses.length ? this.activeCalcStatuses.includes(t.calcStatus) : true))
        .filter((t) => (this.activeKinds.length ? this.activeKinds.includes(this.listKindFor(t.listId)) : true))
        .slice(0, 200);
    },
  },
};
</script>

<style scoped lang="scss">
/* Spotlight-style: anchored near the top of the viewport instead of
   vertically centered, a single borderless surface (no visible seam
   between the search field and the results), heavier blur than an
   ordinary modal so it reads as its own floating command layer. */
.spotlight-dialog {
  max-width: 620px;
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
  background-color: rgba(30, 34, 41, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .dark-theme .spotlight-content {
    background-color: #21262d;
  }
}

.spotlight-modal .modal-header {
  padding: 16px 18px 12px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.dark-theme .spotlight-modal .modal-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.search-input-container {
  display: flex;
  align-items: center;
  gap: 10px;

  i {
    font-size: 1.25rem;
    color: grey;
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
  }
}

.modal-body {
  max-height: 500px;
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
    background-color: #21262d;
    color: #c9d1d9;
  }

  &:hover {
    filter: brightness(0.95);
  }

  i {
    font-size: 0.9rem;
  }
}

/* Small single-letter badge after each quick action, showing the keyboard
   shortcut that triggers it when the palette is open with no query. */
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
  background: rgba(255, 255, 255, 0.08);
  color: #c9d1d9;
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
    background-color: #21262d;
    color: #c9d1d9;
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
  --bs-table-bg: #21262d;
  --bs-table-hover-bg: #323539;
  --bs-table-hover-color: #fff;
  color: #fff;
  border-color: #373b3e;
}

.table tr {
  cursor: pointer;
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

  .dark-theme & {
    color: #babbbe;
  }
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

.priority-flag.priority-1 {
  color: #5e6ef2;
}

.priority-flag.priority-2 {
  color: #f97316;
}

.priority-flag.priority-3 {
  color: #ed544b;
}

.no-results-text {
  text-align: center;
  color: grey;
  padding: 30px 0px;
}
</style>
