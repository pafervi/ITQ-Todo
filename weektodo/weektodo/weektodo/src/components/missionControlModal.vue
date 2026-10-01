<template>
  <div class="modal fade" id="missionControlModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="ph ph-gauge"></i> {{ $t("ui.missionControl") }}</h5>
          <button type="button" class="mc-daily-link" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#deadlineRadarModal">
            <i class="ph ph-target"></i> {{ $t("ui.deadlineRadar") }}
          </button>
          <button type="button" class="mc-weekly-link" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#dailySummaryModal">
            <i class="ph ph-moon-stars"></i> {{ $t("ui.dailySummary") }}
          </button>
          <button type="button" class="mc-weekly-link" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#weeklySummaryModal">
            <i class="bi-calendar-week"></i> {{ $t("ui.weeklySummary") }}
          </button>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div class="mc-loading" v-if="loading">
            <svg class="orbital-spinner" viewBox="0 0 40 40" width="34" height="34" role="status" aria-hidden="true">
              <circle class="orbital-nucleus" cx="20" cy="20" r="3"></circle>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5"></ellipse>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(60 20 20)"></ellipse>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(120 20 20)"></ellipse>
            </svg>
          </div>
          <div class="mc-grid" v-else>
            <div class="mc-section mc-today">
              <h6><i class="ph ph-calendar-blank"></i> {{ $t("ui.mcToday") }}</h6>
              <ul class="mc-list" v-if="todayTasks.length">
                <li v-for="(t, i) in todayTasks" :key="'today' + i">{{ t.text }}</li>
              </ul>
              <p class="mc-empty" v-else>{{ $t("ui.mcTodayEmpty") }}</p>
            </div>

            <div class="mc-section mc-calc" :class="{ 'mc-hero': hasFailedJobs }">
              <h6><i class="ph ph-cpu"></i> {{ $t("ui.mcCalcJobs") }}</h6>
              <div class="mc-calc-filters" v-if="calcJobs.length">
                <span class="mc-filter-chip" :class="{ active: !calcStatusFilter }" @click="calcStatusFilter = null">{{ $t("ui.filterAll") }}</span>
                <span
                  v-for="status in presentCalcStatuses"
                  :key="status"
                  class="mc-filter-chip"
                  :class="{ active: calcStatusFilter === status }"
                  :style="calcStatusFilter === status ? { backgroundColor: calcStatusHelper.colorFor(status), color: 'white' } : {}"
                  @click="calcStatusFilter = status"
                >{{ $t(calcStatusHelper.labelKeyFor(status)) }}</span>
              </div>
              <ul class="mc-list" v-if="filteredCalcJobs.length">
                <li v-for="(job, i) in filteredCalcJobs" :key="'calc' + i">
                  <i :class="job.icon" :style="{ color: job.color }"></i>
                  {{ job.text }}
                  <span class="mc-list-tag">{{ job.listName }}</span>
                </li>
              </ul>
              <p class="mc-empty" v-else>{{ $t("ui.mcCalcJobsEmpty") }}</p>
            </div>

            <div class="mc-section mc-deadlines">
              <h6><i class="ph ph-warning-diamond"></i> {{ $t("ui.mcDeadlines") }}</h6>
              <ul class="mc-list" v-if="upcomingDeadlines.length">
                <li v-for="(t, i) in upcomingDeadlines" :key="'dl' + i">
                  {{ t.text }}
                  <span class="mc-list-tag">{{ moments(t.deadline).format("DD/MM") }}</span>
                </li>
              </ul>
              <p class="mc-empty" v-else>{{ $t("ui.mcDeadlinesEmpty") }}</p>
            </div>

            <div class="mc-section mc-meetings">
              <h6><i class="ph ph-users"></i> {{ $t("ui.mcMeetings") }}</h6>
              <ul class="mc-list" v-if="meetings.length">
                <li v-for="(m, i) in meetings" :key="'mt' + i">
                  {{ m.listName }}
                  <span class="mc-list-tag">{{ m.pending }} {{ $t("ui.mcPending") }}</span>
                </li>
              </ul>
              <p class="mc-empty" v-else>{{ $t("ui.mcMeetingsEmpty") }}</p>
            </div>

            <div class="mc-section mc-activity">
              <h6><i class="ph ph-chart-bar"></i> {{ $t("ui.mcActivity") }}</h6>
              <productivity-heatmap></productivity-heatmap>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import dbRepository from "../repositories/dbRepository";
import calcStatusHelper from "../helpers/calcStatusHelper";
import deadlinesHelper from "../helpers/deadlinesHelper";
import productivityHeatmap from "./productivityHeatmap.vue";

export default {
  name: "missionControlModal",
  components: {
    productivityHeatmap,
  },
  data() {
    return {
      loading: true,
      todayTasks: [],
      calcJobs: [],
      upcomingDeadlines: [],
      meetings: [],
      calcStatusFilter: null,
      calcStatusHelper: calcStatusHelper,
    };
  },
  mounted() {
    let modalEl = document.getElementById("missionControlModal");
    if (modalEl) modalEl.addEventListener("shown.bs.modal", this.loadData);
  },
  methods: {
    moments: function (date) {
      return moment(date);
    },
    loadData: async function () {
      this.loading = true;
      this.calcStatusFilter = null;
      let todayId = moment().format("YYYYMMDD");

      await this.$store.dispatch("loadTodoLists", todayId);
      this.todayTasks = (this.$store.getters.todoLists[todayId] || []).filter((t) => !t.checked);

      let cTodoListIds = this.$store.getters.cTodoListIds || [];
      let listNameFor = (listId) => {
        let entry = cTodoListIds.find((l) => l.listId === listId);
        return entry ? entry.listName || this.$t("ui.newCustomList") : listId;
      };

      let allLists = await this.scanAllLists();

      let statusOrder = { failed: 0, running: 1, queued: 2 };
      let jobs = [];
      allLists.forEach((entry) => {
        (entry.tasks || []).forEach((task) => {
          if (task.calcStatus && statusOrder[task.calcStatus] !== undefined && !task.checked) {
            jobs.push({
              text: task.text,
              listName: listNameFor(entry.listId),
              icon: calcStatusHelper.iconFor(task.calcStatus),
              color: calcStatusHelper.colorFor(task.calcStatus),
              status: task.calcStatus,
              order: statusOrder[task.calcStatus],
            });
          }
        });
      });
      jobs.sort((a, b) => a.order - b.order);
      this.calcJobs = jobs.slice(0, 12);

      let deadlineTasks = await deadlinesHelper.getTasksWithDeadline();
      let limit = moment().add(7, "days").format("YYYYMMDD");
      this.upcomingDeadlines = deadlineTasks.filter((t) => t.deadline <= limit).slice(0, 12);

      let meetingLists = cTodoListIds.filter((l) => l.kind === "meeting" && !l.archived);
      let meetings = [];
      meetingLists.forEach((l) => {
        let entry = allLists.find((e) => e.listId === l.listId);
        let pending = entry ? (entry.tasks || []).filter((t) => !t.checked).length : 0;
        meetings.push({ listName: l.listName || this.$t("ui.newCustomList"), pending: pending });
      });
      this.meetings = meetings;

      this.loading = false;
    },
    scanAllLists: function () {
      return new Promise((resolve) => {
        let db_req = dbRepository.open();
        db_req.onsuccess = function (event) {
          let db = event.target.result;
          let request = dbRepository.selectAll(db, "todo_lists");
          let lists = [];
          request.onsuccess = function () {
            let cursor = request.result;
            if (cursor) {
              if (Array.isArray(cursor.value)) {
                lists.push({ listId: cursor.key, tasks: cursor.value });
              }
              cursor.continue();
            } else {
              resolve(lists);
            }
          };
          request.onerror = function () {
            resolve(lists);
          };
        };
        db_req.onerror = function () {
          resolve([]);
        };
      });
    },
  },
  computed: {
    hasFailedJobs: function () {
      return this.calcJobs.some((j) => j.order === 0);
    },
    presentCalcStatuses: function () {
      let set = new Set(this.calcJobs.map((j) => j.status));
      return ["failed", "running", "queued"].filter((s) => set.has(s));
    },
    filteredCalcJobs: function () {
      return this.calcStatusFilter ? this.calcJobs.filter((j) => j.status === this.calcStatusFilter) : this.calcJobs;
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 760px;
}

/* Softer entrance than the default Bootstrap "slide down": fades and
   scales in instead, feels less abrupt for a dashboard-like modal. */
.modal.fade .modal-dialog {
  transition: transform 0.28s cubic-bezier(0.2, 1, 0.1, 1), opacity 0.22s ease-out;
  transform: scale(0.96) translateY(0);
  opacity: 0;
}

.modal.show .modal-dialog {
  transform: scale(1) translateY(0);
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .modal.fade .modal-dialog {
    transition: none;
    transform: none;
    opacity: 1;
  }
}

.mc-loading {
  text-align: center;
  padding: 30px 0;
  display: flex;
  justify-content: center;
}

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

.mc-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}

.mc-today {
  grid-column: span 5;
}

.mc-calc {
  grid-column: span 7;
  transition: grid-column 0.25s ease;
}

.mc-calc.mc-hero {
  grid-column: span 12;
  background: color-mix(in srgb, #ed544b 6%, transparent);
  border-radius: 10px;
  padding: 10px 12px;
  margin: -10px -12px 0 -12px;
}

.mc-deadlines,
.mc-meetings {
  grid-column: span 6;
}

.mc-activity {
  grid-column: span 12;
}

@media (max-width: 560px) {
  .mc-today,
  .mc-calc,
  .mc-calc.mc-hero,
  .mc-deadlines,
  .mc-meetings,
  .mc-activity {
    grid-column: span 12;
  }
}

.mc-section {
  h6 {
    font-size: 0.82rem;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.03em;

    .dark-theme & {
      color: #8b949e;
    }

    i {
      margin-right: 5px;
    }
  }
}

.mc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.82rem;

  li {
    padding: 5px 0;
    border-bottom: 1px solid #eaecef;
    display: flex;
    align-items: center;
    gap: 6px;

    .dark-theme & {
      border-bottom-color: #21262d;
    }

    &:last-child {
      border-bottom: none;
    }
  }
}

.mc-list-tag {
  margin-left: auto;
  font-size: 0.68rem;
  color: grey;
  flex-shrink: 0;

  .dark-theme & {
    color: #8b949e;
  }
}

.mc-empty {
  font-size: 0.8rem;
  color: grey;

  .dark-theme & {
    color: #8b949e;
  }
}

.mc-calc-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
}

.mc-filter-chip {
  font-size: 0.68rem;
  padding: 2px 9px;
  border-radius: 10px;
  cursor: pointer;
  background-color: #eaecef;
  color: #3c3c3c;

  .dark-theme & {
    background-color: #21262d;
    color: #c9d1d9;
  }
}

.mc-filter-chip.active {
  font-weight: 600;
}

.mc-daily-link,
.mc-weekly-link {
  border: none;
  background: none;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: grey;
  cursor: pointer;

  .dark-theme & {
    color: #8b949e;
  }

  &:hover {
    color: var(--accent-color, #5e6ef2);
  }
}

.mc-daily-link {
  margin-left: auto;
  margin-right: 12px;
}

.mc-weekly-link {
  margin-right: 12px;
}
</style>
