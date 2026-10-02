<template>
  <div class="item-drop-zone" @dragenter.self="onDragenter" @dragleave.self="onDragleave" @drop="onDragleave"
    :class="[{ 'drag-hover': todoDragHover, 'tag-filtered-out': tagFilterHidden }]">
    <div class="todo-item-container" :class="{ 'compact-view': compactView }" ref="itemContainer">
      <div v-if="!editing" class="inline-todo-item d-flex flex-column" @mouseenter="showToDoItem">
        <div class="d-flex align-items-center">
          <span class="noselect item-text" :class="{ 'checked-todo': toDo.checked, 'compact-view': compactView }"
            style="flex-grow: 1; min-width: 0">
            <span v-if="toDo.color != 'none'" class="cicle-icon" :style="'color: ' + toDo.color" :class="{
              'bi-check-circle-fill': toDo.checked,
              'bi-circle-fill': !toDo.checked,
              'just-checked': justChecked,
            }"></span>
            <span v-else class="cicle-icon"
              :class="{ 'bi-check-circle': toDo.checked, 'bi-circle': !toDo.checked, 'just-checked': justChecked }"></span>
            <i v-if="toDo.priority" class="bi-flag-fill priority-flag" :class="'priority-' + toDo.priority"
              :title="priorityLabel"></i>
            <span v-html="todoText"></span>
          </span>
          <!-- Deadline / calc-status chips live outside .item-text on purpose: in
               compact view that span truncates with an ellipsis, and anything
               nested inside it would get clipped away along with the overflow
               text instead of staying visible. -->
          <span v-if="deadlineStatus" class="deadline-chip mx-1 flex-shrink-0" :class="'deadline-' + deadlineStatus"
            :title="$t('todoDetails.deadline')">
            <i class="bi-calendar-check"></i>{{ deadlineLabel }}
          </span>
          <span v-if="toDo.calcStatus" class="calc-status-chip mx-1 flex-shrink-0" :style="{ color: calcStatusColor }"
            :title="calcStatusLabel">
            <i :class="calcStatusIcon"></i>
          </span>
          <span class="item-time flex-shrink-0" :class="{ 'checked-todo': toDo.checked, 'mx-2': !compactView }"> {{ timeFormat(toDo.time) }}
            <div class="alarm-indicator" :class="{ 'show-alarm-indicator': notificationIndicator && toDo.alarm }"></div>
          </span>
          <!-- A small dim moon badge sits on the row for tasks that have a
               dueDate set, so you can see at a glance which items are
               scheduled. The actual snooze controls live in the three-dots
               menu (activeToDo.vue). -->
          <i v-if="hasSnooze" class="bi-moon-fill snooze-badge flex-shrink-0"
             :title="$t('todoDetails.snooze') || 'Scheduled'"></i>
        </div>
        <div v-if="!compactView && ((toDo.tags && toDo.tags.length) || isReference || mentions.length)" class="tag-chips-row">
          <!-- Source project tag: shown only when this task is a dueDate
               reference rendered in a day cell (its real home is elsewhere).
               Click the tag to jump straight to the project. -->
          <span
            v-if="isReference && referenceProjectInfo"
            class="item-source-chip"
            :style="referenceProjectInfo.color ? { backgroundColor: referenceProjectInfo.color, color: '#fff' } : {}"
            :title="$t('todoDetails.scheduledFrom', [referenceProjectInfo.name]) || ('From ' + referenceProjectInfo.name)"
          >
            <i :class="referenceProjectInfo.isDay ? 'bi-calendar3' : 'bi-folder'"></i>
            {{ referenceProjectInfo.name }}
          </span>
          <!-- @person chips: avatar + name, deterministic colour per slug.
               Click opens the People view with this person preselected. -->
          <span
            v-for="m in mentions"
            :key="'p-' + m.slug"
            class="item-person-chip"
            :title="'@' + m.display"
            @click.stop="openPeople(m.slug)"
          >
            <span class="ipc-avatar" :style="{ backgroundColor: personColor(m.slug) }">{{ personInitials(m.slug) }}</span>
            {{ m.display }}
          </span>
          <span v-for="tag in (toDo.tags || [])" :key="tag" class="item-tag-chip" :style="{ backgroundColor: tagColor(tag) }">{{
            tag }}</span>
        </div>
        <div v-if="!compactView && hasSubtasks" class="subtask-toggle-row" @click.stop="subtasksExpanded = !subtasksExpanded">
          <i :class="subtasksExpanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
          <span>{{ subtaskProgress }}</span>
        </div>
        <ul v-if="!compactView && hasSubtasks && subtasksExpanded" class="inline-subtasks" @click.stop>
          <li v-for="(subTask, index) in toDo.subTaskList" :key="index" :class="{ 'checked-sub-task': subTask.checked }">
            <input type="checkbox" v-model="subTask.checked" @change="toggleSubtask" />
            <span>{{ subTask.text }}</span>
          </li>
        </ul>
      </div>
      <input v-show="editing" class="edit todo-input" type="text" v-model="text" ref="toDoEditInput" @blur="doneEdit()"
        @keyup.enter="doneEdit()" @keyup.esc="cancelEdit()" />
    </div>
  </div>
</template>

<script>
import toDoListRepository from "../repositories/toDoListRepository";
import moment from "moment";
import linkifyStr from 'linkify-string';
import tagHelper from "../helpers/tagHelper";
import calcStatusHelper from "../helpers/calcStatusHelper";
import peopleHelper from "../helpers/peopleHelper";
import { Modal } from 'bootstrap';

export default {
  components: {},
  props: {
    toDo: { required: true, type: Object },
    index: { required: true, type: Number },
    // Host list the task actually lives in.
    toDoListId: { required: true, type: String },
    // The list we are currently rendering in. Equal to toDoListId for normal
    // tasks; different when this task is only visible here as a dueDate
    // reference from another list.
    renderContext: { required: false, type: String, default: null },
  },
  data() {
    return {
      editing: false,
      text: this.toDo.text,
      todoDragHover: false,
      options: { target: '_blank', defaultProtocol: 'https' },
      subtasksExpanded: false,
      justChecked: false,
    };
  },
  watch: {
    'toDo.checked': function (newVal, oldVal) {
      if (newVal && !oldVal) {
        this.justChecked = true;
        setTimeout(() => {
          this.justChecked = false;
        }, 500);
      }
    },
  },
  methods: {
    toggleSubtask: function () {
      toDoListRepository.update(this.toDoListId, this.$store.getters.todoLists[this.toDoListId]);
    },
    editToDo: function () {
      this.text = this.toDo.text;
      this.editing = true;
      this.$nextTick(function () {
        this.$refs.toDoEditInput.focus();
        this.$refs.toDoEditInput.select();
      });
      document.getElementById("todo-item-active").style.display = 'none';
    },
    doneEdit: function () {
      this.editing = false;
      this.$store.commit("updateTodo", {
        toDoListId: this.toDoListId,
        index: this.index,
        text: this.text,
      });
      toDoListRepository.update(this.toDoListId, this.$store.getters.todoLists[this.toDoListId]);
    },
    cancelEdit: function () {
      this.text = this.toDo.text;
      this.editing = false;
    },
    onDragenter: function () {
      this.todoDragHover = true;
    },
    onDragleave: function () {
      this.todoDragHover = false;
    },
    timeFormat: function (date) {
      if (date) {
        return moment(date, "HH:mm").format("hh:mm a");
      }
    },
    tagColor: function (tag) {
      return tagHelper.colorForTag(tag);
    },
    personColor: function (slug) {
      return peopleHelper.colorFor(slug);
    },
    personInitials: function (slug) {
      return peopleHelper.initialsFor(slug);
    },
    openPeople: function () {
      let el = document.getElementById("peopleModal");
      if (el) Modal.getOrCreateInstance(el).show();
    },
    showToDoItem: function () {
      var activeTodo = {
        toDo: this.toDo,
        index: this.index,
        toDoListId: this.toDoListId,
        edit: this.editToDo,
        container: this.$refs.itemContainer
      };
      this.$store.commit('setActiveTodo', activeTodo);

      const activeTodoItem = document.getElementById("todo-item-active");
      this.$nextTick(function () {
        const bounding = this.$refs.itemContainer.getBoundingClientRect();
        activeTodoItem.style.width = `${bounding.width}px`;
        activeTodoItem.style.top = `${bounding.y}px`;
        activeTodoItem.style.left = `${bounding.x}px`;
        activeTodoItem.style.display = `block`;
        const margin_bottom = 10;
        var offset = parseInt(window.innerHeight) - (parseInt(bounding.y) + parseInt(activeTodoItem.offsetHeight)) - margin_bottom;
        if (offset < 0) activeTodoItem.style.top = `${bounding.y + offset}px`;
      });
    },
  },
  computed: {
    todoText: function () {
      return linkifyStr(this.toDo.text, this.options);
    },
    compactView: function () {
      return this.$store.getters.config.compactView;
    },
    notificationIndicator: function () {
      return this.$store.getters.config.notificationIndicator;
    },
    priorityLabel: function () {
      const labels = {
        1: this.$t('todoDetails.priorityLow'),
        2: this.$t('todoDetails.priorityMedium'),
        3: this.$t('todoDetails.priorityHigh'),
      };
      return labels[this.toDo.priority] || '';
    },
    deadlineStatus: function () {
      if (!this.toDo.deadline || this.toDo.checked) return null;
      var diff = moment(this.toDo.deadline, "YYYYMMDD").startOf('day').diff(moment().startOf('day'), 'days');
      if (diff < 0) return 'overdue';
      if (diff == 0) return 'today';
      if (diff <= 3) return 'soon';
      return 'later';
    },
    deadlineLabel: function () {
      if (!this.toDo.deadline) return '';
      return moment(this.toDo.deadline, "YYYYMMDD").format("DD/MM");
    },
    tagFilterHidden: function () {
      let activeTag = this.$store.getters.activeTagFilter;
      if (!activeTag) return false;
      return !(this.toDo.tags && this.toDo.tags.includes(activeTag));
    },
    // True when this task is being rendered somewhere other than its home
    // list (a dueDate reference). Drives the "from project X" chip.
    isReference: function () {
      return this.renderContext && this.renderContext !== this.toDoListId;
    },
    // Project name + color to label a dueDate reference. Empty when the host
    // is itself a day list or when the project is not loaded.
    referenceProjectInfo: function () {
      if (!this.isReference) return null;
      if (/^\d{8}$/.test(this.toDoListId)) {
        // Reference to another day — rare, label with the date.
        return { name: this.toDoListId, color: null, isDay: true };
      }
      let project = this.$store.getters.cTodoListIds.find(
        (l) => l.listId === this.toDoListId
      );
      if (!project) return { name: this.toDoListId, color: null };
      return { name: project.listName, color: project.color || null };
    },
    // Whether this task has a snooze (dueDate) set. Used to toggle the
    // "clear snooze" entry in the menu.
    hasSnooze: function () {
      return !!this.toDo.dueDate;
    },
    hasSubtasks: function () {
      return !!(this.toDo.subTaskList && this.toDo.subTaskList.length);
    },
    calcStatusColor: function () {
      return calcStatusHelper.colorFor(this.toDo.calcStatus);
    },
    calcStatusIcon: function () {
      return calcStatusHelper.iconFor(this.toDo.calcStatus);
    },
    calcStatusLabel: function () {
      let key = calcStatusHelper.labelKeyFor(this.toDo.calcStatus);
      return key ? this.$t(key) : "";
    },
    subtaskProgress: function () {
      if (!this.hasSubtasks) return '';
      let done = this.toDo.subTaskList.filter((s) => s.checked).length;
      return `${done}/${this.toDo.subTaskList.length}`;
    },
    // @person mentions extracted from the task text, deduped. Rendered as
    // avatar chips in the chip row.
    mentions: function () {
      return peopleHelper.mentionsIn(this.toDo.text);
    },
  }
};
</script>

<style scoped lang="scss">
.todo-item-container {
  border-bottom: 1px solid #eaecef;
  min-height: 26px;
  z-index: 1;

  .dark-theme & {
    border-bottom: 1px solid #30363d;
  }
}

.dragging-item .item-drop-zone * {
  pointer-events: none;
}

.todo-input {
  line-height: 1.3rem;
  width: 100%;
  border: none;
  font-size: 0.865rem;

  &:focus {
    outline: none;
  }
}

.item-text {
  transition: width 2s, height 2s, transform 2s;
  width: 1rem;
  min-height: 1.2rem;
  line-height: 1.3rem;
  font-size: 0.865rem;
  margin: 2px 0px 2px 0px;
  padding: 0 3px 0 7px;
}

.item-text.compact-view {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  height: 1.2rem;
}

.item-time {
  transition: width 2s, height 2s, transform 2s;
  height: 1.2rem;
  line-height: 1.3rem;
  font-size: 0.865rem;
  margin: 2px 0px 2px 0px;
  padding: 0 2px 0 0px;
  opacity: 0.6;
}

.item-time.checked-todo {
  opacity: unset;
}

.time-details {
  opacity: 0.6;
  display: inline;
  margin-left: 5px;
}

.checked-todo {
  color: #acacac;
  text-decoration: line-through;

  .dark-theme & {
    color: #636363;
  }
}

.checked-sub-task {
  color: #c4c4c4;
  text-decoration: line-through;

  .dark-theme & {
    color: #3a3a40;
  }

  input {
    opacity: 0.5;
  }
}

.drag-hover {
  color: rgba(157, 157, 157, 0.43);
  box-shadow: rgb(244, 243, 243) 0px 0px 4px 1px inset;
  background-color: rgb(250, 249, 249);
}

.dark-theme .drag-hover {
  color: rgb(69, 69, 69);
  box-shadow: #0b0d12 0px 0px 4px 1px inset;
  background-color: #0c0d14;
}

.sub-tasks {
  list-style: none;
  padding: 0px;
  font-size: 0.865rem;

  li {
    margin: 0px 10px 0px 10px;
  }

  li:last-child {
    margin: 0px 10px 10px 10px;
  }

  input {
    min-width: 14px;
    width: 14px;
    min-height: 14px;
    height: 14px;
    margin-right: 8px;
  }

  label {
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

.cicle-icon {
  font-size: 10px;
  margin-right: 5px;
}

.priority-flag {
  font-size: 9px;
  margin-right: 4px;
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

.deadline-chip {
  font-size: var(--fs-badge, 0.72rem);
  padding: 0px 4px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0.85;

  i {
    margin-right: 2px;
    font-size: 0.68rem;
  }
}

.deadline-chip.deadline-overdue {
  color: #ed544b;
  font-weight: 600;
}

.deadline-chip.deadline-today {
  color: #f97316;
  font-weight: 600;
}

.deadline-chip.deadline-soon {
  color: #6b7280;
}

.deadline-chip.deadline-later {
  color: #9ca3af;
}

.dark-theme .deadline-chip.deadline-soon,
.dark-theme .deadline-chip.deadline-later {
  color: #8b949e;
}

.calc-status-chip {
  font-size: var(--fs-badge, 0.72rem);

  i {
    animation: none;
  }
}

.tag-chips-row {
  padding: 0 3px 3px 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.item-tag-chip {
  font-size: var(--fs-badge, 0.72rem);
  color: white;
  padding: 0px 6px;
  border-radius: 8px;
  line-height: 1.3rem;
  opacity: 0.9;
}

/* @person chip: avatar + display name. Uses a deterministic hue per slug so
   the same person always wears the same colour across the whole app. */
.item-person-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-badge, 0.72rem);
  background-color: rgba(0, 0, 0, 0.05);
  color: inherit;
  padding: 1px 7px 1px 2px;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.09);
    transform: translateY(-1px);
  }

  .dark-theme & {
    background-color: rgba(94, 110, 242, 0.14);
    &:hover { background-color: rgba(94, 110, 242, 0.2); }
  }
}

.ipc-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  color: white;
  font-size: 0.56rem;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.bi-check-circle-fill,
.bi-check-circle {
  opacity: 0.7;
}

.todo-item-container.compact-view {
  height: 26px;
}

.tag-filtered-out {
  display: none;
}

.just-checked {
  animation: checkPulse 0.4s ease-out;
}

@keyframes checkPulse {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.6);
  }
  100% {
    transform: scale(1);
  }
}

.subtask-toggle-row {
  font-size: 0.7rem;
  color: grey;
  cursor: pointer;
  padding: 0px 3px 3px 24px;
  display: flex;
  align-items: center;
  gap: 3px;

  .dark-theme & {
    color: #8b949e;
  }

  &:hover {
    color: black;
  }

  .dark-theme &:hover {
    color: white;
  }

  i {
    font-size: 0.65rem;
  }
}

.inline-subtasks {
  list-style: none;
  margin: 0px;
  padding: 0px 6px 4px 30px;
  font-size: 0.78rem;

  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 1px 0px;
  }

  input {
    min-width: 13px;
    width: 13px;
    min-height: 13px;
    height: 13px;
  }
}

.inline-subtasks .checked-sub-task span {
  color: #c4c4c4;
  text-decoration: line-through;

  .dark-theme & {
    color: #3a3a40;
  }
}

/* --- Snooze badge (status only; actual controls live in activeToDo.vue) --- */

.snooze-badge {
  font-size: 0.85rem;
  margin-left: 4px;
  color: var(--accent-color, #5e6ef2);
  opacity: 0.85;
}

/* Chip rendered on a dueDate reference in a day cell to show where the task
   actually lives. Clicking inside the task opens the real task modal. */
.item-source-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-badge, 0.72rem);
  padding: 1px 8px;
  border-radius: 10px;
  background-color: #eef0f3;
  color: #3c3c3c;
  margin-right: 4px;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.2s ease,
              filter 0.2s ease;

  i {
    font-size: 0.9rem;
  }

  &:hover {
    transform: scale(1.07);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    filter: brightness(1.08);
  }

  .dark-theme & {
    background-color: #21262d;
    color: #c9d1d9;
  }
}
</style>
