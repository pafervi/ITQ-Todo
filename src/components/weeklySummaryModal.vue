<template>
  <div class="modal fade" id="weeklySummaryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="bi-calendar-week"></i> {{ $t("ui.weeklySummary") }}</h5>
          <button type="button" class="ws-export-btn" @click="exportNotebook('week')" :title="$t('ui.exportNotebook')">
            <i class="ph ph-printer"></i> <span>{{ $t("ui.exportNotebook") }}</span>
          </button>
          <button type="button" class="ws-export-btn ws-export-month" @click="exportNotebook('month')" :title="$t('ui.exportNotebookMonth')">
            <i class="ph ph-printer"></i> <span>{{ $t("ui.exportNotebookMonth") }}</span>
          </button>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div class="ws-loading" v-if="loading">
            <svg class="orbital-spinner" viewBox="0 0 40 40" width="34" height="34" role="status" aria-hidden="true">
              <circle class="orbital-nucleus" cx="20" cy="20" r="3"></circle>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5"></ellipse>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(60 20 20)"></ellipse>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(120 20 20)"></ellipse>
            </svg>
          </div>
          <template v-else>
            <div class="ws-week-total">
              <span class="ws-week-total-number">{{ weekDone }}/{{ weekTotal }}</span>
              <span class="ws-week-total-label">{{ $t("ui.weeklySummaryTasksDone") }}</span>
            </div>

            <div class="ws-days">
              <div v-for="day in days" :key="day.key" class="ws-day" :class="{ 'ws-day-today': day.isToday }">
                <span class="ws-day-label">{{ dayLabel(day) }}</span>
                <div class="ws-day-bar">
                  <div class="ws-day-bar-fill" :style="{ height: dayPercent(day) + '%' }"></div>
                </div>
                <span class="ws-day-count">{{ day.done }}/{{ day.total }}</span>
              </div>
            </div>

            <h6 class="ws-lists-title">{{ $t("ui.weeklySummaryByProject") }}</h6>
            <ul class="ws-list" v-if="lists.length">
              <li v-for="l in lists" :key="l.listId">
                <span class="ws-list-dot" :style="{ backgroundColor: l.color || 'var(--accent-color, #5e6ef2)' }"></span>
                <span class="ws-list-name">{{ l.listName || $t("ui.newCustomList") }}</span>
                <span class="ws-list-count">{{ l.done }}/{{ l.total }}</span>
              </li>
            </ul>
            <p class="ws-empty" v-else>{{ $t("ui.weeklySummaryEmpty") }}</p>

            <h6 class="ws-lists-title">{{ $t("overview.nextWeeks") }}</h6>
            <overview-agenda-list :limit="8"></overview-agenda-list>
          </template>
        </div>
      </div>
    </div>

    <teleport to="body">
      <div class="lab-notebook-print" v-if="notebook" :class="{ 'lnp-monthly': notebook.scope === 'month' }">
        <div class="lnp-cover" v-if="notebook.scope === 'month'">
          <div class="lnp-cover-inner">
            <div class="lnp-cover-mark">ITQ</div>
            <h1>{{ $t("ui.labNotebookTitle") }}</h1>
            <p class="lnp-cover-period">{{ monthCoverLabel }}</p>
            <p class="lnp-cover-sub">{{ notebookRangeLabel }}</p>
            <p class="lnp-cover-gen">{{ $t("ui.labNotebookGenerated") }} {{ generatedAtLabel }}</p>
          </div>
        </div>

        <div class="lnp-header" v-else>
          <h1>{{ $t("ui.labNotebookTitle") }}</h1>
          <p class="lnp-range">{{ notebookRangeLabel }}</p>
          <p class="lnp-generated">{{ $t("ui.labNotebookGenerated") }} {{ generatedAtLabel }}</p>
        </div>

        <p class="lnp-monthly-empty" v-if="notebook.scope === 'month' && !notebook.days.length && !notebook.lists.length">
          {{ $t("ui.labNotebookNoTasks") }}
        </p>

        <div class="lnp-day" v-for="day in notebook.days" :key="day.key">
          <h2>{{ dayFullLabel(day) }}</h2>
          <ul v-if="day.tasks.length">
            <li v-for="(t, i) in day.tasks" :key="i">{{ t }}</li>
          </ul>
          <p class="lnp-empty" v-else>{{ $t("ui.labNotebookNoTasks") }}</p>
        </div>

        <div class="lnp-projects" v-if="notebook.lists.length">
          <h2>{{ $t("ui.weeklySummaryByProject") }}</h2>
          <div class="lnp-project" v-for="l in notebook.lists" :key="l.listId">
            <h3>{{ l.listName || $t("ui.newCustomList") }}</h3>
            <ul>
              <li v-for="(t, i) in l.tasks" :key="i">{{ t }}</li>
            </ul>
          </div>
        </div>

        <div class="lnp-signature">
          <div class="lnp-sign-line"><span>{{ $t("ui.labNotebookSignature") }}</span></div>
          <div class="lnp-sign-line"><span>{{ $t("ui.labNotebookDate") }}: {{ generatedAtLabel }}</span></div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import moment from "moment";
import weeklySummaryHelper from "../helpers/weeklySummaryHelper";
import labNotebookHelper from "../helpers/labNotebookHelper";
import overviewAgendaList from "./overviewAgendaList.vue";

export default {
  name: "weeklySummaryModal",
  components: { overviewAgendaList },
  data() {
    return {
      loading: true,
      days: [],
      lists: [],
      weekDone: 0,
      weekTotal: 0,
      notebook: null,
    };
  },
  mounted() {
    let modalEl = document.getElementById("weeklySummaryModal");
    if (modalEl) modalEl.addEventListener("shown.bs.modal", this.loadData);
    window.addEventListener("afterprint", this.onAfterPrint);
  },
  unmounted() {
    window.removeEventListener("afterprint", this.onAfterPrint);
  },
  methods: {
    loadData: function () {
      this.loading = true;
      weeklySummaryHelper.getWeekSummary(this.$store.getters.cTodoListIds).then((summary) => {
        this.days = summary.days;
        this.lists = summary.lists.slice(0, 10);
        this.weekDone = summary.weekDone;
        this.weekTotal = summary.weekTotal;
        this.loading = false;
      });
    },
    dayLabel: function (day) {
      return moment(day.key, "YYYYMMDD").locale(this.$store.getters.config.language).format("dd").slice(0, 2);
    },
    dayPercent: function (day) {
      if (!day.total) return 0;
      return Math.round((day.done / day.total) * 100);
    },
    dayFullLabel: function (day) {
      let label = moment(day.key, "YYYYMMDD").locale(this.$store.getters.config.language).format("dddd D MMMM");
      return label.charAt(0).toUpperCase() + label.slice(1);
    },
    exportNotebook: function (scope) {
      let fetch =
        scope === "month"
          ? labNotebookHelper.getNotebookMonth(this.$store.getters.cTodoListIds)
          : labNotebookHelper.getNotebookWeek(this.$store.getters.cTodoListIds);
      fetch.then((data) => {
        this.notebook = data;
        this.$nextTick(() => {
          document.body.classList.add("lab-notebook-printing");
          window.print();
        });
      });
    },
    onAfterPrint: function () {
      document.body.classList.remove("lab-notebook-printing");
      this.notebook = null;
    },
  },
  computed: {
    notebookRangeLabel: function () {
      if (!this.notebook) return "";
      let lang = this.$store.getters.config.language;
      let startKey = this.notebook.scope === "month" ? this.notebook.monthStartKey : this.notebook.weekStartKey;
      let endKey = this.notebook.scope === "month" ? this.notebook.monthEndKey : this.notebook.weekEndKey;
      if (!startKey) return "";
      let start = moment(startKey, "YYYYMMDD").locale(lang).format("D MMM");
      let end = moment(endKey, "YYYYMMDD").locale(lang).format("D MMM YYYY");
      return start + " - " + end;
    },
    monthCoverLabel: function () {
      if (!this.notebook || this.notebook.scope !== "month" || !this.notebook.monthStartKey) return "";
      let label = moment(this.notebook.monthStartKey, "YYYYMMDD").locale(this.$store.getters.config.language).format("MMMM YYYY");
      return label.charAt(0).toUpperCase() + label.slice(1);
    },
    generatedAtLabel: function () {
      return moment().locale(this.$store.getters.config.language).format("D MMMM YYYY");
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 640px;
}

/* Same soft fade+scale entrance as Mission Control, instead of the abrupt
   default Bootstrap slide. */
.modal.fade .modal-dialog {
  transition: transform 0.28s cubic-bezier(0.2, 1, 0.1, 1), opacity 0.22s ease-out;
  transform: scale(0.96);
  opacity: 0;
}

.modal.show .modal-dialog {
  transform: scale(1);
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .modal.fade .modal-dialog {
    transition: none;
    transform: none;
    opacity: 1;
  }
}

.ws-loading {
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

.ws-week-total {
  text-align: center;
  margin-bottom: 18px;
}

.ws-week-total-number {
  display: block;
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--accent-color, #5e6ef2);
}

.ws-week-total-label {
  font-size: 0.8rem;
  color: grey;

  .dark-theme & {
    color: #8b949e;
  }
}

.ws-days {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 22px;
  padding: 0 6px;
}

.ws-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  flex: 1;
}

.ws-day-label {
  font-size: 0.7rem;
  color: grey;
  text-transform: uppercase;

  .dark-theme & {
    color: #8b949e;
  }
}

.ws-day-today .ws-day-label {
  color: var(--accent-color, #5e6ef2);
  font-weight: 700;
}

.ws-day-bar {
  width: 14px;
  height: 60px;
  border-radius: 4px;
  background-color: #eaecef;
  display: flex;
  align-items: flex-end;
  overflow: hidden;

  .dark-theme & {
    background-color: #21262d;
  }
}

.ws-day-bar-fill {
  width: 100%;
  border-radius: 4px;
  background-color: var(--accent-color, #5e6ef2);
  transition: height 0.35s cubic-bezier(0.2, 1, 0.1, 1);
}

.ws-day-count {
  font-size: 0.65rem;
  color: grey;

  .dark-theme & {
    color: #8b949e;
  }
}

.ws-lists-title {
  font-size: 0.85rem;
  color: grey;
  margin-bottom: 8px;

  .dark-theme & {
    color: #8b949e;
  }
}

.ws-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.85rem;
}

.ws-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #eaecef;

  .dark-theme & {
    border-bottom-color: #21262d;
  }

  &:last-child {
    border-bottom: none;
  }
}

.ws-list-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ws-list-name {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-list-count {
  color: grey;
  font-size: 0.78rem;
  flex-shrink: 0;

  .dark-theme & {
    color: #8b949e;
  }
}

.ws-empty {
  font-size: 0.85rem;
  color: grey;
  text-align: center;
  padding: 10px 0;

  .dark-theme & {
    color: #8b949e;
  }
}

.ws-export-btn {
  margin-right: 12px;
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

.ws-export-btn:first-of-type {
  margin-left: auto;
}
</style>

<style lang="scss">
/* Global, unscoped: the lab-notebook page is teleported to <body> so it
   sits outside #app-container, and gets swapped in for print only. Same
   "print exactly one thing" trick as .ready-to-print, but isolated via a
   dedicated body class instead of hiding sidebar/nav pieces in place. */
.lab-notebook-print {
  display: none;
}

@media print {
  body.lab-notebook-printing #app-container {
    display: none !important;
  }

  body.lab-notebook-printing .lab-notebook-print {
    display: block !important;
    padding: 30px 40px;
    color: #000;
    background: #fff;
    font-family: Georgia, "Times New Roman", serif;
  }

  /* Monthly cover page: a full first page, then the days start on the next. */
  .lab-notebook-print .lnp-cover {
    height: 92vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    page-break-after: always;
    border: 2px solid #000;
  }

  .lab-notebook-print .lnp-cover-mark {
    font-size: 30px;
    letter-spacing: 6px;
    font-weight: bold;
    border: 2px solid #000;
    display: inline-block;
    padding: 10px 18px;
    margin-bottom: 24px;
  }

  .lab-notebook-print .lnp-cover h1 {
    font-size: 32px;
    margin: 0 0 12px 0;
  }

  .lab-notebook-print .lnp-cover-period {
    font-size: 22px;
    margin: 0 0 6px 0;
  }

  .lab-notebook-print .lnp-cover-sub {
    font-size: 14px;
    margin: 0 0 30px 0;
  }

  .lab-notebook-print .lnp-cover-gen {
    font-size: 12px;
    color: #444;
    margin: 0;
  }

  .lab-notebook-print .lnp-monthly-empty {
    font-size: 13px;
    font-style: italic;
    color: #555;
  }

  .lab-notebook-print .lnp-header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 14px;
    margin-bottom: 24px;
  }

  .lab-notebook-print h1 {
    font-size: 20px;
    margin: 0 0 4px 0;
  }

  .lab-notebook-print .lnp-range {
    font-size: 14px;
    margin: 0;
  }

  .lab-notebook-print .lnp-generated {
    font-size: 11px;
    color: #444;
    margin: 4px 0 0 0;
  }

  .lab-notebook-print .lnp-day {
    margin-bottom: 16px;
    break-inside: avoid;
  }

  .lab-notebook-print .lnp-day h2 {
    font-size: 14px;
    border-bottom: 1px solid #999;
    padding-bottom: 3px;
    margin: 0 0 6px 0;
  }

  .lab-notebook-print .lnp-day ul,
  .lab-notebook-print .lnp-project ul {
    margin: 0;
    padding-left: 20px;
    font-size: 12px;
  }

  .lab-notebook-print .lnp-day ul li,
  .lab-notebook-print .lnp-project ul li {
    margin-bottom: 2px;
  }

  .lab-notebook-print .lnp-empty {
    font-size: 12px;
    color: #777;
    font-style: italic;
    margin: 0 0 0 2px;
  }

  .lab-notebook-print .lnp-projects {
    margin-top: 20px;
    page-break-before: always;
  }

  .lab-notebook-print .lnp-projects h2 {
    font-size: 16px;
    margin: 0 0 10px 0;
  }

  .lab-notebook-print .lnp-project {
    margin-bottom: 14px;
  }

  .lab-notebook-print .lnp-project h3 {
    font-size: 13px;
    margin: 0 0 4px 0;
  }

  .lab-notebook-print .lnp-signature {
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .lab-notebook-print .lnp-sign-line {
    border-top: 1px solid #000;
    padding-top: 4px;
    min-width: 220px;
  }
}
</style>
