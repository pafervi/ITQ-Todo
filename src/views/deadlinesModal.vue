<template>
  <div class="modal fade" id="deadlinesModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ $t("ui.deadlines") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div v-if="overdueTasks.length" class="deadline-section">
            <h6 class="deadline-section-title overdue-title">{{ $t("todoDetails.overdue") }}</h6>
            <table class="table table-hover">
              <tbody>
                <tr v-for="task in overdueTasks" :key="task.listId + '-' + task.index" @click="openTask(task)">
                  <td class="deadline-task-text">
                    <i v-if="task.priority" class="bi-flag-fill priority-flag" :class="'priority-' + task.priority"></i>
                    {{ task.text }}
                  </td>
                  <td class="deadline-list-label">{{ listLabel(task.listId) }}</td>
                  <td class="deadline-date overdue-date">{{ formatDeadline(task.deadline) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="todayTasks.length" class="deadline-section">
            <h6 class="deadline-section-title today-title">{{ $t("todoDetails.today") }}</h6>
            <table class="table table-hover">
              <tbody>
                <tr v-for="task in todayTasks" :key="task.listId + '-' + task.index" @click="openTask(task)">
                  <td class="deadline-task-text">
                    <i v-if="task.priority" class="bi-flag-fill priority-flag" :class="'priority-' + task.priority"></i>
                    {{ task.text }}
                  </td>
                  <td class="deadline-list-label">{{ listLabel(task.listId) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="upcomingTasks.length" class="deadline-section">
            <h6 class="deadline-section-title">{{ $t("todoDetails.upcoming") }}</h6>
            <table class="table table-hover">
              <tbody>
                <tr v-for="task in upcomingTasks" :key="task.listId + '-' + task.index" @click="openTask(task)">
                  <td class="deadline-task-text">
                    <i v-if="task.priority" class="bi-flag-fill priority-flag" :class="'priority-' + task.priority"></i>
                    {{ task.text }}
                  </td>
                  <td class="deadline-list-label">{{ listLabel(task.listId) }}</td>
                  <td class="deadline-date">{{ formatDeadline(task.deadline) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-if="!loading && !hasTasks" class="no-deadlines-text">{{ $t("todoDetails.noDeadlines") }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from "bootstrap";
import moment from "moment";
import deadlinesHelper from "../helpers/deadlinesHelper";

export default {
  name: "deadlinesModal",
  data() {
    return {
      tasks: [],
      loading: false,
    };
  },
  mounted() {
    document.getElementById("deadlinesModal").addEventListener("show.bs.modal", this.loadTasks);
  },
  unmounted() {
    document.getElementById("deadlinesModal").removeEventListener("show.bs.modal", this.loadTasks);
  },
  methods: {
    loadTasks: function () {
      this.loading = true;
      deadlinesHelper.getTasksWithDeadline().then((tasks) => {
        this.tasks = tasks;
        this.loading = false;
      });
    },
    listLabel: function (listId) {
      if (moment(listId, "YYYYMMDD", true).isValid()) {
        return moment(listId, "YYYYMMDD").locale(this.language).format("LL");
      }
      let found = this.$store.getters.cTodoListIds.find((l) => l.listId == listId);
      return found ? found.listName : listId;
    },
    formatDeadline: function (deadline) {
      return moment(deadline, "YYYYMMDD").locale(this.language).format("LL");
    },
    openTask: function (task) {
      this.$store.dispatch("loadTodoLists", task.listId).then(() => {
        let todoList = this.$store.getters.todoLists[task.listId];
        let todo = todoList ? todoList[task.index] : null;
        if (!todo || !todo.deadline) return;
        this.$store.commit("actionsSelectedTodoIdUpdate", { toDo: todo, index: task.index });
        Modal.getOrCreateInstance(document.getElementById("deadlinesModal")).hide();
        let modal = new Modal(document.getElementById("toDoModal"), { keyboard: false });
        modal.show();
      });
    },
  },
  computed: {
    language: function () {
      return this.$store.getters.config.language;
    },
    today: function () {
      return moment().format("YYYYMMDD");
    },
    overdueTasks: function () {
      return this.tasks.filter((t) => t.deadline < this.today);
    },
    todayTasks: function () {
      return this.tasks.filter((t) => t.deadline == this.today);
    },
    upcomingTasks: function () {
      return this.tasks.filter((t) => t.deadline > this.today);
    },
    hasTasks: function () {
      return this.tasks.length > 0;
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 700px;
}

.modal-body {
  max-height: 500px;
  overflow: auto;
  margin-bottom: 10px;
}

.deadline-section {
  margin-bottom: 18px;
}

.deadline-section-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: grey;
  margin-bottom: 4px;
  padding-left: 4px;
}

.deadline-section-title.overdue-title {
  color: #ed544b;
}

.deadline-section-title.today-title {
  color: #f97316;
}

/* Bootstrap 5's table reset applies --bs-table-color to every cell, which
   on a dark background renders dark text that only becomes legible on
   hover (when --bs-table-hover-color kicks in). Force the per-cell colour
   to white in dark mode so the task names stay readable at rest, and
   match the hover colour so there is no "pop" when the mouse enters. */
.table {
  --bs-table-hover-bg: #f4f4f4;
  --bs-table-color: #212529;
  --bs-table-color-state: #212529;
  color: #212529;
  margin-bottom: 0px;
}

.dark-theme .table {
  --bs-table-bg: #21262d;
  --bs-table-hover-bg: #323539;
  --bs-table-hover-color: #fff;
  --bs-table-color: #fff;
  --bs-table-color-state: #fff;
  color: #fff;
  border-color: #373b3e;
}

.table tr {
  cursor: pointer;
}

.table td {
  color: #212529;
}

.dark-theme .table td {
  color: #fff;
}

.deadline-task-text {
  width: 55%;
  font-weight: 500;
  color: #212529;

  .dark-theme & {
    color: #fff;
  }
}

.deadline-list-label {
  color: grey;
  font-size: 0.85rem;

  .dark-theme & {
    color: #cdd3d8;
  }
}

.deadline-date {
  font-size: 0.85rem;
  text-align: right;
  white-space: nowrap;
}

.deadline-date.overdue-date {
  color: #ed544b;
  font-weight: 600;
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

.no-deadlines-text {
  text-align: center;
  color: grey;
  padding: 30px 0px;
}
</style>
