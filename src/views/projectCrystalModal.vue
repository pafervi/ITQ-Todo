<template>
  <div class="modal fade crystal-modal" id="projectCrystalModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content crystal-content" :style="rootStyle">
        <!-- Hero stage: the project's theme-item rendered in triple-stacked
             3D rings, with open tasks orbiting around it. The polygon ring
             for zeolites, the organic ring for organic, the unit cell for
             oxides, or the Jablonski-style diagram for photochem. The item
             shape is theme-aware via themesHelper; sites[] (orbiting dots)
             are laid out on a fixed circle so the pattern works regardless
             of theme geometry. -->
        <div class="crystal-stage">
          <div class="crystal-close" data-bs-dismiss="modal" :title="$t('ui.close') || 'Close'">
            <i class="bi-x"></i>
          </div>

          <div class="crystal-header">
            <div class="crystal-eyebrow">{{ project.item.code }}<span v-if="project.item.meta"> · {{ project.item.meta }}</span></div>
            <h1 class="crystal-title">{{ project.name }}</h1>
            <div class="crystal-subtitle">{{ project.item.fullName }}</div>
          </div>

          <div class="crystal-sky" aria-hidden="true">
            <div class="crystal-rotor">
              <!-- Three stacked rings at different depths = a cheap but
                   effective 3D unit-cell feeling, built purely from CSS
                   transforms. Each ring renders the current theme's
                   svgShape via v-html so a theme switch re-skins all three. -->
              <svg
                class="crystal-ring crystal-ring-back"
                :viewBox="project.item.viewBox || '0 0 100 100'"
                v-html="project.item.svgShape"
              ></svg>
              <svg
                class="crystal-ring crystal-ring-main"
                :viewBox="project.item.viewBox || '0 0 100 100'"
              >
                <g v-html="project.item.svgShape"></g>
                <!-- Lattice sites: 12 anchor positions on a circle around
                     the shape, state-driven: overdue (red + pulse),
                     occupied (open task), or empty. Circle layout works
                     for every theme regardless of inner geometry. -->
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
              <svg
                class="crystal-ring crystal-ring-front"
                :viewBox="project.item.viewBox || '0 0 100 100'"
                v-html="project.item.svgShape"
              ></svg>
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
              {{ themeLabel }}
              <button type="button" class="fw-change-btn"
                v-if="listId"
                @click.stop="pickerOpen = !pickerOpen"
                :title="$t('ui.crystalChange') || 'Change'">
                <i class="ph ph-swap"></i>
                {{ $t('ui.crystalChange') || 'change' }}
              </button>
            </div>
            <div class="fw-code-row">
              <span class="fw-code">{{ project.item.code }}</span>
              <span v-if="project.item.meta" class="fw-ring">{{ project.item.meta }}</span>
              <span v-if="project.item.itq" class="fw-itq-badge" :title="$t('ui.zeoliteFromItq') || 'Made at the ITQ'">ITQ · {{ project.item.year || '' }}</span>
              <span v-if="hasOverride" class="fw-override-badge" :title="$t('ui.crystalResetTitle') || 'Reset to auto'" @click.stop="resetFramework">
                <i class="ph ph-arrow-counter-clockwise"></i>
              </span>
            </div>
            <p class="fw-note">{{ project.item.note }}</p>

            <!-- Item picker: scrollable grid of all items of the active
                 theme. Clicking one persists the choice on the project
                 record (stored on cTodoListIds[i].zeoliteFramework for
                 historical compat; the field now holds any theme item
                 code, not just zeolites). -->
            <div v-if="pickerOpen" class="fw-picker">
              <div class="fw-picker-head">{{ pickerHeadLabel }}</div>
              <div class="fw-picker-grid">
                <button type="button"
                  v-for="it in allItems"
                  :key="it.code"
                  class="fw-picker-cell"
                  :class="{ active: it.code === project.item.code, itq: it.itq }"
                  @click="setFramework(it.code)"
                  :title="it.fullName">
                  <span class="fw-pick-code">{{ it.code }}</span>
                  <span class="fw-pick-ring" v-if="it.meta">{{ it.meta }}</span>
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
import themesHelper from "../helpers/themesHelper";
import projectColorHelper from "../helpers/projectColorHelper";
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";

// Project crystal view. Opened by clicking a project name in the header.
// Theme-aware since the themes refactor: the hero rings render the active
// theme's shape (zeolite polygon, organic ring, oxide cell, photochem
// motif) via v-html on the item.svgShape, and the item picker lists all
// items of the active theme. The per-project override field is still
// called zeoliteFramework on the custom list record for backwards compat.

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
    cfg: function () {
      return this.$store.getters.config;
    },
    themeActive: function () {
      return themesHelper.getActive(this.cfg);
    },
    themeLabel: function () {
      // Panel head label is theme-aware: "Framework" for zeolites,
      // "Molecule" for organic, "Oxide" for oxides, "Concept" for photochem.
      switch (this.themeActive.id) {
        case "organic": return this.$t('ui.crystalMolecule') || 'Molecule';
        case "oxides": return this.$t('ui.crystalOxide') || 'Oxide';
        case "photochem": return this.$t('ui.crystalConcept') || 'Concept';
        case "zeolites":
        default: return this.$t('ui.crystalFramework') || 'Framework';
      }
    },
    pickerHeadLabel: function () {
      switch (this.themeActive.id) {
        case "organic": return this.$t('ui.crystalPickMolecule') || 'Pick a molecule';
        case "oxides": return this.$t('ui.crystalPickOxide') || 'Pick an oxide';
        case "photochem": return this.$t('ui.crystalPickConcept') || 'Pick a concept';
        case "zeolites":
        default: return this.$t('ui.crystalPickOne') || 'Pick a zeolite';
      }
    },
    project: function () {
      let empty = {
        name: "",
        color: null,
        item: themesHelper.getItemFor("empty", this.cfg) || { code: "", fullName: "", note: "", svgShape: "", viewBox: "0 0 100 100" },
      };
      if (!this.listId) return empty;
      let meta = (this.$store.getters.cTodoListIds || []).find((l) => l.listId === this.listId);
      if (!meta) return empty;
      // Prefer the per-project override; fall back to the deterministic
      // hash on the project id. Field is still called zeoliteFramework
      // on the custom list record for historical compat but holds a code
      // of the active theme.
      let it = null;
      if (meta.zeoliteFramework) it = themesHelper.getItemByCode(meta.zeoliteFramework, this.cfg);
      if (!it) it = themesHelper.getItemFor(this.listId, this.cfg);
      return {
        name: meta.listName || "",
        color: meta.color || projectColorHelper.solidFor(this.listId),
        item: it || empty.item,
      };
    },
    allItems: function () {
      return themesHelper.getAllItems(this.cfg) || [];
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
    // Sites around the shape. 12 fixed anchors on a circle in the item's
    // viewBox (centered at 50,50 with radius 44). Theme-agnostic: any
    // theme's shape sits inside and the orbiting dots feel consistent.
    sites: function () {
      let SITES = 12;
      let cx = 50;
      let cy = 50;
      let radius = 44;
      let open = this.openTasks;
      let overdueCount = this.stats.overdue;
      let out = [];
      for (let i = 0; i < SITES; i++) {
        let state = "empty";
        if (i < overdueCount) state = "overdue";
        else if (i < open.length) state = "occupied";
        let angle = (Math.PI * 2 * i) / SITES - Math.PI / 2;
        let x = cx + radius * Math.cos(angle);
        let y = cy + radius * Math.sin(angle);
        out.push({
          x: x.toFixed(2),
          y: y.toFixed(2),
          r: state === "empty" ? 0.9 : state === "overdue" ? 2.2 : 1.8,
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
  opacity: 0.3;
}

.crystal-ring-main {
  transform: rotateX(0deg);
  opacity: 0.95;
}

.crystal-ring-front {
  transform: translateZ(80px) rotateX(-62deg) scale(0.65);
  opacity: 0.5;
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
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 1;
  color: var(--project-color, var(--accent-color, #5e6ef2));
}

.stat-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--project-color, var(--accent-color, #5e6ef2));
  font-variant-numeric: tabular-nums;
}

.stat-overdue { color: #ed544b; }
.stat-deadline { font-size: 1rem; }

.stat-label {
  font-size: 0.78rem;
  opacity: 0.7;
}

.stat-progress {
  margin-top: 10px;
  width: 100%;
  height: 4px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.dark-theme .stat-progress { background: rgba(255, 255, 255, 0.12); }

.stat-progress-fill {
  height: 100%;
  background: var(--project-color, var(--accent-color, #5e6ef2));
  transition: width 0.5s cubic-bezier(0.2, 1, 0.1, 1);
}

.crystal-task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 220px;
  overflow-y: auto;
}

.crystal-task-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 2px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  font-size: 0.85rem;
}

.dark-theme .crystal-task-list li { border-bottom-color: rgba(255, 255, 255, 0.06); }

.crystal-task-list li:hover { background: rgba(0, 0, 0, 0.04); border-radius: 4px; }
.dark-theme .crystal-task-list li:hover { background: rgba(255, 255, 255, 0.04); }

.crystal-task-list li.overdue { color: #ed544b; }

.ct-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ct-text {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ct-deadline {
  font-size: 0.72rem;
  opacity: 0.72;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.ct-empty {
  cursor: default !important;
  opacity: 0.7;
  justify-content: center;
  text-align: center;
}

.ct-empty:hover { background: transparent !important; }

.panel-framework .fw-code-row {
  display: flex;
  gap: 7px;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.fw-code {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--project-color, var(--accent-color, #5e6ef2));
}

.fw-ring {
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--project-color, #5e6ef2) 10%, transparent);
  color: var(--project-color, var(--accent-color, #5e6ef2));
}

.fw-itq-badge {
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--project-color, #5e6ef2) 14%, transparent);
  color: var(--project-color, var(--accent-color, #5e6ef2));
  font-weight: 600;
}

.fw-override-badge {
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

.fw-override-badge:hover { opacity: 1; }

.fw-note {
  font-size: 0.82rem;
  line-height: 1.42;
  opacity: 0.85;
  margin: 0;
}

.fw-change-btn {
  background: transparent;
  border: 1px solid transparent;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--project-color, var(--accent-color, #5e6ef2));
  padding: 2px 7px;
  border-radius: 5px;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity 0.15s ease, background 0.15s ease;
}

.fw-change-btn:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--project-color, #5e6ef2) 10%, transparent);
}

.fw-picker {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.dark-theme .fw-picker { border-top-color: rgba(255, 255, 255, 0.1); }

.fw-picker-head {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 8px;
}

.fw-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.fw-picker-cell {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 6px 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, transform 0.1s ease;
}

.dark-theme .fw-picker-cell { background: rgba(255, 255, 255, 0.04); }

.fw-picker-cell:hover {
  background: color-mix(in srgb, var(--project-color, #5e6ef2) 10%, transparent);
  transform: translateY(-1px);
}

.fw-picker-cell.active {
  background: color-mix(in srgb, var(--project-color, #5e6ef2) 20%, transparent);
  border-color: var(--project-color, var(--accent-color, #5e6ef2));
}

.fw-picker-cell.itq { font-weight: 600; }

.fw-pick-code {
  font-weight: 600;
  color: var(--project-color, var(--accent-color, #5e6ef2));
  letter-spacing: 0.6px;
}

.fw-pick-ring {
  font-size: 0.66rem;
  opacity: 0.72;
}
</style>
