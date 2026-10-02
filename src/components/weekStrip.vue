<template>
  <div class="week-strip">
    <span
      v-for="day in days"
      :key="day.id"
      class="week-strip-day"
      :class="{ active: day.id === selectedDate, 'is-today': day.isToday, 'is-weekend': day.isWeekend, 'drop-hover': dragHoverId === day.id }"
      @click="$emit('select-date', day.id)"
      @dragover.prevent
      @dragenter.prevent="dragHoverId = day.id"
      @dragleave="onDragLeave(day.id)"
      @drop="onDrop($event, day.id)"
    >
      <span class="week-strip-weekday">{{ day.weekday }}</span>
      <span class="week-strip-daynum">{{ day.dayNum }}</span>
      <span v-if="deadlineCounts[day.id]" class="week-strip-dot"></span>
    </span>
  </div>
</template>

<script>
import moment from "moment";
import deadlinesHelper from "../helpers/deadlinesHelper";
import toDoListRepository from "../repositories/toDoListRepository";
import notifications from "../helpers/notifications";

export default {
  name: "weekStrip",
  props: {
    selectedDate: { required: false, type: String },
  },
  emits: ["select-date"],
  data() {
    return {
      allDeadlineTasks: [],
      dragHoverId: null,
    };
  },
  mounted() {
    this.loadDeadlineTasks();
  },
  methods: {
    loadDeadlineTasks: function () {
      deadlinesHelper.getTasksWithDeadline().then((tasks) => {
        this.allDeadlineTasks = tasks;
      });
    },
    onDragLeave: function (id) {
      if (this.dragHoverId === id) this.dragHoverId = null;
    },
    onDrop: function (event, targetId) {
      this.dragHoverId = null;
      let itemRaw = event.dataTransfer.getData("item");
      if (!itemRaw) return;
      let toDo = JSON.parse(itemRaw);
      let index = event.dataTransfer.getData("index");
      let originId = toDo.listId;
      if (originId === targetId) return;
      this.$store.commit("removeTodo", { toDoListId: originId, index: index });
      toDoListRepository.update(originId, this.$store.getters.todoLists[originId]);
      notifications.refreshDayNotifications(this, originId);
      this.$store.dispatch("loadTodoLists", targetId).then(() => {
        toDo.listId = targetId;
        toDo.repeatingEvent = null;
        this.$store.commit("addTodo", toDo);
        toDoListRepository.update(targetId, this.$store.getters.todoLists[targetId]);
        notifications.refreshDayNotifications(this, targetId);
      });
    },
  },
  computed: {
    language: function () {
      return this.$store.getters.config.language;
    },
    activeTagFilter: function () {
      return this.$store.getters.activeTagFilter;
    },
    deadlineCounts: function () {
      let tasks = this.activeTagFilter
        ? this.allDeadlineTasks.filter((t) => t.tags && t.tags.includes(this.activeTagFilter))
        : this.allDeadlineTasks;
      let counts = {};
      tasks.forEach((t) => {
        counts[t.deadline] = (counts[t.deadline] || 0) + 1;
      });
      return counts;
    },
    days: function () {
      let today = moment().format("YYYYMMDD");
      let out = [];
      for (let i = 0; i < 7; i++) {
        let m = moment().add(i, "d");
        let id = m.format("YYYYMMDD");
        let weekday = m.day();
        out.push({
          id: id,
          weekday: m.locale(this.language).format("dd"),
          dayNum: m.format("D"),
          isToday: id === today,
          isWeekend: weekday === 0 || weekday === 6,
        });
      }
      return out;
    },
  },
};
</script>

<style scoped lang="scss">
.week-strip {
  display: flex;
  gap: 6px;
  padding: 10px 20px 10px 20px;
  margin-top: 4px;
  margin-bottom: 0px;
  flex-wrap: wrap;
}

.week-strip-day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 42px;
  padding: 4px 0px;
  border-radius: 8px;
  cursor: pointer;
  background-color: #f4f4f5;
  color: #3c3c3c;

  .dark-theme & {
    background-color: #121a33;
    color: #c8cfe8;
  }

  &:hover {
    background-color: #eaecef;
  }

  .dark-theme &:hover {
    background-color: #1a2447;
  }
}

.week-strip-day.is-today {
  font-weight: 600;
}

.week-strip-day.is-weekend {
  background-color: #f0eef9;

  .dark-theme & {
    background-color: #171f3d;
  }
}

.week-strip-day.active {
  background-color: var(--accent-color, #5e6ef2);
  color: white;
}

.week-strip-weekday {
  font-size: 0.62rem;
  text-transform: uppercase;
  opacity: 0.7;
}

.week-strip-daynum {
  font-size: 0.9rem;
}

.week-strip-dot {
  position: absolute;
  top: 3px;
  right: 5px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #ed544b;
}

.week-strip-day.active .week-strip-dot {
  background-color: white;
}

.week-strip-day.drop-hover {
  outline: 2px dashed var(--accent-color, #5e6ef2);
  outline-offset: 1px;
}
</style>
