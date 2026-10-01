<template>
  <div class="modal fade" id="deadlineRadarModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="ph ph-target"></i> {{ $t("ui.deadlineRadar") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div class="dr-loading" v-if="loading">
            <svg class="orbital-spinner" viewBox="0 0 40 40" width="34" height="34" role="status" aria-hidden="true">
              <circle class="orbital-nucleus" cx="20" cy="20" r="3"></circle>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5"></ellipse>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(60 20 20)"></ellipse>
              <ellipse class="orbital-ring" cx="20" cy="20" rx="17" ry="6.5" transform="rotate(120 20 20)"></ellipse>
            </svg>
          </div>
          <template v-else>
            <svg class="dr-radar" viewBox="0 0 200 200" role="img" :aria-label="$t('ui.deadlineRadar')">
              <circle class="dr-ring" cx="100" cy="100" r="94" />
              <circle class="dr-ring" cx="100" cy="100" r="76" />
              <circle class="dr-ring" cx="100" cy="100" r="52" />
              <circle class="dr-ring dr-ring-core" cx="100" cy="100" r="28" />
              <circle class="dr-center" cx="100" cy="100" r="3" />
              <g v-for="(it, i) in points" :key="i">
                <circle :cx="it.x" :cy="it.y" :r="it.talk ? 5 : 4" :class="'dr-dot dr-dot-' + it.kind">
                  <title>{{ it.label }}</title>
                </circle>
              </g>
            </svg>

            <div class="dr-legend">
              <span class="dr-leg"><span class="dr-swatch dr-dot-deadline"></span> {{ $t("ui.deadlineRadarTasks") }}</span>
              <span class="dr-leg"><span class="dr-swatch dr-dot-paper"></span> {{ $t("ui.deadlineRadarPapers") }}</span>
              <span class="dr-leg"><span class="dr-swatch dr-dot-talk"></span> {{ $t("ui.deadlineRadarTalk") }}</span>
            </div>
            <p class="dr-hint">{{ $t("ui.deadlineRadarHint") }}</p>
            <p class="dr-empty" v-if="!points.length">{{ $t("ui.deadlineRadarEmpty") }}</p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import deadlinesHelper from "../helpers/deadlinesHelper";

// Four concentric rings by urgency; closer to the centre = sooner.
const RINGS = [
  { max: 0, r: 28 }, // overdue or today
  { max: 7, r: 52 }, // this week
  { max: 31, r: 76 }, // this month
  { max: Infinity, r: 94 }, // later
];

export default {
  name: "deadlineRadarModal",
  data() {
    return {
      loading: true,
      points: [],
    };
  },
  mounted() {
    let modalEl = document.getElementById("deadlineRadarModal");
    if (modalEl) modalEl.addEventListener("shown.bs.modal", this.loadData);
  },
  methods: {
    loadData: function () {
      this.loading = true;
      deadlinesHelper.getTasksWithDeadline().then((tasks) => {
        let items = tasks.map((t) => {
          let days = moment(t.deadline).startOf("day").diff(moment().startOf("day"), "days");
          let isPaper = (t.tags || []).indexOf("paper") !== -1;
          return { days: days, label: t.text + " (" + moment(t.deadline).format("DD/MM") + ")", kind: isPaper ? "paper" : "deadline", talk: false };
        });

        // The next talk (config.nextTalkDate/Title) rides the radar too.
        let talkDate = this.$store.getters.config.nextTalkDate;
        if (talkDate) {
          let days = moment(talkDate).startOf("day").diff(moment().startOf("day"), "days");
          if (days >= 0) {
            let title = this.$store.getters.config.nextTalkTitle || this.$t("ui.templateConference");
            items.push({ days: days, label: title + " (" + moment(talkDate).format("DD/MM") + ")", kind: "talk", talk: true });
          }
        }

        this.points = this.layout(items);
        this.loading = false;
      });
    },
    layout: function (items) {
      // Group by ring, then spread each ring's items evenly around it.
      let byRing = RINGS.map(() => []);
      items.forEach((it) => {
        let ringIdx = RINGS.findIndex((ring) => it.days <= ring.max);
        if (ringIdx < 0) ringIdx = RINGS.length - 1;
        byRing[ringIdx].push(it);
      });
      let out = [];
      byRing.forEach((group, ringIdx) => {
        let r = RINGS[ringIdx].r;
        group.forEach((it, i) => {
          let angle = (Math.PI * 2 * i) / group.length - Math.PI / 2 + ringIdx * 0.4;
          out.push(Object.assign({}, it, { x: (100 + r * Math.cos(angle)).toFixed(1), y: (100 + r * Math.sin(angle)).toFixed(1) }));
        });
      });
      return out;
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 420px;
}

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

.dr-loading {
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

.dr-radar {
  display: block;
  width: 280px;
  max-width: 100%;
  margin: 0 auto 10px auto;
}

.dr-ring {
  fill: none;
  stroke: #e2e5ea;
  stroke-width: 1;

  .dark-theme & {
    stroke: #2a2f37;
  }
}

.dr-ring-core {
  stroke: color-mix(in srgb, var(--accent-color, #5e6ef2) 40%, #e2e5ea);
}

.dr-center {
  fill: var(--accent-color, #5e6ef2);
}

.dr-dot {
  stroke: #fff;
  stroke-width: 1;

  .dark-theme & {
    stroke: #161b22;
  }
}

.dr-dot-deadline {
  fill: #5e6ef2;
}

.dr-dot-paper {
  fill: #f97316;
}

.dr-dot-talk {
  fill: #e11d48;
}

.dr-legend {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.dr-leg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: grey;

  .dark-theme & {
    color: #8b949e;
  }
}

.dr-swatch {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.dr-hint {
  text-align: center;
  font-size: 0.72rem;
  color: grey;
  margin: 0;

  .dark-theme & {
    color: #8b949e;
  }
}

.dr-empty {
  text-align: center;
  font-size: 0.82rem;
  color: grey;
  margin-top: 8px;
}
</style>
