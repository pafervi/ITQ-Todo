<template>
  <div class="modal fade" id="dailySummaryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="ph ph-moon-stars"></i> {{ $t("ui.dailySummary") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div class="ds-loading" v-if="loading">
            <svg class="orbital-spinner" viewBox="0 0 40 40" width="34" height="34" role="status" aria-hidden="true">
              <circle class="orbital-nucleus" cx="20" cy="20" r="3"></circle>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5"></ellipse>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(60 20 20)"></ellipse>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(120 20 20)"></ellipse>
            </svg>
          </div>
          <template v-else>
            <div class="ds-today-total">
              <span class="ds-today-total-number">{{ summary.todayDone }}/{{ summary.todayTotal }}</span>
              <span class="ds-today-total-label">{{ $t("ui.dailySummaryTasksDone") }}</span>
            </div>

            <ul class="ds-lines">
              <li v-for="(line, i) in lines" :key="i" :class="'ds-line-' + line.kind">
                <i :class="line.icon"></i>
                <span>{{ line.text }}</span>
              </li>
            </ul>

            <p class="ds-local-note"><i class="ph ph-lock-simple"></i> {{ $t("ui.dailySummaryLocalNote") }}</p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import dailySummaryHelper from "../helpers/dailySummaryHelper";

export default {
  name: "dailySummaryModal",
  data() {
    return {
      loading: true,
      summary: {
        todayDone: 0,
        todayTotal: 0,
        topList: null,
        failedJobsCount: 0,
        failedJobsPreview: [],
        tomorrowCount: 0,
        tomorrowPreview: [],
      },
    };
  },
  mounted() {
    let modalEl = document.getElementById("dailySummaryModal");
    if (modalEl) modalEl.addEventListener("shown.bs.modal", this.loadData);
  },
  methods: {
    loadData: function () {
      this.loading = true;
      dailySummaryHelper.getDaySummary(this.$store.getters.cTodoListIds).then((summary) => {
        this.summary = summary;
        this.loading = false;
      });
    },
  },
  computed: {
    lines: function () {
      let s = this.summary;
      let lines = [];

      if (s.topList) {
        lines.push({
          kind: "progress",
          icon: "ph ph-trend-up",
          text: this.$t("ui.dailySummaryProgress", [s.topList.listName || this.$t("ui.newCustomList"), s.topList.done, s.topList.total]),
        });
      } else if (s.todayTotal > 0) {
        lines.push({
          kind: "progress",
          icon: "ph ph-trend-up",
          text: this.$t("ui.dailySummaryProgressGeneric", [s.todayDone]),
        });
      }

      if (s.failedJobsCount > 0) {
        lines.push({
          kind: "failed",
          icon: "ph-fill ph-x-circle",
          text: this.$t("ui.dailySummaryFailed", [s.failedJobsCount]),
        });
      }

      if (s.tomorrowCount > 0) {
        let preview = s.tomorrowPreview.join(", ");
        let extra = s.tomorrowCount - s.tomorrowPreview.length;
        let text = extra > 0 ? this.$t("ui.dailySummaryTomorrowMore", [preview, extra]) : this.$t("ui.dailySummaryTomorrow", [preview]);
        lines.push({ kind: "tomorrow", icon: "ph ph-arrow-right", text: text });
      } else {
        lines.push({ kind: "tomorrow", icon: "ph ph-arrow-right", text: this.$t("ui.dailySummaryTomorrowEmpty") });
      }

      return lines;
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 520px;
}

/* Same soft fade+scale entrance as the other summary modals. */
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

.ds-loading {
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

.ds-today-total {
  text-align: center;
  margin-bottom: 20px;
}

.ds-today-total-number {
  display: block;
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--accent-color, #5e6ef2);
}

.ds-today-total-label {
  font-size: 0.8rem;
  color: grey;

  .dark-theme & {
    color: #8b949e;
  }
}

.ds-lines {
  list-style: none;
  padding: 0;
  margin: 0 0 18px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ds-lines li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.92rem;
  padding: 10px 12px;
  border-radius: 10px;
  background-color: #f5f6f8;
  line-height: 1.4;

  .dark-theme & {
    background-color: #1c2128;
  }

  i {
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 1.05rem;
  }
}

.ds-line-progress i {
  color: #10b981;
}

.ds-line-failed i {
  color: #ed544b;
}

.ds-line-tomorrow i {
  color: var(--accent-color, #5e6ef2);
}

.ds-local-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: grey;
  margin: 0;
  justify-content: center;

  .dark-theme & {
    color: #8b949e;
  }
}
</style>
