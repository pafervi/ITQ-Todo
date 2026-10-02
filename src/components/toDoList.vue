<template>
  <div :id="'list' + id" class="to-do-list-container d-flex flex-column" ref="listContainer" :class="{
    'old-date': !customTodoList && moments(id).isBefore(Date(), 'day'),
    'has-accent-color': listColor || customTodoList,
    'kind-meeting': listKind === 'meeting',
    'kind-activelearning': listKind === 'activelearning',
  }" :style="containerStyle">
    <i v-if="listKind === 'meeting'" class="bi-people-fill kind-watermark" aria-hidden="true"></i>
    <i v-if="listKind === 'activelearning'" class="bi-cpu-fill kind-watermark" aria-hidden="true"></i>
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
      :collapsed="collapsed" @toggle-collapse="toggleCollapse" @force-collapse="forceCollapse">
    </list-header>
    <transition name="fade-collapse">
      <div v-if="!collapsed && toDoListState && toDoListState.length === 0" class="empty-list-placeholder">
        <i :class="customTodoList ? 'bi-inbox' : 'bi-emoji-smile'"></i>
        <span>{{ customTodoList ? $t('ui.emptyListPlaceholder') : $t('ui.emptyListPlaceholderToday') }}</span>
      </div>
    </transition>
    <transition name="fade-collapse">
      <div v-if="!collapsed && allDone" class="all-done-banner">
        <i class="bi-check2-circle"></i>
        <span>{{ $t('ui.allTasksDone') }}</span>
        <span v-if="celebrate" class="confetti-burst" aria-hidden="true">
          <span v-for="n in 10" :key="n" class="confetti-dot" :class="'confetti-' + n"></span>
        </span>
      </div>
    </transition>
    <transition name="fade-collapse">
      <ul class="to-do-list" v-show="!collapsed">
        <li v-for="entry in toDoListEntries" :key="entry.hostListId + '-' + entry.trueIndex">
          <div class="drop-zone" @drop="onDrop($event, entry.hostListId, entry.trueIndex)" @dragover.prevent @dragenter.prevent>
            <to-do-item :to-do="entry.toDo" :index="entry.trueIndex" :to-do-list-id="entry.hostListId" :render-context="id"></to-do-item>
          </div>
        </li>
      </ul>
    </transition>
    <transition name="fade-collapse">
      <div v-show="!collapsed" class="fake-drop-zone flex-grow-1 margin-bottom-2" @drop="onDropAtEnd($event, id)"
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

export default {
  components: {
    listHeader,
    toDoItem,
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
  },
  unmounted() {
    window.removeEventListener("resize", this.setTodoListHeight);
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
    allDone: function () {
      return !!(this.toDoListState && this.toDoListState.length > 0 && this.toDoListState.every((t) => t.checked));
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

/* ---- Tiny celebration when the last task of the day gets checked ---- */

.confetti-burst {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.confetti-dot {
  position: absolute;
  left: 0;
  top: 0;
  width: 5px;
  height: 5px;
  border-radius: 1px;
  background: var(--accent-color, #5e6ef2);
  opacity: 0;
  animation: confettiPop 0.95s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
}

$confetti-colors: #5e6ef2, #f97316, #2dbd6e, #ed56a1, #06b6d4;
// Pre-computed (x, y) offsets for 10 dots spread evenly around a circle
// (radius 34px, 36deg apart) - avoids relying on CSS trig() functions.
$confetti-offsets: (27.5px, 20px), (10.5px, 32.3px), (-10.5px, 32.3px), (-27.5px, 20px), (-34px, 0px),
  (-27.5px, -20px), (-10.5px, -32.3px), (10.5px, -32.3px), (27.5px, -20px), (34px, 0px);

@for $i from 1 through 10 {
  .confetti-#{$i} {
    $offset: nth($confetti-offsets, $i);
    --confetti-x: #{nth($offset, 1)};
    --confetti-y: #{nth($offset, 2)};
    background: nth($confetti-colors, ($i - 1) % 5 + 1);
    animation-delay: #{$i * 0.012}s;
  }
}

@keyframes confettiPop {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--confetti-x), var(--confetti-y)) scale(0.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .confetti-dot {
    animation: none !important;
    opacity: 0 !important;
  }
}
</style>
