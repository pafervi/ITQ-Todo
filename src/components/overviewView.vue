<template>
  <div class="overview-view">
    <header class="ov-head">
      <h4 class="ov-title"><i class="ph ph-chart-bar-horizontal"></i> {{ $t("overview.title") }}</h4>
      <div class="ov-year-nav">
        <button type="button" class="ov-icon-btn" :title="$t('overview.prevYear')" @click="startYear--">
          <i class="ph ph-caret-left"></i>
        </button>
        <span class="ov-year-label">{{ range.label }}</span>
        <button type="button" class="ov-icon-btn" :title="$t('overview.nextYear')" @click="startYear++">
          <i class="ph ph-caret-right"></i>
        </button>
        <button type="button" class="ov-chip-btn" @click="startYear = currentYear">{{ $t("overview.thisYear") }}</button>
        <span v-if="otherYearsCount" class="ov-other-years">{{ $t("overview.otherYears", [otherYearsCount]) }}</span>
      </div>
      <div class="ov-actions">
        <button type="button" class="ov-chip-btn" :class="{ 'is-on': showDeadlines }" :aria-pressed="showDeadlines" @click="toggleDeadlines">
          <i class="ph ph-target"></i> {{ $t("overview.deadlines") }}
        </button>
        <button type="button" class="ov-chip-btn" :class="{ 'is-on': showPhases }" :aria-pressed="showPhases" @click="togglePhases">
          <i class="ph ph-flow-arrow"></i> {{ $t("overview.phases") }}
        </button>
        <button type="button" class="ov-chip-btn ov-primary" @click="newScheduled">
          <i class="ph ph-plus"></i> {{ $t("overview.addItem") }}
        </button>
        <button type="button" class="ov-chip-btn" @click="addLane">
          <i class="ph ph-rows"></i> {{ $t("overview.addLane") }}
        </button>
        <button type="button" class="ov-icon-btn" :title="$t('overview.exportMd')" @click="exportMarkdown">
          <i class="ph ph-file-text"></i>
        </button>
        <button type="button" class="ov-icon-btn" :title="$t('overview.close')" @click="close">
          <i class="ph ph-x"></i>
        </button>
      </div>
    </header>

    <div class="ov-body">
      <div class="ov-board">
        <div class="ov-grid" ref="grid">
          <div class="ov-row ov-months-row">
            <div class="ov-label"></div>
            <div class="ov-track ov-months-track">
              <div
                v-for="m in months"
                :key="m.index"
                class="ov-month"
                :class="{ 'is-current': isCurrentMonth(m) }"
                :style="{ left: m.left + '%', width: m.width + '%' }"
              >
                {{ monthLabel(m) }}
              </div>
            </div>
          </div>

          <div v-for="layout in layouts" :key="layout.lane.id" class="ov-row ov-lane" :class="{ 'is-projects': layout.virtual }">
            <div class="ov-label">
              <template v-if="layout.virtual">
                <i class="ph" :class="layout.icon"></i>
                <span class="ov-lane-name">{{ layout.lane.name }}</span>
              </template>
              <template v-else>
                <label class="ov-lane-color" :title="$t('overview.laneColor')">
                  <span class="ov-lane-dot" :style="{ backgroundColor: layout.lane.color }"></span>
                  <input type="color" :value="layout.lane.color" @change="setLaneColor(layout.lane, $event.target.value)" />
                </label>
                <input
                  class="ov-lane-input"
                  :value="layout.lane.name"
                  @change="renameLane(layout.lane, $event.target.value)"
                  @keydown.enter="$event.target.blur()"
                  spellcheck="false"
                />
                <button type="button" class="ov-lane-del" :disabled="laneIndex(layout.lane) <= 0" :title="$t('overview.moveUp')" @click="moveLane(layout.lane, -1)">
                  <i class="ph ph-caret-up"></i>
                </button>
                <button type="button" class="ov-lane-del" :disabled="laneIndex(layout.lane) >= lanes.length - 1" :title="$t('overview.moveDown')" @click="moveLane(layout.lane, 1)">
                  <i class="ph ph-caret-down"></i>
                </button>
                <button
                  type="button"
                  class="ov-lane-del"
                  :disabled="!canDeleteLane(layout.lane)"
                  :title="canDeleteLane(layout.lane) ? $t('overview.deleteLane') : $t('overview.deleteLaneBlocked')"
                  @click="deleteLane(layout.lane)"
                >
                  <i class="ph ph-trash"></i>
                </button>
              </template>
            </div>
            <div
              class="ov-track"
              :class="{ 'is-drop-target': dropLane === layout.lane.id }"
              :style="{ height: layout.rows * ROW_H + 12 + 'px' }"
              :data-lane="layout.lane.id"
              :data-editable="!layout.virtual"
              @click="onTrackClick($event, layout)"
            >
              <span v-for="m in months" :key="m.index" class="ov-gridline" :style="{ left: m.left + '%' }"></span>
              <div
                v-for="bar in layout.bars"
                :key="bar.id"
                class="ov-bar"
                :class="[
                  'kind-' + bar.kind,
                  bar.status ? 'status-' + bar.status : '',
                  { 'is-project': layout.virtual, 'is-link': !!bar.projectId || !!bar.task, 'is-phase': bar.isPhase, 'no-label': bar.noLabel, 'is-dragging': drag && drag.id === bar.id, 'clip-start': bar.geom.clippedStart, 'clip-end': bar.geom.clippedEnd },
                ]"
                :style="barStyle(bar)"
                :title="bar.tooltip"
                @pointerdown.stop="!layout.virtual && startDrag($event, bar, 'move')"
                @click.stop="onBarClick(bar)"
              >
                <template v-if="bar.kind === 'milestone'">
                  <span class="ov-diamond"></span>
                  <span v-if="!bar.noLabel" class="ov-bar-text ov-milestone-text">{{ bar.title }}</span>
                </template>
                <template v-else>
                  <span
                    v-if="!layout.virtual"
                    class="ov-handle ov-handle-start"
                    @pointerdown.stop="startDrag($event, bar, 'start')"
                  ></span>
                  <span class="ov-bar-text">{{ bar.title }}</span>
                  <span
                    v-if="!layout.virtual"
                    class="ov-handle ov-handle-end"
                    @pointerdown.stop="startDrag($event, bar, 'end')"
                  ></span>
                </template>
              </div>
            </div>
          </div>

          <div v-if="todayPct !== null" class="ov-today" :style="{ '--ov-today': todayPct / 100 }"></div>
        </div>

        <p v-if="!layouts.length" class="ov-empty">{{ $t("overview.empty") }}</p>
        <p class="ov-hint">{{ $t("overview.hint") }}</p>
      </div>

      <aside class="ov-ideas">
        <div class="ov-ideas-head">
          <h6><i class="ph ph-lightbulb"></i> {{ $t("overview.unscheduled") }}</h6>
          <button type="button" class="ov-icon-btn" :title="$t('overview.addIdea')" @click="newIdea">
            <i class="ph ph-plus"></i>
          </button>
        </div>
        <ul v-if="unscheduled.length" class="ov-ideas-list">
          <li v-for="it in unscheduled" :key="it.id" class="ov-idea" @pointerdown="startIdeaDrag($event, it)">
            <span class="ov-lane-dot" :style="{ backgroundColor: colorOf(it) }"></span>
            <span class="ov-idea-title">{{ it.title }}</span>
            <span class="ov-idea-lane">{{ laneName(it.laneId) }}</span>
          </li>
        </ul>
        <p v-else class="ov-ideas-empty">{{ $t("overview.unscheduledEmpty") }}</p>
      </aside>
    </div>

    <!-- Teleported to <body>: inside the app's zoomed container a fixed element
         is scaled, so it would drift away from the pointer when zoom != 100%. -->
    <teleport to="body">
      <div v-if="ideaDrag && ideaDrag.moved" class="ov-ghost" :style="ghostStyle">{{ ideaDrag.title }}</div>
    </teleport>

    <div v-if="editing" class="ov-editor-backdrop" @mousedown.self="closeEditor">
      <form class="ov-editor" @submit.prevent="saveEditor">
        <h6>{{ isNew ? $t("overview.newItem") : $t("overview.editItem") }}</h6>

        <label class="ov-field">
          <span>{{ $t("overview.itemTitle") }}</span>
          <input ref="titleInput" type="text" v-model="form.title" maxlength="120" />
        </label>

        <div class="ov-field-row">
          <label class="ov-field">
            <span>{{ $t("overview.kind") }}</span>
            <select v-model="form.kind">
              <option value="block">{{ $t("overview.kindBlock") }}</option>
              <option value="milestone">{{ $t("overview.kindMilestone") }}</option>
            </select>
          </label>
          <label class="ov-field">
            <span>{{ $t("overview.lane") }}</span>
            <select v-model="form.laneId">
              <option v-for="l in lanes" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </label>
        </div>

        <div class="ov-field-row">
          <label class="ov-field">
            <span>{{ form.kind === "milestone" ? $t("overview.date") : $t("overview.start") }}</span>
            <input type="date" v-model="form.startDate" />
          </label>
          <label v-if="form.kind !== 'milestone'" class="ov-field">
            <span>{{ $t("overview.end") }}</span>
            <input type="date" v-model="form.endDate" :min="form.startDate" />
          </label>
          <label class="ov-field ov-field-color">
            <span>{{ $t("overview.color") }}</span>
            <input type="color" v-model="formColor" />
          </label>
        </div>

        <label class="ov-field">
          <span>{{ $t("overview.notes") }}</span>
          <textarea v-model="form.notes" rows="3"></textarea>
        </label>

        <p v-if="!form.startDate" class="ov-field-hint">{{ $t("overview.unscheduledHint") }}</p>
        <p v-if="formError" class="ov-field-error">{{ formError }}</p>

        <div class="ov-editor-actions">
          <button v-if="!isNew" type="button" class="ov-chip-btn ov-danger" @click="removeEditing">
            <i class="ph ph-trash"></i> {{ confirmDelete ? $t("overview.confirmDelete") : $t("overview.delete") }}
          </button>
          <button v-if="!isNew && form.startDate" type="button" class="ov-chip-btn" @click="unschedule">
            {{ $t("overview.unschedule") }}
          </button>
          <span class="ov-spacer"></span>
          <button type="button" class="ov-chip-btn" @click="closeEditor">{{ $t("overview.cancel") }}</button>
          <button type="submit" class="ov-chip-btn ov-primary">{{ $t("overview.save") }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import { Modal } from "bootstrap";
import overviewHelper from "../helpers/overviewHelper";
import projectColorHelper from "../helpers/projectColorHelper";
import deadlinesHelper from "../helpers/deadlinesHelper";
import overviewMarkdown from "../helpers/overviewMarkdown";
import projectLogMarkdown from "../helpers/projectLogMarkdown";

const ROW_H = 30;
const LANE_COLORS = ["#5e6ef2", "#2fb590", "#e8a33d", "#d9578c", "#7a8aa0", "#9b6bd6"];
const PROJECTS_LANE = "__projects__";
const DEADLINES_LANE = "__deadlines__";
const TOGGLES_KEY = "latticetodo.overview.toggles";

export default {
  name: "overviewView",
  data() {
    return {
      ROW_H: ROW_H,
      startYear: overviewHelper.academicYearOf(),
      currentYear: overviewHelper.academicYearOf(),
      editing: false,
      isNew: false,
      form: this.blankForm(),
      formError: "",
      drag: null,
      dragMoved: false,
      ideaDrag: null,
      confirmDelete: false,
      suppressClickUntil: 0,
      showDeadlines: true,
      showPhases: false,
      deadlineTasks: [],
    };
  },
  computed: {
    range() {
      return overviewHelper.yearRange(this.startYear);
    },
    months() {
      return overviewHelper.months(this.startYear);
    },
    lanes() {
      return this.$store.getters.overviewLanes;
    },
    items() {
      return this.$store.getters.overviewItems;
    },
    unscheduled() {
      return this.items.filter((it) => !it.startDate);
    },
    ghostStyle() {
      let d = this.ideaDrag;
      if (!d) return {};
      let dark = !!this.$store.getters.config.darkTheme;
      return {
        left: d.x + "px",
        top: d.y + "px",
        color: dark ? "#ffffff" : "#2b2f3a",
        borderColor: d.color,
        background: "color-mix(in srgb, " + d.color + " 38%, " + (dark ? "#121a33" : "#ffffff") + ")",
      };
    },
    dropLane() {
      if (this.drag && this.dragMoved && this.drag.mode === "move") return this.drag.targetLane;
      if (this.ideaDrag && this.ideaDrag.moved) return this.ideaDrag.targetLane;
      return null;
    },
    phasedProjectIds() {
      return (this.$store.getters.cTodoListIds || []).filter((p) => p && p.type === "phased" && !p.archived).map((p) => p.listId);
    },
    deadlineItems() {
      let lists = this.$store.getters.cTodoListIds || [];
      return this.deadlineTasks
        .map((t) => {
          // Task deadlines are stored as YYYYMMDD; accept ISO dates too.
          let d = moment(t.deadline, ["YYYYMMDD", overviewHelper.FMT], true);
          if (!d.isValid()) return null;
          let project = lists.find((l) => l && String(l.listId) === String(t.listId));
          return {
            id: "dl-" + t.listId + "-" + t.index,
            task: { listId: t.listId, index: t.index },
            date: d.format(overviewHelper.FMT),
            title: t.text,
            listName: project ? project.listName : "",
            color: project ? project.color || projectColorHelper.solidFor(project.listId) : "#e8a33d",
          };
        })
        .filter(Boolean);
    },
    todayPct() {
      let p = overviewHelper.pct(this.range, moment().format(overviewHelper.FMT));
      return p !== null && p >= 0 && p <= 100 ? p : null;
    },
    formColor: {
      get() {
        return this.form.color || this.laneColor(this.form.laneId);
      },
      set(v) {
        this.form.color = v;
      },
    },
    projectBars() {
      // A phased project without explicit start/end dates takes its range
      // from its phases, so it still shows up on the board.
      let phases = this.$store.getters.phases || {};
      let entries = (this.$store.getters.cTodoListIds || []).map((p) => {
        if (!p || p.type !== "phased") return p;
        let hasRange = overviewHelper.parse(p.startDate) && overviewHelper.parse(p.endDate);
        let list = phases[p.listId] || [];
        if (hasRange || !list.length) return p;
        let starts = list.map((ph) => ph.startDate).filter((d) => overviewHelper.parse(d)).sort();
        let ends = list.map((ph) => ph.endDate).filter((d) => overviewHelper.parse(d)).sort();
        if (!starts.length || !ends.length) return p;
        return { ...p, startDate: starts[0], endDate: ends[ends.length - 1] };
      });
      return overviewHelper.projectBars(entries, (id) => projectColorHelper.solidFor(id));
    },
    otherYearsCount() {
      return this.items.filter((it) => it.startDate && !overviewHelper.geometry(this.range, it.startDate, it.endDate)).length;
    },
    language() {
      return this.$store.getters.config.language;
    },
    layouts() {
      let out = [];
      let range = this.range;
      let phasesById = this.$store.getters.phases || {};

      // Projects (optionally followed by their phases, one group per project).
      let projects = this.projectBars.filter((p) => overviewHelper.geometry(range, p.startDate, p.endDate));
      if (this.projectBars.length) {
        let bars = [];
        let rows = 1;
        let projectBar = (p, row) => ({
          id: "prj-" + p.id,
          projectId: p.id,
          kind: "block",
          title: p.name,
          color: p.color,
          row: row,
          geom: overviewHelper.geometry(range, p.startDate, p.endDate),
          tooltip: p.name + " (" + p.startDate + " to " + p.endDate + ")",
        });
        if (this.showPhases) {
          rows = 0;
          projects
            .slice()
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .forEach((p) => {
              bars.push(projectBar(p, rows));
              rows += 1;
              let phases = (phasesById[p.id] || []).filter((ph) => overviewHelper.geometry(range, ph.startDate, ph.endDate));
              if (!phases.length) return;
              let pack = overviewHelper.packRows(phases, 1);
              phases.forEach((ph) =>
                bars.push({
                  id: "ph-" + ph.id,
                  projectId: p.id,
                  isPhase: true,
                  status: ph.status || "pending",
                  kind: "block",
                  title: ph.name,
                  color: p.color,
                  row: rows + pack.rows[ph.id],
                  geom: overviewHelper.geometry(range, ph.startDate, ph.endDate),
                  tooltip: p.name + ": " + ph.name + " (" + ph.startDate + " to " + ph.endDate + ", " + (ph.status || "pending") + ")",
                })
              );
              rows += pack.count;
            });
          rows = Math.max(rows, 1);
        } else {
          let pack = overviewHelper.packRows(projects);
          projects.forEach((p) => bars.push(projectBar(p, pack.rows[p.id])));
          rows = pack.count;
        }
        out.push({ virtual: true, icon: "ph-kanban", lane: { id: PROJECTS_LANE, name: this.$t("overview.projects"), color: "" }, rows: rows, bars: bars });
      }

      // Task deadlines, drawn as small unlabelled diamonds (title in the tooltip).
      if (this.showDeadlines) {
        let pts = this.deadlineItems.filter((d) => overviewHelper.geometry(range, d.date, d.date));
        if (pts.length) {
          let pack = overviewHelper.packRows(
            pts.map((d) => ({ id: d.id, startDate: d.date, endDate: d.date })),
            6
          );
          out.push({
            virtual: true,
            icon: "ph-target",
            lane: { id: DEADLINES_LANE, name: this.$t("overview.deadlines"), color: "" },
            rows: pack.count,
            bars: pts.map((d) => ({
              id: d.id,
              task: d.task,
              kind: "milestone",
              noLabel: true,
              title: d.title,
              color: d.color,
              row: pack.rows[d.id],
              geom: overviewHelper.geometry(range, d.date, d.date),
              tooltip: d.title + " (" + d.date + (d.listName ? ", " + d.listName : "") + ")",
            })),
          });
        }
      }

      this.lanes.forEach((lane) => {
        let mine = this.items.filter((it) => it.startDate && this.effectiveLane(it) === lane.id);
        let visible = mine.filter((it) => overviewHelper.geometry(range, it.startDate, it.endDate));
        // A milestone's label needs room to its right, so it reserves ~2 weeks when packing rows.
        let pack = overviewHelper.packRows(
          visible.map((it) => ({ id: it.id, startDate: it.startDate, endDate: it.kind === "milestone" ? overviewHelper.shiftDate(it.startDate, 16) : it.endDate }))
        );
        out.push({
          virtual: false,
          lane: lane,
          rows: pack.count,
          bars: visible.map((it) => {
            let eff = this.effectiveDates(it);
            return {
              id: it.id,
              item: it,
              kind: it.kind || "block",
              title: it.title,
              color: it.color || lane.color,
              row: pack.rows[it.id],
              geom: overviewHelper.geometry(range, eff.startDate, eff.endDate),
              tooltip: it.title + " (" + eff.startDate + (eff.endDate !== eff.startDate ? " to " + eff.endDate : "") + ")" + (it.notes ? "\n" + it.notes : ""),
            };
          }),
        });
      });
      return out;
    },
  },
  async mounted() {
    try {
      let saved = JSON.parse(localStorage.getItem(TOGGLES_KEY) || "null");
      if (saved) {
        this.showDeadlines = saved.showDeadlines !== false;
        this.showPhases = !!saved.showPhases;
      }
    } catch (e) {
      /* storage unavailable: keep defaults */
    }
    window.addEventListener("keydown", this.onKeydown);
    let taskModal = document.getElementById("toDoModal");
    if (taskModal) taskModal.addEventListener("hidden.bs.modal", this.onTaskModalHidden);
    this.loadDeadlines();
    this.ensurePhases();
    await this.$store.dispatch("loadOverview");
    if (this.$store.getters.overviewFresh && !this.lanes.length) {
      let names = [this.$t("overview.laneResearch"), this.$t("overview.laneTeaching"), this.$t("overview.laneWriting"), this.$t("overview.laneAdmin")];
      await this.$store.dispatch(
        "saveOverviewLanes",
        names.map((name, i) => ({ id: overviewHelper.newId("lane"), name: name, color: LANE_COLORS[i % LANE_COLORS.length] }))
      );
    }
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.onKeydown);
    let taskModal = document.getElementById("toDoModal");
    if (taskModal) taskModal.removeEventListener("hidden.bs.modal", this.onTaskModalHidden);
    this.stopDragListeners();
    this.stopIdeaListeners();
  },
  methods: {
    blankForm() {
      return { id: "", laneId: "", kind: "block", title: "", startDate: "", endDate: "", color: "", notes: "" };
    },
    saveToggles() {
      try {
        localStorage.setItem(TOGGLES_KEY, JSON.stringify({ showDeadlines: this.showDeadlines, showPhases: this.showPhases }));
      } catch (e) {
        /* storage unavailable: the toggle just will not be remembered */
      }
    },
    toggleDeadlines() {
      this.showDeadlines = !this.showDeadlines;
      this.saveToggles();
    },
    togglePhases() {
      this.showPhases = !this.showPhases;
      this.saveToggles();
      this.ensurePhases();
    },
    loadDeadlines() {
      deadlinesHelper.getTasksWithDeadline().then((tasks) => {
        this.deadlineTasks = tasks || [];
      });
    },
    // Phases are loaded per phased project: they feed the phase rows and the
    // range of phased projects that have no explicit dates.
    ensurePhases() {
      this.phasedProjectIds.forEach((id) => {
        if (!this.$store.getters.phases[id]) this.$store.dispatch("loadPhases", id);
      });
    },
    close() {
      this.$store.commit("setOverviewOpen", false);
    },
    onKeydown(event) {
      if (event.key !== "Escape") return;
      if (this.drag || this.ideaDrag) {
        this.cancelDrags();
        event.stopPropagation();
      } else if (this.editing) {
        this.closeEditor();
        event.stopPropagation();
      }
    },
    cancelDrags() {
      this.stopDragListeners();
      this.stopIdeaListeners();
      this.drag = null;
      this.dragMoved = false;
      this.ideaDrag = null;
    },
    exportMarkdown() {
      let phases = {};
      this.projectBars.forEach((p) => (phases[p.id] = (this.$store.getters.phases || {})[p.id] || []));
      let text = overviewMarkdown.build({
        startYear: this.startYear,
        lanes: this.lanes,
        items: this.items,
        projects: this.projectBars,
        phases: phases,
        deadlines: this.deadlineItems,
      });
      projectLogMarkdown.download(overviewMarkdown.filename(this.startYear), text);
    },
    onBarClick(bar) {
      if (bar.task) this.openTask(bar.task);
      else if (bar.projectId) this.goToProject(bar.projectId);
    },
    // Opens the regular task editor (same flow as the deadlines modal). The
    // list is loaded first because only mounted lists live in the store.
    openTask(task) {
      this.$store.dispatch("loadTodoLists", task.listId).then(() => {
        let list = this.$store.getters.todoLists[task.listId];
        let todo = list ? list[task.index] : null;
        if (!todo) return;
        this.$store.commit("actionsSelectedTodoIdUpdate", { toDo: todo, index: task.index });
        let el = document.getElementById("toDoModal");
        if (!el) return;
        Modal.getOrCreateInstance(el, { keyboard: false }).show();
      });
    },
    onTaskModalHidden() {
      // The task may have been edited, completed or re-dated.
      this.loadDeadlines();
    },
    goToProject(id) {
      this.close();
      this.$nextTick(() => {
        let el = document.getElementById("list" + id);
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
    },
    laneIndex(lane) {
      return this.lanes.findIndex((l) => l.id === lane.id);
    },
    moveLane(lane, dir) {
      let i = this.laneIndex(lane);
      let j = i + dir;
      if (i < 0 || j < 0 || j >= this.lanes.length) return;
      let next = this.lanes.slice();
      [next[i], next[j]] = [next[j], next[i]];
      this.$store.dispatch("saveOverviewLanes", next);
    },
    setLaneColor(lane, color) {
      this.$store.dispatch(
        "saveOverviewLanes",
        this.lanes.map((l) => (l.id === lane.id ? { ...l, color: color } : l))
      );
    },
    monthLabel(m) {
      return moment({ year: m.year, month: m.month, day: 1 }).locale(this.language).format("MMM") + (m.month === 0 ? " " + m.year : "");
    },
    isCurrentMonth(m) {
      let now = moment();
      return now.year() === m.year && now.month() === m.month;
    },
    effectiveLane(it) {
      return this.lanes.some((l) => l.id === it.laneId) ? it.laneId : this.lanes.length ? this.lanes[0].id : "";
    },
    laneColor(id) {
      let l = this.lanes.find((x) => x.id === id);
      return l ? l.color : LANE_COLORS[0];
    },
    laneName(id) {
      let l = this.lanes.find((x) => x.id === id);
      return l ? l.name : "";
    },
    colorOf(it) {
      return it.color || this.laneColor(it.laneId);
    },
    barStyle(bar) {
      return {
        left: bar.geom.left + "%",
        width: bar.kind === "milestone" ? "auto" : bar.geom.width + "%",
        top: bar.row * ROW_H + 6 + (bar.isPhase ? 3 : 0) + "px",
        "--ov-color": bar.color || LANE_COLORS[0],
        transform: this.drag && this.drag.id === bar.id && this.dragMoved && this.drag.mode === "move" ? "translateY(" + this.drag.dy + "px)" : undefined,
      };
    },

    // Lanes
    addLane() {
      let color = LANE_COLORS[this.lanes.length % LANE_COLORS.length];
      this.$store.dispatch("saveOverviewLanes", [...this.lanes, { id: overviewHelper.newId("lane"), name: this.$t("overview.newLane"), color: color }]);
    },
    renameLane(lane, name) {
      let clean = String(name || "").trim() || lane.name;
      this.$store.dispatch(
        "saveOverviewLanes",
        this.lanes.map((l) => (l.id === lane.id ? { ...l, name: clean } : l))
      );
    },
    canDeleteLane(lane) {
      return this.lanes.length > 1 && !this.items.some((it) => it.laneId === lane.id);
    },
    deleteLane(lane) {
      if (!this.canDeleteLane(lane)) return;
      this.$store.dispatch(
        "saveOverviewLanes",
        this.lanes.filter((l) => l.id !== lane.id)
      );
    },

    // Editor
    defaultLane() {
      return this.lanes.length ? this.lanes[0].id : "";
    },
    newScheduled() {
      let today = moment().format(overviewHelper.FMT);
      this.openEditor({ ...this.blankForm(), laneId: this.defaultLane(), startDate: today, endDate: overviewHelper.shiftDate(today, 13) }, true);
    },
    newIdea() {
      this.openEditor({ ...this.blankForm(), laneId: this.defaultLane() }, true);
    },
    openEditor(item, isNew) {
      this.form = { ...this.blankForm(), ...item, laneId: this.lanes.some((l) => l.id === item.laneId) ? item.laneId : this.defaultLane() };
      this.isNew = !!isNew;
      this.formError = "";
      this.confirmDelete = false;
      this.editing = true;
      this.$nextTick(() => this.$refs.titleInput && this.$refs.titleInput.focus());
    },
    closeEditor() {
      this.editing = false;
    },
    async saveEditor() {
      let item = overviewHelper.normalizeItem(this.form);
      if (!item.title) {
        this.formError = this.$t("overview.titleRequired");
        return;
      }
      if (!item.id) item.id = overviewHelper.newId("ov");
      await this.$store.dispatch("saveOverviewItem", item);
      this.editing = false;
      // Jump to the year that contains a newly scheduled item.
      if (item.startDate) this.startYear = overviewHelper.academicYearOf(item.startDate);
    },
    unschedule() {
      this.form.startDate = "";
      this.form.endDate = "";
    },
    async removeEditing() {
      if (!this.confirmDelete) {
        this.confirmDelete = true;
        return;
      }
      if (this.form.id) await this.$store.dispatch("deleteOverviewItem", this.form.id);
      this.editing = false;
    },
    dateAtX(track, clientX) {
      let rect = track.getBoundingClientRect();
      if (!rect.width) return null;
      let day = Math.floor(((clientX - rect.left) / rect.width) * this.range.days);
      return this.range.start.clone().add(Math.max(0, Math.min(day, this.range.days - 1)), "days").format(overviewHelper.FMT);
    },
    // Id of the editable lane under the pointer, or null (virtual lanes are not drop targets).
    laneAtPoint(x, y, ignoreX) {
      let grid = this.$refs.grid;
      if (!grid) return null;
      let tracks = grid.querySelectorAll('.ov-track[data-editable="true"]');
      for (let t of tracks) {
        let r = t.getBoundingClientRect();
        if (y >= r.top && y <= r.bottom && (ignoreX || (x >= r.left && x <= r.right))) return t.dataset.lane;
      }
      return null;
    },
    trackOf(laneId) {
      return this.$refs.grid && this.$refs.grid.querySelector('.ov-track[data-lane="' + laneId + '"]');
    },
    onTrackClick(event, layout) {
      if (layout.virtual || Date.now() < this.suppressClickUntil) return;
      let start = this.dateAtX(event.currentTarget, event.clientX);
      if (!start) return;
      this.openEditor({ ...this.blankForm(), laneId: layout.lane.id, startDate: start, endDate: overviewHelper.shiftDate(start, 13) }, true);
    },

    // Drag to move / resize
    effectiveDates(it) {
      if (!this.drag || this.drag.id !== it.id) return { startDate: it.startDate, endDate: it.endDate };
      let d = this.drag.deltaDays;
      if (this.drag.mode === "move") return { startDate: overviewHelper.shiftDate(it.startDate, d), endDate: overviewHelper.shiftDate(it.endDate, d) };
      if (this.drag.mode === "start") {
        let s = overviewHelper.shiftDate(it.startDate, d);
        return { startDate: s > it.endDate ? it.endDate : s, endDate: it.endDate };
      }
      let e = overviewHelper.shiftDate(it.endDate, d);
      return { startDate: it.startDate, endDate: e < it.startDate ? it.startDate : e };
    },
    startDrag(event, bar, mode) {
      if (event.button !== undefined && event.button !== 0) return;
      let track = event.currentTarget.closest(".ov-track");
      if (!track || !bar.item) return;
      let width = track.getBoundingClientRect().width;
      this.drag = {
        id: bar.id,
        mode: bar.kind === "milestone" ? "move" : mode,
        startX: event.clientX,
        startY: event.clientY,
        pxPerDay: width / this.range.days,
        deltaDays: 0,
        dy: 0,
        targetLane: this.effectiveLane(bar.item),
      };
      this.dragMoved = false;
      window.addEventListener("pointermove", this.onDragMove);
      window.addEventListener("pointerup", this.onDragEnd);
      window.addEventListener("pointercancel", this.cancelDrags);
    },
    onDragMove(event) {
      if (!this.drag) return;
      let dx = event.clientX - this.drag.startX;
      let dy = event.clientY - this.drag.startY;
      if (Math.abs(dx) > 4 || (this.drag.mode === "move" && Math.abs(dy) > 4)) this.dragMoved = true;
      this.drag.deltaDays = this.dragMoved ? Math.round(dx / this.drag.pxPerDay) : 0;
      if (this.drag.mode === "move" && this.dragMoved) {
        this.drag.dy = dy;
        let lane = this.laneAtPoint(event.clientX, event.clientY, true);
        if (lane) this.drag.targetLane = lane;
      }
    },
    async onDragEnd() {
      let drag = this.drag;
      let moved = this.dragMoved;
      this.stopDragListeners();
      // A drag that ends over the empty track would otherwise fire a "click on track".
      if (moved) this.suppressClickUntil = Date.now() + 300;
      if (!drag) return;
      let item = this.items.find((x) => x.id === drag.id);
      if (!item) {
        this.drag = null;
        return;
      }
      if (!moved) {
        this.drag = null;
        this.openEditor(item);
        return;
      }
      let eff = this.effectiveDates(item);
      let lane = drag.mode === "move" && drag.targetLane ? drag.targetLane : item.laneId;
      this.drag = null;
      this.dragMoved = false;
      if (eff.startDate !== item.startDate || eff.endDate !== item.endDate || lane !== this.effectiveLane(item)) {
        await this.$store.dispatch("saveOverviewItem", overviewHelper.normalizeItem({ ...item, startDate: eff.startDate, endDate: eff.endDate, laneId: lane }));
      }
    },
    // Drag an idea from the side panel onto a lane to schedule it.
    startIdeaDrag(event, item) {
      if (event.button !== undefined && event.button !== 0) return;
      this.ideaDrag = {
        id: item.id,
        title: item.title,
        color: this.colorOf(item),
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
        targetLane: null,
      };
      window.addEventListener("pointermove", this.onIdeaMove);
      window.addEventListener("pointerup", this.onIdeaEnd);
      window.addEventListener("pointercancel", this.cancelDrags);
    },
    onIdeaMove(event) {
      let d = this.ideaDrag;
      if (!d) return;
      d.x = event.clientX;
      d.y = event.clientY;
      if (!d.moved && Math.hypot(d.x - d.startX, d.y - d.startY) > 4) d.moved = true;
      d.targetLane = d.moved ? this.laneAtPoint(d.x, d.y, false) : null;
    },
    async onIdeaEnd() {
      let d = this.ideaDrag;
      this.stopIdeaListeners();
      this.ideaDrag = null;
      if (!d) return;
      if (d.moved) this.suppressClickUntil = Date.now() + 300;
      let item = this.items.find((x) => x.id === d.id);
      if (!item) return;
      if (!d.moved) {
        this.openEditor(item);
        return;
      }
      let track = d.targetLane ? this.trackOf(d.targetLane) : null;
      let start = track ? this.dateAtX(track, d.x) : null;
      if (!start) return;
      let end = item.kind === "milestone" ? start : overviewHelper.shiftDate(start, 13);
      await this.$store.dispatch("saveOverviewItem", overviewHelper.normalizeItem({ ...item, laneId: d.targetLane, startDate: start, endDate: end }));
    },
    stopIdeaListeners() {
      window.removeEventListener("pointermove", this.onIdeaMove);
      window.removeEventListener("pointerup", this.onIdeaEnd);
      window.removeEventListener("pointercancel", this.cancelDrags);
    },
    stopDragListeners() {
      window.removeEventListener("pointermove", this.onDragMove);
      window.removeEventListener("pointerup", this.onDragEnd);
      window.removeEventListener("pointercancel", this.cancelDrags);
    },
  },
};
</script>

<style lang="scss" scoped>
.overview-view {
  --ov-label-w: 170px;
  --ov-line: rgba(0, 0, 0, 0.08);
  --ov-surface: rgba(255, 255, 255, 0.96);
  --ov-text: #2b2f3a;
  --ov-muted: #7b8294;
  --ov-bar-text: #2b2f3a;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 18px 24px 12px;
  color: var(--ov-text);
  overflow: hidden;

  .dark-theme & {
    --ov-line: rgba(255, 255, 255, 0.09);
    --ov-surface: rgba(18, 26, 51, 0.92);
    // White typography on the dark theme, everywhere in the view.
    --ov-text: #ffffff;
    --ov-muted: #c5cce2;
    --ov-bar-text: #ffffff;
  }
}

.ov-head {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.ov-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ov-year-nav,
.ov-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ov-actions {
  margin-left: auto;
}
.ov-year-label {
  min-width: 70px;
  text-align: center;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
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
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
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

  &.is-on {
    border-color: var(--accent-color, #5e6ef2);
    background: color-mix(in srgb, var(--accent-color, #5e6ef2) 16%, transparent);
  }
  &.ov-primary {
    background: var(--accent-color, #5e6ef2);
    border-color: var(--accent-color, #5e6ef2);
    color: #fff;
  }
  &.ov-danger {
    color: #d64545;
  }
}

.ov-body {
  display: flex;
  gap: 18px;
  flex: 1 1 auto;
  min-height: 0;
}
.ov-board {
  flex: 1 1 auto;
  min-width: 0;
  overflow: auto;
  background: var(--ov-surface);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04);
  padding: 8px 0 4px;

  .dark-theme & {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
}
.ov-grid {
  position: relative;
  min-width: 860px;
}
.ov-row {
  display: grid;
  grid-template-columns: var(--ov-label-w) 1fr;
  border-top: 1px solid var(--ov-line);

  &.ov-months-row {
    border-top: none;
    position: sticky;
    top: 0;
    z-index: 3;
    background: var(--ov-surface);
  }
}
.ov-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 8px 0 16px;
  font-size: 0.88rem;
  font-weight: 600;
  min-width: 0;
}
.ov-lane.is-projects .ov-label {
  color: var(--ov-muted);
}
.ov-lane-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ov-lane-color {
  position: relative;
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-top: 5px;
  cursor: pointer;

  .ov-lane-dot {
    margin-top: 0;
  }
  input {
    position: absolute;
    inset: -3px;
    width: calc(100% + 6px);
    height: calc(100% + 6px);
    opacity: 0;
    cursor: pointer;
    padding: 0;
    border: none;
  }
}
.ov-other-years {
  font-size: 0.78rem;
  color: var(--ov-muted);
}
.ov-lane-dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-top: 5px;
}
.ov-lane-input {
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0 4px;
  border-radius: 6px;

  &:hover,
  &:focus {
    border-color: var(--ov-line);
    outline: none;
  }
}
.ov-lane-del {
  border: none;
  background: transparent;
  color: var(--ov-muted);
  opacity: 0;
  cursor: pointer;
  padding: 0 2px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0 !important;
  }
}
.ov-label:hover .ov-lane-del:not(:disabled) {
  opacity: 1;
}

.ov-track {
  position: relative;
  min-height: 42px;
  cursor: crosshair;
}
.ov-months-track {
  height: 30px;
  cursor: default;
}
.ov-month {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: capitalize;
  color: var(--ov-muted);

  &.is-current {
    color: var(--accent-color, #5e6ef2);
  }
}
.ov-gridline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--ov-line);
  pointer-events: none;
}
.ov-today {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--ov-label-w) + (100% - var(--ov-label-w)) * var(--ov-today));
  width: 2px;
  background: var(--accent-color, #5e6ef2);
  opacity: 0.7;
  pointer-events: none;
  z-index: 2;
}

.ov-bar {
  position: absolute;
  height: 24px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  background: color-mix(in srgb, var(--ov-color) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--ov-color) 70%, transparent);
  border-left: 4px solid var(--ov-color);
  border-radius: 6px;
  font-size: 0.78rem;
  color: var(--ov-bar-text);
  cursor: grab;
  user-select: none;
  touch-action: none;
  z-index: 1;

  &.is-dragging {
    cursor: grabbing;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 4;
  }
  &.is-project {
    cursor: default;
    &.is-link {
      cursor: pointer;
    }
    background: color-mix(in srgb, var(--ov-color) 14%, transparent);
    border-style: dashed;
    border-left-style: solid;
  }
  &.is-phase {
    height: 18px;
    font-size: 0.72rem;
    border-radius: 5px;
    border-left-width: 3px;
    background: color-mix(in srgb, var(--ov-color) 10%, transparent);

    &.status-active {
      background: color-mix(in srgb, var(--ov-color) 34%, transparent);
    }
    &.status-done {
      opacity: 0.6;
      .ov-bar-text {
        text-decoration: line-through;
      }
    }
    &.status-blocked {
      border-color: #d64545;
      border-left-color: #d64545;
    }
  }
  &.no-label .ov-diamond {
    width: 10px;
    height: 10px;
    margin-left: -5px;
  }
  &.clip-start {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
  &.clip-end {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  &.kind-milestone {
    background: transparent;
    border: none;
    gap: 6px;
    overflow: visible;
    white-space: nowrap;
  }
}
.ov-bar-text {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ov-milestone-text {
  flex: 0 0 auto;
  padding: 0;
  overflow: visible;
}
.ov-diamond {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  background: var(--ov-color);
  transform: rotate(45deg);
  border-radius: 2px;
}
.ov-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
}
.ov-handle-start {
  left: 0;
}
.ov-handle-end {
  right: 0;
}

.ov-empty,
.ov-hint {
  margin: 10px 16px;
  font-size: 0.8rem;
  color: var(--ov-muted);
}

.ov-ideas {
  flex: 0 0 230px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--ov-surface);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04);

  .dark-theme & {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
}
.ov-ideas-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  h6 {
    margin: 0;
    font-size: 0.88rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}
.ov-ideas-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: auto;
}
.ov-idea {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 6px;
  border-radius: 8px;
  cursor: grab;
  user-select: none;
  touch-action: none;
  font-size: 0.84rem;

  &:hover {
    background: color-mix(in srgb, var(--accent-color, #5e6ef2) 10%, transparent);
  }
  .ov-lane-dot {
    margin-top: 0;
  }
}
.ov-idea-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ov-idea-lane {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: var(--ov-muted);
}
.ov-ghost {
  position: fixed;
  z-index: 1070;
  transform: translate(10px, 10px);
  pointer-events: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}
.ov-track.is-drop-target {
  background: color-mix(in srgb, var(--accent-color, #5e6ef2) 10%, transparent);
}
.ov-ideas-empty {
  font-size: 0.8rem;
  color: var(--ov-muted);
}

.ov-editor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1060;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 14, 28, 0.42);
}
.ov-editor {
  width: min(460px, calc(100vw - 32px));
  background: #fff;
  color: #2b2f3a;
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 12px;

  .dark-theme & {
    background: #121a33;
    color: #ffffff;
  }
  h6 {
    margin: 0;
    font-size: 1rem;
  }
}
.ov-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 0;
  min-width: 0;
  font-size: 0.78rem;
  color: var(--ov-muted);

  input,
  select,
  textarea {
    border: 1px solid rgba(128, 135, 160, 0.4);
    background: transparent;
    color: inherit;
    border-radius: 8px;
    padding: 7px 9px;
    font-size: 0.9rem;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: var(--accent-color, #5e6ef2);
    }
  }
  select option {
    color: #2b2f3a;
  }
}
.ov-field-color {
  flex: 0 0 70px;
  input {
    padding: 2px;
    height: 36px;
  }
}
.ov-field-row {
  display: flex;
  gap: 10px;
}
.ov-field-hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ov-muted);
}
.ov-field-error {
  margin: 0;
  font-size: 0.8rem;
  color: #d64545;
}
.ov-editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ov-spacer {
  flex: 1 1 auto;
}
</style>
