<template>
  <div class="ow">
    <div class="ow-board">
      <div class="ow-nav">
        <button type="button" class="ov-icon-btn" :title="$t('overview.weeksPrev')" @click="shift(-1)">
          <i class="ph ph-caret-left"></i>
        </button>
        <button type="button" class="ov-chip-btn" @click="goNow">{{ $t("overview.weekThis") }}</button>
        <button type="button" class="ov-icon-btn" :title="$t('overview.weeksNext')" @click="shift(1)">
          <i class="ph ph-caret-right"></i>
        </button>
        <span class="ow-range">{{ rangeLabel }}</span>
        <span class="ow-hint">{{ $t("overview.weeksHint") }}</span>
      </div>

      <div class="ow-weeks">
        <section
          v-for="w in weeks"
          :key="w.start"
          class="ow-week"
          :class="{ 'is-current': w.current, 'is-drop': dropWeek === w.start }"
          :data-week="w.start"
        >
          <header class="ow-week-head">
            <strong>{{ w.title }}</strong>
            <span class="ow-week-range">{{ w.range }}</span>
          </header>

          <div v-if="w.away.length || w.dates.length" class="ow-dates">
            <span v-for="a in w.away" :key="a.id" class="ow-away" :title="a.title">{{ a.title }}</span>
            <span v-for="d in w.dates" :key="d.key" class="ow-date" :class="'dk-' + d.kind" :title="d.title">
              <b>{{ d.day }}</b> {{ d.title }}
            </span>
            <span v-if="w.moreDates" class="ow-date-more">{{ $t("overview.plusMore", [w.moreDates]) }}</span>
          </div>

          <ul class="ow-cards">
            <li
              v-for="c in w.cards"
              :key="c.item.id"
              class="ow-card"
              :class="[c.item.kind, { 'is-done': c.item.done, 'is-dragging': drag && drag.item && drag.item.id === c.item.id && drag.moved }]"
              :style="{ '--c': c.color }"
              @pointerdown="startCardDrag($event, c)"
            >
              <input type="checkbox" class="ow-check" :checked="c.item.done" @pointerdown.stop @change="toggleDone(c.item)" />
              <span class="ow-card-main">
                <span class="ow-card-title">{{ c.title }}</span>
                <span v-if="c.subtitle" class="ow-card-sub">{{ c.subtitle }}</span>
              </span>
              <i v-if="c.offDates" class="bi-exclamation-triangle ow-warn" :title="$t('overview.outOfDates')"></i>
              <i v-if="c.missing" class="bi-question-circle ow-warn" :title="$t('overview.phaseMissing')"></i>
              <button type="button" class="ow-x" :title="$t('overview.removeFocus')" @pointerdown.stop @click="removeItem(c.item)">
                <i class="ph ph-x"></i>
              </button>
            </li>
          </ul>
          <p v-if="!w.cards.length" class="ow-empty">{{ $t("overview.weekEmpty") }}</p>

          <form v-if="adding && adding.week === w.start" class="ow-add" @submit.prevent="submitAdd" @keydown.esc.stop="adding = null">
            <input ref="addInput" v-model="adding.text" type="text" maxlength="120" :placeholder="$t('overview.goalPlaceholder')" />
            <select v-model="adding.projectId">
              <option value="">{{ $t("overview.goalNoProject") }}</option>
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </form>
          <button v-else type="button" class="ow-add-btn" @click="openAdd(w.start)">
            <i class="ph ph-plus"></i> {{ $t("overview.addGoal") }}
          </button>
        </section>
      </div>
    </div>

    <aside class="ow-pool" :class="{ 'is-drop': overPool && drag && drag.source === 'card' }">
      <h6 class="ow-pool-title">{{ $t("overview.poolTitle") }}</h6>
      <p class="ow-pool-hint">{{ drag && drag.source === "card" && drag.moved ? $t("overview.dropRemove") : $t("overview.poolHint") }}</p>
      <template v-if="pool.length">
        <div v-for="g in pool" :key="g.project.id" class="ow-pool-group">
          <div class="ow-pool-project" :style="{ '--c': g.project.color }">
            <span class="ow-dot"></span>{{ g.project.name }}
          </div>
          <div
            v-for="ph in g.phases"
            :key="ph.id"
            class="ow-chip"
            :style="{ '--c': g.project.color }"
            @pointerdown="startPoolDrag($event, g.project, ph)"
          >
            <span class="ow-chip-main">
              <span class="ow-chip-title">{{ ph.name }}</span>
              <span class="ow-chip-sub">
                {{ $t("phased.status" + statusKey(ph.status)) }}<template v-if="ph.startDate && ph.endDate"> · {{ formatDay(ph.startDate) }} – {{ formatDay(ph.endDate) }}</template>
              </span>
            </span>
            <span v-if="placed(g.project.id, ph.id)" class="ow-chip-count" :title="$t('overview.placedTitle', [placed(g.project.id, ph.id)])">
              ×{{ placed(g.project.id, ph.id) }}
            </span>
            <button type="button" class="ow-x ow-plus" :title="$t('overview.addToThisWeek')" @pointerdown.stop @click="quickAdd(g.project, ph)">
              <i class="ph ph-plus"></i>
            </button>
          </div>
        </div>
      </template>
      <p v-else class="ow-pool-empty">{{ $t("overview.poolEmpty") }}</p>
    </aside>

    <!-- Teleported to <body> so the zoomed app container does not displace it. -->
    <teleport to="body">
      <div v-if="drag && drag.moved" class="ow-ghost" :style="ghostStyle">{{ drag.title }}</div>
    </teleport>
  </div>
</template>

<script>
import moment from "moment";
import overviewHelper from "../helpers/overviewHelper";
import overviewFocus from "../helpers/overviewFocus";
import overviewAgenda from "../helpers/overviewAgenda";
import projectColorHelper from "../helpers/projectColorHelper";

const WEEKS = 6;
const GOAL_COLOR = "#7a8aa0";
const MAX_DATES = 3;

// "Weeks" mode of the overview: what to work on in each of the next weeks.
// Phases of the phased projects are dragged (or added with +) into a week, and
// free-text goals can be typed in. The plan is stored in the overview document
// (store: overviewFocus) and shows up in the Today screen too.
export default {
  name: "overviewWeeks",
  data() {
    return {
      firstWeek: overviewFocus.weekStart(),
      adding: null,
      drag: null,
      dropWeek: null,
      overPool: false,
      input: null,
    };
  },
  computed: {
    language() {
      return this.$store.getters.config.language;
    },
    focus() {
      return this.$store.getters.overviewFocus;
    },
    currentWeek() {
      return overviewFocus.weekStart();
    },
    projects() {
      return (this.$store.getters.cTodoListIds || [])
        .filter((p) => p && !p.archived)
        .map((p) => ({ id: p.listId, name: p.listName || "", color: p.color || projectColorHelper.solidFor(p.listId), type: p.type }));
    },
    phasesById() {
      return this.$store.getters.phases || {};
    },
    pool() {
      return overviewFocus.phasePool(
        this.projects.filter((p) => p.type === "phased"),
        this.phasesById
      );
    },
    weeks() {
      return overviewFocus.weeksFrom(this.firstWeek, WEEKS).map((start) => {
        let info = overviewFocus.weekInfo(start);
        let offset = moment(start, overviewHelper.FMT).diff(moment(this.currentWeek, overviewHelper.FMT), "weeks");
        let title = offset === 0 ? this.$t("overview.weekThis") : offset === 1 ? this.$t("overview.weekNext") : this.$t("overview.weekN", [info.isoWeek]);
        let around = this.weekDates(info);
        return {
          start: start,
          title: title,
          range: this.formatDay(info.start) + " – " + this.formatDay(info.end),
          current: offset === 0,
          cards: overviewFocus.forWeek(this.focus, start).map((item) => {
            let d = overviewFocus.describe(item, this.projects, this.phasesById);
            return { item: item, title: d.title, subtitle: d.subtitle, color: d.color || GOAL_COLOR, missing: d.missing, offDates: d.offDates };
          }),
          dates: around.dates.slice(0, MAX_DATES),
          moreDates: Math.max(around.dates.length - MAX_DATES, 0),
          away: around.away,
        };
      });
    },
    rangeLabel() {
      let first = overviewFocus.weekInfo(this.firstWeek);
      let last = overviewFocus.weekInfo(overviewFocus.shiftWeek(this.firstWeek, WEEKS - 1));
      return this.formatDay(first.start) + " – " + this.formatDay(last.end);
    },
    ghostStyle() {
      return { left: this.drag.x + 12 + "px", top: this.drag.y + 12 + "px", "--c": this.drag.color };
    },
  },
  async mounted() {
    window.addEventListener("keydown", this.onKeydown, true);
    try {
      this.input = await overviewAgenda.load(this.$store);
    } catch (e) {
      this.input = null;
    }
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.onKeydown, true);
    this.stopListeners();
  },
  methods: {
    formatDay(date) {
      return moment(date, overviewHelper.FMT).locale(this.language).format("D MMM");
    },
    statusKey(status) {
      let s = status || "pending";
      return s.charAt(0).toUpperCase() + s.slice(1);
    },
    placed(projectId, phaseId) {
      return overviewFocus.placedCount(this.focus, projectId, phaseId);
    },
    shift(n) {
      this.firstWeek = overviewFocus.shiftWeek(this.firstWeek, n);
    },
    goNow() {
      this.firstWeek = this.currentWeek;
    },
    // Dates worth knowing about when planning a week: deadlines, the next talk,
    // milestones, and unavailable periods.
    weekDates(info) {
      let i = this.input;
      if (!i) return { dates: [], away: [] };
      let inside = (d) => d >= info.start && d <= info.end;
      let dates = [];
      (i.deadlines || []).forEach((d) => {
        if (inside(d.date)) dates.push({ date: d.date, title: d.title, kind: d.isPaper ? "paper" : "deadline" });
      });
      if (i.talk && inside(i.talk.date)) dates.push({ date: i.talk.date, title: i.talk.title || this.$t("ui.talk"), kind: "talk" });
      (i.items || []).forEach((it) => {
        if (it.kind === "milestone" && it.startDate && inside(it.startDate)) dates.push({ date: it.startDate, title: it.title, kind: "milestone" });
      });
      dates.sort((a, b) => a.date.localeCompare(b.date));
      dates = dates.map((d, n) => ({ key: d.date + "-" + n, kind: d.kind, title: d.title, day: moment(d.date, overviewHelper.FMT).locale(this.language).format("dd D") }));
      let away = (i.items || []).filter((it) => it.kind === "away" && it.startDate && it.startDate <= info.end && (it.endDate || it.startDate) >= info.start);
      return { dates: dates, away: away };
    },

    // ---- editing ----
    save(item) {
      return this.$store.dispatch("saveOverviewFocus", item);
    },
    toggleDone(item) {
      this.save(Object.assign({}, item, { done: !item.done }));
    },
    removeItem(item) {
      this.$store.dispatch("deleteOverviewFocus", item.id);
    },
    placePhase(project, phase, week) {
      let item = overviewFocus.phaseItem(this.focus, week, project, phase);
      if (item) this.save(item);
    },
    quickAdd(project, phase) {
      this.placePhase(project, phase, this.currentWeek);
    },
    openAdd(week) {
      this.adding = { week: week, text: "", projectId: "" };
      this.$nextTick(() => {
        let el = this.$refs.addInput;
        el = Array.isArray(el) ? el[0] : el;
        if (el) el.focus();
      });
    },
    submitAdd() {
      if (!this.adding) return;
      let project = this.projects.find((p) => p.id === this.adding.projectId) || null;
      let item = overviewFocus.goalItem(this.focus, this.adding.week, this.adding.text, project);
      if (!item) return;
      this.save(item);
      // Stay open for the next goal of the same week.
      this.adding.text = "";
    },

    // ---- drag and drop (pointer based, so it works with the app zoom) ----
    startCardDrag(event, card) {
      if (event.button !== 0) return;
      this.beginDrag(event, { source: "card", item: card.item, title: card.title, color: card.color });
    },
    startPoolDrag(event, project, phase) {
      if (event.button !== 0) return;
      this.beginDrag(event, { source: "pool", project: project, phase: phase, title: phase.name, color: project.color });
    },
    beginDrag(event, info) {
      this.stopListeners();
      this.drag = Object.assign({ startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false }, info);
      window.addEventListener("pointermove", this.onMove);
      window.addEventListener("pointerup", this.onUp);
      window.addEventListener("pointercancel", this.cancelDrag);
    },
    zoneAt(x, y) {
      let el = document.elementFromPoint(x, y);
      if (!el) return { week: null, pool: false };
      let week = el.closest("[data-week]");
      return { week: week ? week.getAttribute("data-week") : null, pool: !!el.closest(".ow-pool") };
    },
    onMove(event) {
      let d = this.drag;
      if (!d) return;
      d.x = event.clientX;
      d.y = event.clientY;
      if (!d.moved && Math.hypot(d.x - d.startX, d.y - d.startY) > 5) d.moved = true;
      if (d.moved) {
        let z = this.zoneAt(d.x, d.y);
        this.dropWeek = z.week;
        this.overPool = z.pool;
      }
    },
    onUp(event) {
      let d = this.drag;
      this.stopListeners();
      this.drag = null;
      this.dropWeek = null;
      this.overPool = false;
      if (!d || !d.moved) return;
      let z = this.zoneAt(event.clientX, event.clientY);
      if (d.source === "pool" && z.week) {
        this.placePhase(d.project, d.phase, z.week);
      } else if (d.source === "card") {
        if (z.week) {
          let moved = overviewFocus.moved(this.focus, d.item, z.week);
          if (moved) this.save(moved);
        } else if (z.pool) {
          this.removeItem(d.item);
        }
      }
    },
    cancelDrag() {
      this.stopListeners();
      this.drag = null;
      this.dropWeek = null;
      this.overPool = false;
    },
    stopListeners() {
      window.removeEventListener("pointermove", this.onMove);
      window.removeEventListener("pointerup", this.onUp);
      window.removeEventListener("pointercancel", this.cancelDrag);
    },
    // Esc cancels a drag in progress, or closes the goal form, without also
    // closing the whole overview.
    onKeydown(event) {
      if (event.key !== "Escape") return;
      if (this.drag) {
        this.cancelDrag();
        event.stopPropagation();
      } else if (this.adding) {
        this.adding = null;
        event.stopPropagation();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.ow {
  display: flex;
  gap: 18px;
  flex: 1 1 auto;
  min-height: 0;
  color: var(--ov-text);
}
.ov-icon-btn,
.ov-chip-btn {
  border: 1px solid var(--ov-line);
  background: var(--ov-surface);
  color: var(--ov-text);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--accent-color, #5e6ef2);
  }
}
.ov-icon-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ov-chip-btn {
  padding: 8px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ow-board {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ow-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.ow-range {
  font-weight: 600;
  margin-left: 6px;
  font-variant-numeric: tabular-nums;
}
.ow-hint {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--ov-muted);
}
.ow-weeks {
  display: grid;
  grid-template-columns: repeat(6, minmax(190px, 1fr));
  gap: 10px;
  overflow: auto;
  min-height: 0;
  padding-bottom: 8px;
  align-items: start;
}
.ow-week {
  border: 1px solid var(--ov-line);
  background: var(--ov-surface);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 220px;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;

  &.is-current {
    border-color: var(--accent-color, #5e6ef2);
  }
  &.is-drop {
    border-color: var(--accent-color, #5e6ef2);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color, #5e6ef2) 22%, transparent);
  }
}
.ow-week-head {
  display: flex;
  flex-direction: column;
  gap: 1px;

  strong {
    font-size: 0.92rem;
  }
}
.ow-week-range {
  font-size: 0.76rem;
  color: var(--ov-muted);
}
.ow-dates {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.72rem;
}
.ow-away {
  align-self: flex-start;
  max-width: 100%;
  padding: 1px 8px;
  border-radius: 999px;
  background: repeating-linear-gradient(135deg, rgba(128, 135, 160, 0.28) 0 6px, rgba(128, 135, 160, 0.16) 6px 12px);
  color: var(--ov-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ow-date {
  color: var(--ov-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  b {
    font-weight: 600;
    margin-right: 4px;
    text-transform: capitalize;
  }
  &.dk-deadline b,
  &.dk-talk b {
    color: #e8553d;
  }
  &.dk-paper b {
    color: #9b6bd6;
  }
}
.ow-date-more {
  color: var(--ov-muted);
}
.ow-cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ow-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid var(--ov-line);
  border-left: 4px solid var(--c);
  border-radius: 8px;
  background: color-mix(in srgb, var(--c) 9%, transparent);
  cursor: grab;
  user-select: none;
  touch-action: none;

  &.goal {
    border-style: dashed;
    border-left-style: solid;
  }
  &.is-done {
    opacity: 0.55;

    .ow-card-title {
      text-decoration: line-through;
    }
  }
  &.is-dragging {
    opacity: 0.35;
  }
}
.ow-check {
  margin-top: 3px;
  accent-color: var(--c);
  cursor: pointer;
  flex: 0 0 auto;
}
.ow-card-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
}
.ow-card-title {
  font-size: 0.86rem;
  font-weight: 500;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.ow-card-sub {
  font-size: 0.72rem;
  color: var(--ov-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ow-warn {
  color: #e8a33d;
  font-size: 0.85rem;
  margin-top: 2px;
}
.ow-x {
  border: 0;
  background: transparent;
  color: var(--ov-muted);
  cursor: pointer;
  padding: 2px 3px;
  border-radius: 6px;
  line-height: 1;
  flex: 0 0 auto;

  &:hover {
    color: var(--ov-text);
    background: var(--ov-line);
  }
}
.ow-empty {
  margin: 4px 0;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--ov-muted);
}
.ow-add-btn {
  margin-top: auto;
  border: 1px dashed var(--ov-line);
  background: transparent;
  color: var(--ov-muted);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: left;

  &:hover {
    color: var(--ov-text);
    border-color: var(--accent-color, #5e6ef2);
  }
}
.ow-add {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;

  input,
  select {
    width: 100%;
    font-size: 0.82rem;
    padding: 5px 7px;
    border: 1px solid var(--ov-line);
    border-radius: 6px;
    background: var(--ov-surface);
    color: var(--ov-text);
  }
}
.ow-pool {
  flex: 0 0 270px;
  overflow: auto;
  min-height: 0;
  border: 1px solid var(--ov-line);
  background: var(--ov-surface);
  border-radius: 12px;
  padding: 12px;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;

  &.is-drop {
    border-color: #d64545;
    box-shadow: 0 0 0 3px rgba(214, 69, 69, 0.2);
  }
}
.ow-pool-title {
  margin: 0 0 4px;
  font-weight: 600;
}
.ow-pool-hint {
  margin: 0 0 10px;
  font-size: 0.76rem;
  color: var(--ov-muted);
}
.ow-pool-group {
  margin-bottom: 12px;
}
.ow-pool-project {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 5px;
}
.ow-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--c);
  flex: 0 0 auto;
}
.ow-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin-bottom: 5px;
  border: 1px solid var(--ov-line);
  border-left: 4px solid var(--c);
  border-radius: 8px;
  background: color-mix(in srgb, var(--c) 9%, transparent);
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.ow-chip-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
}
.ow-chip-title {
  font-size: 0.84rem;
  font-weight: 500;
}
.ow-chip-sub {
  font-size: 0.7rem;
  color: var(--ov-muted);
}
.ow-chip-count {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--ov-line);
}
.ow-pool-empty {
  font-size: 0.82rem;
  font-style: italic;
  color: var(--ov-muted);
}
.ow-ghost {
  position: fixed;
  z-index: 3000;
  pointer-events: none;
  max-width: 240px;
  padding: 6px 10px;
  border-radius: 8px;
  border-left: 4px solid var(--c);
  background: #fff;
  color: #2b2f3a;
  font-size: 0.85rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}
</style>
