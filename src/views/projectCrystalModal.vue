<template>
  <div class="modal fade crystal-modal" id="projectCrystalModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content crystal-content" :style="rootStyle">
        <!-- Hero stage: the project's framework rotating in 3D, with its
             open tasks orbiting around it. Vacant lattice sites visualise
             the open-task count: every unchecked task gets a glow at one
             of the ring's vertices, overdue ones are red. -->
        <div class="crystal-stage">
          <div class="crystal-close" data-bs-dismiss="modal" :title="$t('ui.close') || 'Close'">
            <i class="bi-x"></i>
          </div>

          <div class="crystal-header">
            <div class="crystal-eyebrow">{{ project.framework.code }} · {{ project.framework.ring }}</div>
            <h1 class="crystal-title">{{ project.name }}</h1>
            <div class="crystal-subtitle">{{ project.framework.fullName }}</div>
          </div>

          <div class="crystal-sky" aria-hidden="true">
            <div class="crystal-rotor">
              <!-- Three stacked rings at different depths = a cheap but
                   effective 3D unit-cell feeling, built purely from CSS
                   transforms. -->
              <svg class="crystal-ring crystal-ring-back"
                viewBox="-50 -50 100 100">
                <polygon
                  :points="project.framework.polygonPoints"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0.9"
                  stroke-linejoin="round"
                />
              </svg>
              <svg class="crystal-ring crystal-ring-main"
                viewBox="-50 -50 100 100">
                <polygon
                  :points="project.framework.polygonPoints"
                  fill="currentColor"
                  fill-opacity="0.05"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linejoin="round"
                />
                <!-- Vertex dots marking "lattice sites": one per vertex of
                     the polygon. Site state (occupied / overdue / open)
                     comes from the sites[] computed. -->
                <circle
                  v-for="(s, i) in sites"
                  :key="'v-' + i"
                  :cx="s.x"
                  :cy="s.y"
                  :r="s.r"
                  :class="['site-dot', 'site-' + s.state]"
                >
                  <animate v-if="s.state === 'overdue'"
                    attributeName="r"
                    :values="s.r + ';' + (s.r + 1.4) + ';' + s.r"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
              <svg class="crystal-ring crystal-ring-front"
                viewBox="-50 -50 100 100">
                <polygon
                  :points="project.framework.polygonPoints"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0.7"
                  stroke-linejoin="round"
                />
                <circle cx="0" cy="0" r="2.4" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Flanking info panels -->
        <div class="crystal-panels">
          <div class="crystal-panel panel-stats">
            <div class="panel-head">{{ $t('ui.crystalStats') || 'This project' }}</div>
            <div class="stat-row">
              <span class="stat-value">{{ stats.open }}</span>
              <span class="stat-label">{{ $t('ui.crystalOpen') || 'open' }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">{{ stats.done }}</span>
              <span class="stat-label">{{ $t('ui.crystalDone') || 'done' }}</span>
            </div>
            <div class="stat-row" v-if="stats.overdue > 0">
              <span class="stat-value stat-overdue">{{ stats.overdue }}</span>
              <span class="stat-label">{{ $t('ui.crystalOverdue') || 'overdue' }}</span>
            </div>
            <div class="stat-row" v-if="stats.nextDeadlineLabel">
              <span class="stat-value stat-deadline">{{ stats.nextDeadlineLabel }}</span>
              <span class="stat-label">{{ $t('ui.crystalNextDeadline') || 'next deadline' }}</span>
            </div>
            <div class="stat-progress">
              <div class="stat-progress-fill" :style="{ width: stats.percent + '%' }"></div>
            </div>
          </div>

          <div class="crystal-panel panel-tasks">
            <div class="panel-head">
              {{ $t('ui.crystalOpenTasks') || 'Open tasks' }}
              <span class="panel-head-count">{{ openTasks.length }}</span>
            </div>
            <ul class="crystal-task-list">
              <li v-for="(t, i) in openTasks.slice(0, 10)" :key="i"
                :class="{ overdue: t.isOverdue, 'has-deadline': !!t.deadline }"
                @click="openTask(t)">
                <span class="ct-dot" :style="{ background: t.isOverdue ? '#ed544b' : 'currentColor' }"></span>
                <span class="ct-text">{{ t.text }}</span>
                <span v-if="t.deadlineLabel" class="ct-deadline">{{ t.deadlineLabel }}</span>
              </li>
              <li v-if="!openTasks.length" class="ct-empty">
                <i class="ph ph-sparkle"></i>
                {{ $t('ui.crystalAllClear') || 'All clear. Breathe.' }}
              </li>
            </ul>
          </div>

          <div class="crystal-panel panel-framework">
            <div class="panel-head">
              {{ $t('ui.crystalFramework') || 'Framework' }}
              <button type="button" class="fw-change-btn"
                v-if="listId"
                @click.stop="pickerOpen = !pickerOpen"
                :title="$t('ui.crystalChange') || 'Change framework'">
                <i class="ph ph-swap"></i>
                {{ $t('ui.crystalChange') || 'change' }}
              </button>
            </div>
            <div class="fw-code-row">
              <span class="fw-code">{{ project.framework.code }}</span>
              <span class="fw-ring">{{ project.framework.ring }}</span>
              <span v-if="project.framework.itq" class="fw-itq-badge" title="Made at the ITQ">ITQ · {{ project.framework.year || '' }}</span>
              <span v-if="hasOverride" class="fw-override-badge" :title="$t('ui.crystalResetTitle') || 'Reset to auto'" @click.stop="resetFramework">
                <i class="ph ph-arrow-counter-clockwise"></i>
              </span>
            </div>
            <p class="fw-note">{{ project.framework.note }}</p>

            <!-- Framework picker: scrollable grid of all 25 IZA codes.
                 Clicking one persists the choice on the project record. -->
            <div v-if="pickerOpen" class="fw-picker">
              <div class="fw-picker-head">{{ $t('ui.crystalPickOne') || 'Pick a zeolite' }}</div>
              <div class="fw-picker-grid">
                <button type="button"
                  v-for="fw in allFrameworks"
                  :key="fw.code"
                  class="fw-picker-cell"
                  :class="{ active: fw.code === project.framework.code, itq: fw.itq }"
                  @click="setFramework(fw.code)"
                  :title="fw.fullName">
                  <span class="fw-pick-code">{{ fw.code }}</span>
                  <span class="fw-pick-ring">{{ fw.ring }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from "bootstrap";
import moment from "moment";
import zeoliteHelper from "../helpers/zeoliteHelper";
import projectColorHelper from "../helpers/projectColorHelper";
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";

export default {
  name: "projectCrystalModal",
  data() {
    return {
      listId: null,
      pickerOpen: false,
    };
  },
  mounted() {
    document.getElementById("projectCrystalModal").addEventListener("show.bs.modal", this.onShow);
    window.addEventListener("open-project-crystal", this.openByEvent);
  },
  unmounted() {
    document.getElementById("projectCrystalModal").removeEventListener("show.bs.modal", this.onShow);
    window.removeEventListener("open-project-crystal", this.openByEvent);
  },
  methods: {
    onShow: function () {
      if (this.listId) this.$store.dispatch("loadTodoLists", this.listId);
    },
    // Opened programmatically from listHeader via a window event, so we can
    // pass the project id without wiring a Vuex action for this one modal.
    openByEvent: function (e) {
      if (!e || !e.detail || !e.detail.listId) return;
      this.listId = e.detail.listId;
      let el = document.getElementById("projectCrystalModal");
      if (el) Modal.getOrCreateInstance(el).show();
    },
    openTask: function (t) {
      let todoList = this.$store.getters.todoLists[this.listId];
      let todo = todoList ? todoList[t.index] : null;
      if (!todo) return;
      this.$store.commit("actionsSelectedTodoIdUpdate", { toDo: todo, index: t.index });
      Modal.getOrCreateInstance(document.getElementById("projectCrystalModal")).hide();
      let modal = new Modal(document.getElementById("toDoModal"), { keyboard: false });
      modal.show();
    },
    // Persist a user-chosen framework for this project. Stored as the IZA
    // code on the custom list record; a null value falls back to the
    // deterministic hash (frameworkFor).
    setFramework: function (code) {
      let idx = (this.$store.getters.cTodoListIds || []).findIndex((l) => l.listId === this.listId);
      if (idx === -1) return;
      this.$store.commit("updateCustomListField", {
        index: idx,
        field: "zeoliteFramework",
        value: code || null,
      });
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
      this.pickerOpen = false;
    },
    resetFramework: function () {
      this.setFramework(null);
    },
  },
  computed: {
    language: function () {
      return this.$store.getters.config.language;
    },
    project: function () {
      let empty = { name: "", color: null, framework: zeoliteHelper.frameworks[0] ? zeoliteHelper.frameworkFor("empty") : null };
      if (!this.listId) return empty;
      let meta = (this.$store.getters.cTodoListIds || []).find((l) => l.listId === this.listId);
      if (!meta) return empty;
      // Prefer the per-project override (meta.zeoliteFramework = IZA code),
      // fall back to the deterministic hash.
      let fw = null;
      if (meta.zeoliteFramework) fw = zeoliteHelper.frameworkByCode(meta.zeoliteFramework);
      if (!fw) fw = zeoliteHelper.frameworkFor(this.listId);
      return {
        name: meta.listName || "",
        color: meta.color || projectColorHelper.solidFor(this.listId),
        framework: fw,
      };
    },
    allFrameworks: function () {
      return zeoliteHelper.frameworks;
    },
    hasOverride: function () {
      let meta = (this.$store.getters.cTodoListIds || []).find((l) => l.listId === this.listId);
      return !!(meta && meta.zeoliteFramework);
    },
    tasks: function () {
      let list = this.$store.getters.todoLists[this.listId] || [];
      return list.map((t, idx) => ({ ...t, index: idx }));
    },
    openTasks: function () {
      let today = moment().format("YYYYMMDD");
      return this.tasks
        .filter((t) => !t.checked)
        .map((t) => ({
          ...t,
          isOverdue: t.deadline && t.deadline < today,
          deadlineLabel: t.deadline ? moment(t.deadline, "YYYYMMDD").format("DD/MM") : null,
        }))
        .sort((a, b) => {
          // Overdue first, then by deadline proximity, then by priority.
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
          if (a.deadline) return -1;
          if (b.deadline) return 1;
          return (b.priority || 0) - (a.priority || 0);
        });
    },
    stats: function () {
      let today = moment().format("YYYYMMDD");
      let done = this.tasks.filter((t) => t.checked).length;
      let open = this.tasks.length - done;
      let overdue = this.tasks.filter((t) => !t.checked && t.deadline && t.deadline < today).length;
      let next = this.tasks
        .filter((t) => !t.checked && t.deadline && t.deadline >= today)
        .map((t) => t.deadline)
        .sort()[0];
      let percent = this.tasks.length ? Math.round((done / this.tasks.length) * 100) : 0;
      return {
        open: open,
        done: done,
        overdue: overdue,
        percent: percent,
        nextDeadlineLabel: next ? moment(next, "YYYYMMDD").locale(this.language).format("ddd D MMM") : null,
      };
    },
    // Lattice sites: one vertex per polygon side. Each site maps to either
    // an open task (color), an overdue task (red + pulse), or sits dim.
    sites: function () {
      let fw = this.project.framework;
      if (!fw) return [];
      let sides = fw.sides;
      let open = this.openTasks;
      let overdueCount = this.stats.overdue;
      let out = [];
      // Convert normalized polygon points (0..100) to the viewBox (-50..50).
      let coords = String(fw.polygonPoints || "").split(" ").map((pair) => {
        let [x, y] = pair.split(",").map(parseFloat);
        return { x: x - 50, y: y - 50 };
      });
      for (let i = 0; i < sides; i++) {
        let state = "empty";
        if (i < overdueCount) state = "overdue";
        else if (i < open.length) state = "occupied";
        let c = coords[i] || { x: 0, y: 0 };
        out.push({
          x: c.x.toFixed(2),
          y: c.y.toFixed(2),
          r: state === "empty" ? 0.9 : state === "overdue" ? 2.4 : 2.0,
          state: state,
        });
      }
      return out;
    },
    rootStyle: function () {
      return {
        "--project-color": this.project.color || "var(--accent-color, #5e6ef2)",
      };
    },
  },
};
</script>

<style scoped lang="scss">
.crystal-modal .modal-dialog { max-width: 1040px; }

.crystal-content {
  border-radius: 18px;
  padding: 0;
  overflow: hidden;
  background:
    radial-gradient(1200px at 20% 10%, color-mix(in srgb, var(--project-color, #5e6ef2) 14%, transparent), transparent 60%),
    radial-gradient(900px at 85% 90%, color-mix(in srgb, var(--project-color, #5e6ef2) 10%, transparent), transparent 60%),
    var(--surface-bg, #ffffff);
  --surface-bg: #ffffff;
}

.dark-theme .crystal-content {
  --surface-bg: #121a33;
  background:
    radial-gradient(1200px at 20% 10%, color-mix(in srgb, var(--project-color, #5e6ef2) 24%, transparent), transparent 60%),
    radial-gradient(900px at 85% 90%, color-mix(in srgb, var(--project-color, #5e6ef2) 16%, transparent), transparent 60%),
    #121a33;
}

.crystal-close {
  position: absolute;
  top: 14px;
  right: 18px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: inherit;
  z-index: 5;
  font-size: 1.4rem;
  opacity: 0.6;
  transition: opacity 0.2s ease, background 0.2s ease;

  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.07);
  }
}

.dark-theme .crystal-close:hover { background: rgba(255, 255, 255, 0.1); }

.crystal-stage {
  position: relative;
  padding: 36px 32px 10px 32px;
  min-height: 440px;
  color: var(--project-color, var(--accent-color, #5e6ef2));
}

.crystal-header {
  position: relative;
  z-index: 2;
}

.crystal-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.72;
  margin-bottom: 10px;
}

.crystal-title {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: clamp(2.2rem, 3.2vw + 0.6rem, 3.6rem);
  font-weight: 400;
  font-variation-settings: "opsz" 72, "wght" 420;
  letter-spacing: -0.02em;
  line-height: 1.02;
  color: var(--text-primary, #1a1a1a);
  margin: 0;
}

.dark-theme .crystal-title { color: #eef1ff; }

.crystal-subtitle {
  font-size: 0.95rem;
  margin-top: 6px;
  opacity: 0.9;
}

.crystal-sky {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 900px;
  pointer-events: none;
  z-index: 1;
}

.crystal-rotor {
  position: relative;
  width: 360px;
  height: 360px;
  transform-style: preserve-3d;
  animation: crystalRotate 42s linear infinite;
}

.crystal-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.crystal-ring-back {
  transform: translateZ(-80px) rotateX(68deg) scale(1.3);
  opacity: 0.35;
}

.crystal-ring-main {
  transform: rotateX(0deg);
  opacity: 0.95;
}

.crystal-ring-front {
  transform: translateZ(80px) rotateX(-62deg) scale(0.65);
  opacity: 0.55;
}

.site-dot {
  fill: currentColor;
  stroke: none;
}

.site-dot.site-empty { opacity: 0.3; }
.site-dot.site-occupied { opacity: 0.95; filter: drop-shadow(0 0 2px currentColor); }
.site-dot.site-overdue { fill: #ed544b; opacity: 1; filter: drop-shadow(0 0 3px rgba(237, 84, 75, 0.8)); }

@keyframes crystalRotate {
  from { transform: rotateY(0deg) rotateX(2deg); }
  to   { transform: rotateY(360deg) rotateX(2deg); }
}

@media (prefers-reduced-motion: reduce) {
  .crystal-rotor { animation: none; }
}

.crystal-panels {
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr;
  gap: 14px;
  padding: 10px 24px 24px 24px;
  position: relative;
  z-index: 2;
}

.crystal-panel {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-radius: 14px;
  padding: 14px 16px;
  border: 0.5px solid rgba(0, 0, 0, 0.05);
}

.dark-theme .crystal-panel {
  background: rgba(18, 26, 51, 0.68);
  border-color: rgba(94, 110, 242, 0.14);
}

.panel-head {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.panel-head-count {
  font-size: 0.72rem;
  letter-spacing: 0;
  opacity: 0.7;
  font-weight: 500;
}

.panel-stats .stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.stat-value {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: 1.5rem;
  font-variation-settings: "opsz" 48, "wght" 480;
}

.stat-value.stat-overdue { color: #ed544b; }
.stat-value.stat-deadline {
  font-size: 1rem;
  color: var(--project-color, var(--accent-color, #5e6ef2));
}

.stat-label {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.6;
}

.stat-progress {
  margin-top: 10px;
  height: 4px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.dark-theme .stat-progress { background: rgba(255, 255, 255, 0.08); }

.stat-progress-fill {
  height: 100%;
  background: var(--project-color, var(--accent-color, #5e6ef2));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.crystal-task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 240px;
  overflow: auto;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.88rem;

    &:hover { background: rgba(0, 0, 0, 0.04); }
    &.overdue { color: #ed544b; }
  }
}

.dark-theme .crystal-task-list li:hover { background: rgba(94, 110, 242, 0.1); }

.ct-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  color: var(--project-color, var(--accent-color, #5e6ef2));
}

.ct-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ct-deadline {
  font-size: 0.72rem;
  opacity: 0.65;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.ct-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  color: grey;
  font-size: 0.85rem;
  padding: 10px 4px;
  font-style: italic;
}

.panel-framework .fw-code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.fw-code {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: 1.3rem;
  font-variation-settings: "opsz" 48, "wght" 460;
  color: var(--project-color, var(--accent-color, #5e6ef2));
}

.fw-ring {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--project-color, #5e6ef2) 14%, transparent);
  color: var(--project-color, var(--accent-color, #5e6ef2));
}

.fw-itq-badge {
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
  letter-spacing: 0.06em;
}

.dark-theme .fw-itq-badge { color: #fdba74; }

.fw-note {
  font-size: 0.82rem;
  line-height: 1.45;
  opacity: 0.78;
  margin: 0;
}

/* ---- Framework picker (per-project zeolite assignment) ---- */
.fw-change-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.65;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 5px;

  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.05);
  }

  i { font-size: 0.78rem; }
}

.dark-theme .fw-change-btn:hover { background: rgba(255, 255, 255, 0.08); }

.fw-override-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  margin-left: auto;

  &:hover { opacity: 1; }

  i { font-size: 0.7rem; }
}

.dark-theme .fw-override-badge { background: rgba(255, 255, 255, 0.08); }

.fw-picker {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
}

.dark-theme .fw-picker { border-top-color: rgba(94, 110, 242, 0.14); }

.fw-picker-head {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 8px;
}

.fw-picker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  max-height: 260px;
  overflow: auto;
}

.fw-picker-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 8px;
  border-radius: 7px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.2s ease;
  text-align: left;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
    transform: translateY(-1px);
  }

  &.active {
    background: var(--project-color, var(--accent-color, #5e6ef2));
    color: white;
    border-color: var(--project-color, var(--accent-color, #5e6ef2));
  }

  &.itq:not(.active) {
    border-color: rgba(249, 115, 22, 0.3);
  }
}

.dark-theme .fw-picker-cell {
  border-color: rgba(94, 110, 242, 0.18);
  &:hover { background: rgba(94, 110, 242, 0.14); }
}

.fw-pick-code {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: 0.95rem;
  font-variation-settings: "opsz" 48, "wght" 460;
  letter-spacing: -0.01em;
}

.fw-pick-ring {
  font-size: 0.62rem;
  opacity: 0.7;
}

.fw-picker-cell.active .fw-pick-ring { opacity: 0.9; }
</style>
