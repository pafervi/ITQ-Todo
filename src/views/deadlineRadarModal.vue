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
              <circle class="dr-ring" cx="100" cy="100" r="68" />
              <circle class="dr-ring" cx="100" cy="100" r="44" />
              <circle class="dr-ring dr-ring-core" cx="100" cy="100" r="22" />
              <circle class="dr-center" cx="100" cy="100" r="3" />
              <g v-for="(it, i) in points" :key="i">
                <circle
                  :cx="it.x"
                  :cy="it.y"
                  :r="it.talk ? 5 : 4"
                  :class="['dr-dot', 'dr-dot-' + it.kind, { 'dr-dot-selected': selectedIndex === i }]"
                  @click="selectPoint(i)"
                >
                  <title>{{ it.label }}</title>
                </circle>
              </g>
            </svg>

            <div class="dr-legend">
              <span class="dr-leg"><span class="dr-swatch dr-dot-deadline"></span> {{ $t("ui.deadlineRadarTasks") }}</span>
              <span class="dr-leg"><span class="dr-swatch dr-dot-paper"></span> {{ $t("ui.deadlineRadarPapers") }}</span>
              <span class="dr-leg"><span class="dr-swatch dr-dot-talk"></span> {{ $t("ui.deadlineRadarTalk") }}</span>
            </div>

            <!-- Detail card for the currently selected dot. Appears below the
                 radar so the user can see the task name, when it is due and
                 how far out, and the list it belongs to without hovering. -->
            <div v-if="selected" class="dr-detail" :class="'dr-detail-' + selected.kind">
              <div class="dr-detail-head">
                <span class="dr-detail-swatch" :class="'dr-dot-' + selected.kind"></span>
                <span class="dr-detail-title">{{ selected.title }}</span>
                <i v-if="selected.priority" class="bi-flag-fill dr-detail-prio" :class="'priority-' + selected.priority"></i>
              </div>
              <div class="dr-detail-meta">
                <span class="dr-detail-chip">
                  <i class="bi-calendar-event"></i>
                  {{ selected.deadlineLabel }}
                </span>
                <span class="dr-detail-chip">
                  <i class="bi-hourglass-split"></i>
                  {{ daysLabel(selected.days) }}
                </span>
                <span v-if="selected.listLabel" class="dr-detail-chip">
                  <i class="bi-folder2"></i>
                  {{ selected.listLabel }}
                </span>
              </div>
              <div v-if="selected.tags && selected.tags.length" class="dr-detail-tags">
                <span v-for="t in selected.tags" :key="t" class="dr-detail-tag">#{{ t }}</span>
              </div>
            </div>
            <p v-else-if="points.length" class="dr-hint">{{ $t("ui.deadlineRadarHint") }}</p>
            <p v-if="!points.length" class="dr-empty">{{ $t("ui.deadlineRadarEmpty") }}</p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import deadlinesHelper from "../helpers/deadlinesHelper";

// The four reference circles that still draw on the radar (visually mark
// today, this-week, this-month, later), kept as a plain list of radii. The
// actual radial position of every dot is a continuous function of days
// (dayToRadius below), not a bucket, so a deadline four days out sits
// visibly between a two-day one and a next-week one.
const REFERENCE_RINGS = [22, 44, 68, 94];

export default {
  name: "deadlineRadarModal",
  data() {
    return {
      loading: true,
      points: [],
      selectedIndex: -1,
    };
  },
  mounted() {
    let modalEl = document.getElementById("deadlineRadarModal");
    if (modalEl) {
      modalEl.addEventListener("shown.bs.modal", this.loadData);
      // Clear the selection when the modal is dismissed so reopening starts
      // on the legend/hint again instead of showing a stale detail card.
      modalEl.addEventListener("hidden.bs.modal", () => {
        this.selectedIndex = -1;
      });
    }
  },
  computed: {
    selected: function () {
      if (this.selectedIndex < 0) return null;
      return this.points[this.selectedIndex] || null;
    },
    customLists: function () {
      return this.$store.getters.cTodoListIds || [];
    },
  },
  methods: {
    selectPoint: function (i) {
      this.selectedIndex = this.selectedIndex === i ? -1 : i;
    },
    listLabel: function (listId) {
      if (!listId) return "";
      // Daily list keys look like YYYYMMDD; render those as a date for context.
      if (/^\d{8}$/.test(String(listId))) {
        let m = moment(listId, "YYYYMMDD");
        if (m.isValid()) return m.format("ddd DD MMM");
      }
      let hit = this.customLists.find((l) => l.listId === listId);
      return hit ? hit.listName : "";
    },
    daysLabel: function (days) {
      if (days < 0) return this.$t("ui.deadlineOverdueBy", [Math.abs(days)]) || `Overdue by ${Math.abs(days)} d`;
      if (days === 0) return this.$t("ui.deadlineToday") || "Due today";
      if (days === 1) return this.$t("ui.deadlineTomorrow") || "In 1 day";
      return this.$t("ui.deadlineInDays", [days]) || `In ${days} days`;
    },
    loadData: function () {
      this.loading = true;
      this.selectedIndex = -1;
      deadlinesHelper.getTasksWithDeadline().then((tasks) => {
        let items = tasks.map((t) => {
          let days = moment(t.deadline).startOf("day").diff(moment().startOf("day"), "days");
          let isPaper = (t.tags || []).indexOf("paper") !== -1;
          let dl = moment(t.deadline);
          return {
            days: days,
            title: t.text,
            label: t.text + " (" + dl.format("DD/MM") + ")",
            deadlineLabel: dl.format("LL"),
            listId: t.listId,
            listLabel: this.listLabel(t.listId),
            priority: t.priority || 0,
            tags: t.tags || [],
            kind: isPaper ? "paper" : "deadline",
            talk: false,
          };
        });

        // The next talk (config.nextTalkDate/Title) rides the radar too.
        let talkDate = this.$store.getters.config.nextTalkDate;
        if (talkDate) {
          let days = moment(talkDate).startOf("day").diff(moment().startOf("day"), "days");
          if (days >= 0) {
            let title = this.$store.getters.config.nextTalkTitle || this.$t("ui.templateConference");
            let dl = moment(talkDate);
            items.push({
              days: days,
              title: title,
              label: title + " (" + dl.format("DD/MM") + ")",
              deadlineLabel: dl.format("LL"),
              listId: null,
              listLabel: this.$t("ui.deadlineRadarTalk") || "Talk",
              priority: 0,
              tags: [],
              kind: "talk",
              talk: true,
            });
          }
        }

        this.points = this.layout(items);
        this.loading = false;
      });
    },
    // Smooth days -> radius mapping. Overdue items sit very close to the
    // centre, today near the first inner reference ring, and the remaining
    // deadlines fan outward on a sqrt curve so the first weeks keep plenty
    // of angular space and the "later" region fades gradually to the edge.
    dayToRadius: function (days) {
      if (days < 0) {
        // Clamp overdue inside a tight centre band so very overdue tasks
        // cluster near the nucleus without hiding behind each other.
        let depth = Math.min(Math.abs(days), 14);
        return Math.max(10, 20 - depth * 0.6);
      }
      if (days === 0) return 22;
      let maxDays = 180;
      let t = Math.sqrt(Math.min(days, maxDays) / maxDays);
      return 22 + t * 72;
    },
    layout: function (items) {
      // Give every item its own radius, then bucket by a coarse 6px grid of
      // radius so items that would overlap at a similar urgency share a
      // ring and get spread angularly around it. Items at distinct radii
      // keep their own slot. Angle offset by radius so adjacent rings do
      // not line up their dots along the same ray.
      let withR = items.map((it) => ({ it: it, r: this.dayToRadius(it.days) }));
      let buckets = {};
      withR.forEach((o) => {
        let key = Math.round(o.r / 6) * 6;
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(o);
      });
      let out = [];
      Object.keys(buckets).forEach((k) => {
        let group = buckets[k];
        let baseAngle = parseFloat(k) * 0.11;
        group.forEach((o, i) => {
          let angle = (Math.PI * 2 * i) / Math.max(group.length, 1) - Math.PI / 2 + baseAngle;
          out.push(Object.assign({}, o.it, {
            x: (100 + o.r * Math.cos(angle)).toFixed(1),
            y: (100 + o.r * Math.sin(angle)).toFixed(1),
            r: o.r,
          }));
        });
      });
      return out;
    },
    // Kept only to preserve the module structure the old `layout` had,
    // nothing calls this and REFERENCE_RINGS now only drives the reference
    // circles in the SVG template.
    _unusedLegacy: function (items) {
      let byRing = REFERENCE_RINGS.map(() => []);
      items.forEach((it) => byRing[0].push(it));
      let out = [];
      byRing.forEach((group, ringIdx) => {
        let r = REFERENCE_RINGS[ringIdx];
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
  max-width: 460px;
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
  cursor: pointer;
  transition: r 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease;

  &:hover {
    stroke-width: 1.6;
    filter: brightness(1.15);
  }

  .dark-theme & {
    stroke: #161b22;
  }
}

/* The clicked dot grows a touch and gets a bright halo so the user can see
   which one the detail card below is describing. */
.dr-dot-selected {
  stroke: var(--accent-color, #5e6ef2);
  stroke-width: 2;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent-color, #5e6ef2) 60%, transparent));
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

/* Detail card below the radar. Its left border picks up the kind color so the
   card and its dot read as the same thing without labels. */
.dr-detail {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background-color: rgba(94, 110, 242, 0.06);
  border-left: 3px solid #5e6ef2;

  .dark-theme & {
    background-color: rgba(94, 110, 242, 0.1);
  }
}

.dr-detail-paper {
  background-color: rgba(249, 115, 22, 0.08);
  border-left-color: #f97316;

  .dark-theme & {
    background-color: rgba(249, 115, 22, 0.12);
  }
}

.dr-detail-talk {
  background-color: rgba(225, 29, 72, 0.08);
  border-left-color: #e11d48;

  .dark-theme & {
    background-color: rgba(225, 29, 72, 0.14);
  }
}

.dr-detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.dr-detail-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dr-detail-title {
  font-weight: 600;
  font-size: 0.92rem;
  line-height: 1.25;
  flex: 1;
  color: #1a1a1a;

  .dark-theme & {
    color: #e8ecf8;
  }
}

.dr-detail-prio {
  font-size: 11px;
  flex-shrink: 0;
}

.dr-detail-prio.priority-1 { color: #5e6ef2; }
.dr-detail-prio.priority-2 { color: #f97316; }
.dr-detail-prio.priority-3 { color: #ed544b; }

.dr-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.76rem;
}

.dr-detail-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.05);
  color: #4a4a4a;

  .dark-theme & {
    background-color: rgba(255, 255, 255, 0.06);
    color: #c8cfe8;
  }
}

.dr-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.dr-detail-tag {
  font-size: 0.7rem;
  padding: 1px 7px;
  border-radius: 10px;
  background-color: rgba(94, 110, 242, 0.12);
  color: var(--accent-color, #5e6ef2);

  .dark-theme & {
    background-color: rgba(94, 110, 242, 0.22);
    color: #c8cfe8;
  }
}
</style>
