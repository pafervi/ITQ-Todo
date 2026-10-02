<template>
  <div :id="'list' + id" class="to-do-list-container d-flex flex-column" ref="listContainer" :class="{
    'old-date': !customTodoList && moments(id).isBefore(Date(), 'day'),
    'has-accent-color': listColor || customTodoList,
    'kind-meeting': listKind === 'meeting',
    'kind-activelearning': listKind === 'activelearning',
  }" :style="containerStyle">
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
      viewBox="0 0 100 100"
      :aria-label="projectFramework.fullName"
    >
      <polygon
        :points="projectFramework.polygonPoints"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <polygon
        :points="projectFramework.polygonPoints"
        fill="currentColor"
        fill-opacity="0.1"
      />
    </svg>
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
import zeoliteHelper from "../helpers/zeoliteHelper";

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
      return zeoliteHelper.frameworkFor(this.id);
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
  opacity: 0.42;
  transform: rotate(6deg) scale(1.06);
}

.dark-theme .to-do-list-container:hover .project-cover {
  opacity: 0.6;
}

/* On meeting / activelearning variants the slot is already taken by the
   kind-watermark icon; the v-if in the template handles that, but keep
   this guard too in case either is toggled dynamically. */
.kind-meeting .project-cover,
.kind-activelearning .project-cover {
  display: none;
}
</style>
