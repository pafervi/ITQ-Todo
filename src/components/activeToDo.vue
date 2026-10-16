<template>
  <div id="todo-item-active" class="todo-item" ref="currentTodo" draggable="true"
    @dragstart="startDrag($event, activeTodo.toDo, activeTodo.index)" @dragend="endDrag()" @wheel="movingWheel"
    :class="{ 'dragging': todoDragging }" @mouseleave="hideToDoItem">
    <div class="d-flex">
      <span class="noselect item-text" :class="{ 'checked-todo': activeTodo.toDo.checked }" style="flex-grow: 1"
        @click="checkTodoClickhandler" @click.middle="showToDoDetails">
        <span v-if="activeTodo.toDo.color != 'none'" class="cicle-icon" :style="'color: ' + activeTodo.toDo.color" :class="{
          'bi-check-circle-fill': activeTodo.toDo.checked,
          'bi-circle-fill': !activeTodo.toDo.checked,
        }" :title="$t('ui.focusModeHint')" @click="onCircleClick"></span>
        <span v-else class="cicle-icon"
          :class="{ 'bi-check-circle': activeTodo.toDo.checked, 'bi-circle': !activeTodo.toDo.checked, }"
          :title="$t('ui.focusModeHint')" @click="onCircleClick"></span>
        <span v-html="todoText"></span>
        <span class="time-details"> {{ timeFormat(activeTodo.toDo.time) }}
          <div class="alarm-indicator"
            :class="{ 'show-alarm-indicator': notificationIndicator && activeTodo.toDo.alarm }"></div>
        </span>
      </span>
      <!-- Three-dots menu: opens a dropdown with the snooze shortcuts, an
           arbitrary-day picker, a clear option, and the task-details entry. -->
      <i class="bi-pencil todo-item-edit" :title="$t('ui.renameTask')" @click.stop="editTask"></i>
      <span class="todo-item-menu-wrap" @click.stop>
        <i class="bi-three-dots todo-item-menu" type="button" @click="toggleActionsMenu"></i>
        <div v-if="actionsMenuOpen" class="actions-menu" @click.stop>
<button type="button" @click="snoozeTo('tomorrow')">
            <i class="bi-arrow-right"></i> {{ $t('todoDetails.snoozeTomorrow') || 'Tomorrow' }}
          </button>
          <button type="button" @click="snoozeTo('nextMonday')">
            <i class="bi-calendar2-event"></i> {{ $t('todoDetails.snoozeNextMonday') || 'Next Monday' }}
          </button>
          <button type="button" @click="snoozeTo('nextWeek')">
            <i class="bi-calendar3"></i> {{ $t('todoDetails.snoozeNextWeek') || 'Next week' }}
          </button>
          <label class="actions-pick-day">
            <i class="bi-calendar-plus"></i>
            <span>{{ $t('todoDetails.snoozePickDay') || 'Pick a day' }}</span>
            <input type="date" :value="pickerValue" @input="onPickDate" @click.stop />
          </label>
          <button v-if="hasSnooze" type="button" class="actions-clear" @click="snoozeTo('clear')">
            <i class="bi-x-lg"></i> {{ $t('todoDetails.snoozeClear') || 'Clear schedule' }}
          </button>
          <div class="actions-sep"></div>
          <button type="button" @click="openDetails">
            <i class="bi-pencil-square"></i> {{ $t('todoDetails.openDetails') || 'Open details' }}
          </button>
        </div>
      </span>
      <i class="bi-x todo-item-remove" @click="removeTodo"></i>
    </div>

    <div v-if="activeTodo.toDo.subTaskList && activeTodo.toDo.subTaskList.length > 0" class="todo-item-sub-tasks">
      <ul class="sub-tasks">
        <li v-for="(subTask, index) in activeTodo.toDo.subTaskList" :key="index" class="sub-task">
          <div class="d-flex flex-row mt-1" :class="{ 'checked-sub-task': subTask.checked }">
            <input class="form-check-input" type="checkbox" v-model="subTask.checked"
              @change="checkSubTask(subTask, index, $event)" />
            <label class="form-check-label" @click="checkSubTask(subTask, index, $event)">
              <span v-html="linkifyText(subTask.text)"></span>
            </label>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import toDoListRepository from "../repositories/toDoListRepository";
import { Modal, Toast } from "bootstrap";
import moment from "moment";
import notifications from "../helpers/notifications";
import linkifyStr from 'linkify-string';
import ClickHandler from "@manuelernestog/click-handler";
import tasksHelper from "../helpers/tasksHelper";

export default {
  components: {},
  props: {
    activeTodo: { required: true, type: Object }
  },
  data() {
    return {
      editing: false,
      todoDragHover: false,
      todoDragging: false,
      options: { target: '_blank', defaultProtocol: 'https' },
      clickhandler: new ClickHandler(),
      circleClickHandler: new ClickHandler(),
      scrollingTimeOut: null,
      actionsMenuOpen: false,
      actionsClickAwayHandler: null,
    };
  },
  methods: {
    onCircleClick: function (e) {
      e.stopPropagation();
      var id = this.activeTodo.toDoListId;
      var index = this.activeTodo.index;
      this.circleClickHandler.handle(
        () => { this.checkTodoDirect(); },
        () => { this.enterFocusMode(); },
        `circle-${id}${index}`
      );
    },
    checkTodoDirect: function () {
      this.$store.commit("checkTodo", { toDoListId: this.activeTodo.toDoListId, index: this.activeTodo.index, });
      this.checkToDo(this.activeTodo.toDoListId, this.activeTodo.index);
    },
    enterFocusMode: function () {
      this.$store.commit("setFocusTask", { toDo: this.activeTodo.toDo, toDoListId: this.activeTodo.toDoListId });
      this.hideToDoItem();
    },
    removeTodo: function () {
      this.$store.commit("setUndoElement", { type: 'task', todo: this.activeTodo.toDo, index: this.activeTodo.index });
      this.$store.commit("removeTodo", { toDoListId: this.activeTodo.toDoListId, index: this.activeTodo.index, });
      notifications.refreshDayNotifications(this, this.activeTodo.toDoListId);
      toDoListRepository.update(this.activeTodo.toDoListId, this.$store.getters.todoLists[this.activeTodo.toDoListId]);
      let toast = new Toast(document.getElementById("taskRemoved"));
      toast.show(); // The undo remove acction it's called in todoModal.vue:undoRemoveTask
      this.hideToDoItem();
    },
    showToDoDetails: function () {
      this.$store.commit("actionsSelectedTodoIdUpdate", {
        toDo: this.activeTodo.toDo,
        index: this.activeTodo.index,
      });

      let modal = new Modal(document.getElementById("toDoModal"), { keyboard: false });
      modal.show();
    },
    // Explicit rename: clicking the task text toggles it done (and moves it
    // to the bottom), which makes the double-click shortcut unreliable, so the
    // hover bar also offers a plain pencil button.
    editTask: function () {
      this.closeActionsMenu();
      if (this.activeTodo && this.activeTodo.edit) this.activeTodo.edit();
    },
    openDetails: function () {
      this.closeActionsMenu();
      this.showToDoDetails();
    },
    // --- Actions menu (three-dots) ---
    toggleActionsMenu: function (event) {
      if (event) event.stopPropagation();
      this.actionsMenuOpen = !this.actionsMenuOpen;
      if (this.actionsMenuOpen) {
        this.$nextTick(() => {
          this.actionsClickAwayHandler = () => this.closeActionsMenu();
          document.addEventListener("click", this.actionsClickAwayHandler, { once: true });
        });
      }
    },
    closeActionsMenu: function () {
      this.actionsMenuOpen = false;
      if (this.actionsClickAwayHandler) {
        document.removeEventListener("click", this.actionsClickAwayHandler);
        this.actionsClickAwayHandler = null;
      }
    },
    // --- Snooze: set/clear dueDate on the active task ---
    computeSnoozeTargetId: function (target) {
      let now = moment();
      if (target === "tomorrow") return now.add(1, "d").format("YYYYMMDD");
      if (target === "nextWeek") return now.add(7, "d").format("YYYYMMDD");
      if (target === "nextMonday") {
        let dow = now.isoWeekday();
        let delta = dow === 1 ? 7 : ((8 - dow) % 7);
        if (delta === 0) delta = 7;
        return now.add(delta, "d").format("YYYYMMDD");
      }
      return now.format("YYYYMMDD");
    },
    snoozeTo: function (target) {
      let hostListId = this.activeTodo.toDoListId;
      let host = this.$store.getters.todoLists[hostListId];
      if (!host || !host[this.activeTodo.index]) {
        this.closeActionsMenu();
        return;
      }
      let newDue = target === "clear" ? null : this.computeSnoozeTargetId(target);
      host[this.activeTodo.index].dueDate = newDue;
      toDoListRepository.update(hostListId, host);
      this.closeActionsMenu();
      this.hideToDoItem();
    },
    onPickDate: function (event) {
      // The native date input gives us YYYY-MM-DD; the app's listIds are
      // YYYYMMDD, so just strip dashes.
      let v = event && event.target && event.target.value;
      if (!v) return;
      let dueDate = v.replace(/-/g, "");
      let hostListId = this.activeTodo.toDoListId;
      let host = this.$store.getters.todoLists[hostListId];
      if (!host || !host[this.activeTodo.index]) {
        this.closeActionsMenu();
        return;
      }
      host[this.activeTodo.index].dueDate = dueDate;
      toDoListRepository.update(hostListId, host);
      this.closeActionsMenu();
      this.hideToDoItem();
    },
    checkTodoClickhandler: function (e) {
      if (e.target.href) return;

      this.$store.commit("checkTodo", { toDoListId: this.activeTodo.toDoListId, index: this.activeTodo.index, });
      var id = this.activeTodo.toDoListId;
      var index = this.activeTodo.index;
      this.clickhandler.handle(() => { this.checkToDo(id, index) }, this.activeTodo.edit, `${this.activeTodo.toDoListId}${this.activeTodo.index}`);
    },
    checkToDo: function (toDoListId, index) {
      // Checking a task always pushes it to the bottom so completed and
      // in-flight work never sit mixed together. Unchecking leaves the
      // row where it is so the user can bring it back without hunting.
      if (this.$store.getters.todoLists[toDoListId][index].checked) {
        this.$refs.currentTodo.style.display = `none`;
        this.$store.commit("moveTodoToEnd", { toDoListId: toDoListId, index: index, });
      }
      if (this.$store.getters.config.autoReorderTasks) {
        this.$refs.currentTodo.style.display = `none`;
        toDoListRepository.update(toDoListId, tasksHelper.reorderTasksList(this.$store.getters.todoLists[toDoListId]));
      } else {
        toDoListRepository.update(toDoListId, this.$store.getters.todoLists[toDoListId]);
      }
      notifications.refreshDayNotifications(this, this.activeTodo.toDoListId);
    },
    startDrag: function (event, item, index) {
      event.dataTransfer.dropEffect = "move";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("item", JSON.stringify(item));
      event.dataTransfer.setData("index", index);
      event.dataTransfer.setDragImage(this.activeTodo.container, 0, 0);
      setTimeout(() => {
        this.$refs.currentTodo.style.display = `none`;
        this.todoDragging = true;
      }, 40);
      document.getElementById("app-container").classList.add("dragging-item");
    },
    endDrag: function () {
      this.todoDragging = false;
      document.getElementById("app-container").classList.remove("dragging-item");
    },
    onDragenter: function () {
      this.todoDragHover = true;
    },
    onDragleave: function () {
      this.todoDragHover = false;
    },
    checkSubTask: function (subTask, index, e) {
      if (e.target.href) return;

      if (!e.target.value) subTask.checked = !subTask.checked;
      var todoList = this.activeTodo.toDo.subTaskList;
      if (subTask.checked && this.moveSubtaskToBotttom) { todoList.push(todoList.splice(index, 1)[0]); }
      toDoListRepository.update(this.activeTodo.toDoListId, this.$store.getters.todoLists[this.activeTodo.toDoListId]);
    },
    timeFormat: function (date) {
      if (date) {
        return moment(date, "HH:mm").format("hh:mm a");
      }
    },
    linkifyText: function (text) {
      return linkifyStr(text, this.options);
    },
    hideToDoItem: function () {
      this.$refs.currentTodo.style.display = `none`;
    },
    movingWheel() {
      this.$refs.currentTodo.style.display = `none`;
      this.$refs.currentTodo.classList.add("scrolling");
      document.getElementById("app-container").classList.add("scrolling");
      if (this.scrollingTimeOut != null) return;

      this.scrollingTimeOut = setTimeout(() => {
        this.scrollingTimeOut = null;
        document.onmousemove = function () {
          document.onmousemove = null;
          document.getElementById("todo-item-active").classList.remove("scrolling");
          document.getElementById("app-container").classList.remove("scrolling");
        }
      }, 400);
    }
  },
  computed: {
    todoText: function () {
      return linkifyStr(this.activeTodo.toDo.text, this.options);
    },
    notificationIndicator: function () {
      return this.$store.getters.config.notificationIndicator;
    },
    moveSubtaskToBotttom: function () {
      return this.$store.getters.config.moveCompletedSubTaskToBottom;
    },
    // Prefills the date picker with the current dueDate (so the user can
    // tweak it) or today otherwise.
    pickerValue: function () {
      let d = this.activeTodo.toDo.dueDate;
      if (d && /^\d{8}$/.test(d)) {
        return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8);
      }
      return moment().format("YYYY-MM-DD");
    },
    hasSnooze: function () {
      return !!this.activeTodo.toDo.dueDate;
    },
  }
};
</script>

<style scoped lang="scss">
.todo-item {
  background-color: #ffffff;
  color: #1e1e1e;
  border-radius: 7px;
  position: relative;
  box-shadow: 0px 2px 13px 0px rgba(0, 0, 0, 0.15);
  z-index: 6;
  position: absolute;
  display: none;

  &:hover {
    display: block;
  }

  * {
    transition: all 0.4s cubic-bezier(0.2, 1, 0.1, 1) 0s;
    pointer-events: all;
  }

  .dark-theme & {
    box-shadow: 0 0px 0 1px #4c4c4c;
    background-color: #21262d;
    color: #f7f7f7;
    box-shadow: 0px 2px 5px 0px rgba(0, 0, 0, 0.1);
  }

  .item-text {
    white-space: unset;
    word-break: normal;
    height: unset;
    overflow-wrap: break-word;
    word-wrap: break-word;
    z-index: 1;
  }
}

.todo-item.scrolling {
  display: none !important;
}

.item-text {
  transition: width 2s, height 2s, transform 2s;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  width: 1rem;
  height: 1.2rem;
  line-height: 1.3rem;
  font-size: 0.865rem;
  margin: 2px 0px 2px 0px;
  padding: 0 3px 0 7px;
}

.item-time {
  transition: width 2s, height 2s, transform 2s;
  height: 1.2rem;
  line-height: 1.3rem;
  font-size: 0.865rem;
  margin: 2px 0px 2px 0px;
  padding: 0 7px 0 0px;
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

.todo-item.checked-todo .time-details {
  opacity: unset;
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

.todo-item-remove {
  font-size: 1.3rem;
  cursor: pointer;
  margin-top: 1px;
  margin-left: 5px;
  margin-right: 5px;
  color: grey;
  height: 1.3rem;
  flex-grow: 0;
}

.todo-item-edit {
  font-size: 0.95rem;
  cursor: pointer;
  margin-top: 3px;
  margin-left: 5px;
  color: grey;
  height: 1.1rem;
  flex-grow: 0;
}

.todo-item-menu {
  font-size: 1rem;
  cursor: pointer;
  margin-top: 3px;
  margin-left: 5px;
  margin-right: 0px;
  color: grey;
  height: 1.1rem;
  flex-grow: 0;
}

.todo-item-remove:hover,
.todo-item-edit:hover,
.todo-item-menu:hover {
  color: black;
}

.dark-theme .todo-item-remove,
.dark-theme .todo-item-edit,
.dark-theme .todo-item-menu {
  color: #c9d1d9;
}

.dark-theme .todo-item-remove:hover,
.dark-theme .todo-item-edit:hover,
.dark-theme .todo-item-menu:hover {
  color: white;
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

.dragging.todo-item {
  display: none;
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

.bi-check-circle-fill,
.bi-check-circle {
  opacity: 0.7;
}

/* --- Three-dots actions menu --- */

.todo-item-menu-wrap {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
}

.actions-menu {
  position: absolute;
  top: 24px;
  right: 0;
  z-index: 30;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 190px;

  button, label.actions-pick-day {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: none;
    background: transparent;
    padding: 7px 10px;
    font-size: 0.82rem;
    text-align: left;
    border-radius: 6px;
    cursor: pointer;
    color: inherit;
    transition: background-color 0.12s ease;

    i {
      font-size: 1rem;
      opacity: 0.7;
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
}

.dark-theme .actions-menu {
  background-color: #1a1f26;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6);

  button:hover, label.actions-pick-day:hover {
    background-color: rgba(255, 255, 255, 0.07);
  }
}

/* The native date input sits inline inside the "Pick a day" row so clicking
   anywhere on the row opens the OS calendar picker. */
.actions-pick-day {
  position: relative;

  input[type="date"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
}

.actions-sep {
  height: 1px;
  background-color: rgba(0, 0, 0, 0.07);
  margin: 4px 2px;
}

.dark-theme .actions-sep {
  background-color: rgba(255, 255, 255, 0.08);
}

.actions-clear {
  color: #c6322f;

  i { opacity: 0.9; }
}

.dark-theme .actions-clear {
  color: #ff6b67;
}
</style>
