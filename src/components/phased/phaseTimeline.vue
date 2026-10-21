<template>
  <div class="phase-timeline">
    <!-- Header lives in the same grid as every row below, so the today
         chip and the month labels line up pixel-for-pixel with the today
         line that each phase bar paints. -->
    <div class="pt-header">
      <div class="pt-header-spacer"></div>
      <div class="pt-header-track">
        <div
          v-if="todayPct !== null"
          class="pt-today-chip"
          :style="{ left: todayPct + '%' }"
        >
          <i class="bi-geo-alt-fill"></i>{{ $t('phased.today') || 'Today' }}
        </div>
        <div class="pt-months">
          <div
            v-for="m in visibleMonthLabels"
            :key="m.pct"
            class="pt-month-label"
            :style="{ left: m.pct + '%' }"
          >{{ m.label }}</div>
          <div v-if="todayPct !== null" class="pt-today-marker" :style="{ left: todayPct + '%' }"></div>
        </div>
      </div>
    </div>

    <div v-if="!phases.length" class="pt-empty">
      <i class="bi-bar-chart-steps"></i>
      <span>{{ $t('phased.noPhasesYet') || 'No phases yet' }}</span>
      <button class="pt-primary-btn" @click="$emit('addPhase')">
        <i class="bi-plus-lg"></i>
        {{ $t('phased.addFirstPhase') || 'Add the first phase' }}
      </button>
    </div>

    <div v-else class="pt-rows">
      <div
        v-for="(phase, i) in orderedPhases"
        :key="phase.id"
        class="pt-row"
        :class="{ 'pt-row-active': phase.status === 'active', 'pt-row-blocked': phase.status === 'blocked' }"
      >
        <div class="pt-row-label" :title="phase.name" @click="$emit('editPhase', phase)">
          <span class="pt-row-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="pt-row-name">{{ phase.name }}</span>
          <span class="pt-row-status" :class="'status-' + phase.status">{{ statusLabel(phase.status) }}</span>
        </div>
        <div class="pt-track">
          <div v-if="todayPct !== null" class="pt-today-line" :style="{ left: todayPct + '%' }"></div>
          <div
            class="pt-bar"
            :class="['pt-state-' + phase.status]"
            :style="barStyle(phase, i)"
            @click="$emit('editPhase', phase)"
            :title="phase.name + ' · ' + phase.startDate + ' → ' + phase.endDate"
          >
            <span class="pt-bar-text">{{ shortRange(phase) }}</span>
          </div>
          <div
            v-for="blk in blocksFor(phase.id)"
            :key="'blk-' + blk.id"
            class="pt-block-strip"
            :style="blockStyle(blk)"
            :title="blk.text"
          ></div>
          <!-- Markers are now 15x15 with a glyph inside so the kind reads
               at a glance without needing the tooltip. The shape stays
               distinctive (circle vs diamond vs hatched strip for blocks)
               to keep the visual grammar from the mockup. -->
          <div
            v-for="mk in markersFor(phase.id)"
            :key="'mk-' + mk.id"
            class="pt-marker"
            :class="'kind-' + mk.kind"
            :style="{ left: markerPct(mk) + '%' }"
            :title="mk.text + ' (' + mk.date + ')'"
          >
            <i :class="markerIcon(mk.kind)"></i>
          </div>
        </div>
      </div>
    </div>

    <div v-if="phases.length" class="pt-footer">
      <button class="pt-primary-btn" @click="$emit('addPhase')">
        <i class="bi-plus-lg"></i>
        {{ $t('phased.addPhase') || 'Add phase' }}
      </button>
      <div class="pt-legend">
        <span class="pt-legend-group">
          <span class="pt-legend-item"><span class="pt-legend-sw state-pending"></span>{{ $t('phased.statusPending') || 'Pending' }}</span>
          <span class="pt-legend-item"><span class="pt-legend-sw state-active"></span>{{ $t('phased.statusActive') || 'Active' }}</span>
          <span class="pt-legend-item"><span class="pt-legend-sw state-done"></span>{{ $t('phased.statusDone') || 'Done' }}</span>
        </span>
        <span class="pt-legend-sep">·</span>
        <span class="pt-legend-group">
          <span class="pt-legend-item"><span class="pt-legend-mk mk-milestone"><i class="bi-check-lg"></i></span>{{ $t('phased.kindMilestone') || 'Milestone' }}</span>
          <span class="pt-legend-item"><span class="pt-legend-mk mk-decision"><i class="bi-lightbulb"></i></span>{{ $t('phased.kindDecision') || 'Decision' }}</span>
          <span class="pt-legend-item"><span class="pt-legend-mk mk-block"></span>{{ $t('phased.kindBlock') || 'Block' }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import phasedProjectHelper from "../../helpers/phasedProjectHelper";

export default {
  name: "phaseTimeline",
  props: {
    projectId: { required: true, type: String },
    cList: { required: true, type: Object },
    phases: { required: true, type: Array },
    logEntries: { required: true, type: Array },
  },
  emits: ["addPhase", "editPhase"],
  data() {
    return {
      labelWidthPx: 170,
      gutterPx: 14,
    };
  },
  computed: {
    range() {
      return phasedProjectHelper.projectRange(this.cList, this.phases);
    },
    monthLabels() {
      return phasedProjectHelper.monthLabels(this.range.start, this.range.end);
    },
    visibleMonthLabels() {
      let all = this.monthLabels;
      if (all.length <= 6) return all;
      if (all.length <= 12) return all.filter((_, i) => i % 2 === 0);
      return all.filter((_, i) => i % 3 === 0);
    },
    todayPct() {
      let p = phasedProjectHelper.rawPct(moment(), this.range.start, this.range.end);
      if (p < 0 || p > 100) return null;
      return p;
    },
    orderedPhases() {
      return this.phases.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    },
  },
  methods: {
    pct(date) {
      return phasedProjectHelper.pct(date, this.range.start, this.range.end);
    },
    rawPct(date) {
      return phasedProjectHelper.rawPct(date, this.range.start, this.range.end);
    },
    barStyle(phase, i) {
      let left = this.pct(phase.startDate);
      let right = this.pct(phase.endDate);
      let width = Math.max(0.5, right - left);
      return {
        left: left + "%",
        width: width + "%",
        background: phasedProjectHelper.phaseColor(phase, i),
      };
    },
    shortRange(phase) {
      let a = moment(phase.startDate).format("MMM DD");
      let b = moment(phase.endDate).format("MMM DD");
      return a + " - " + b;
    },
    statusLabel(status) {
      let key = "phased.status" + (status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending");
      return this.$t(key) || status;
    },
    markerIcon(kind) {
      switch (kind) {
        case "milestone": return "bi-check-lg";
        case "decision": return "bi-lightbulb-fill";
        default: return "bi-dot";
      }
    },
    markersFor(phaseId) {
      return this.logEntries.filter(
        (e) => e.phaseId === phaseId && (e.kind === "milestone" || e.kind === "decision")
      );
    },
    blocksFor(phaseId) {
      return this.logEntries.filter((e) => e.phaseId === phaseId && e.kind === "block");
    },
    markerPct(entry) {
      return this.pct(entry.date);
    },
    blockStyle(blk) {
      let start = this.pct(blk.date);
      let endDate = blk.blockEndDate || moment().format("YYYY-MM-DD");
      let end = this.pct(endDate);
      let width = Math.max(0.5, end - start);
      return { left: start + "%", width: width + "%" };
    },
  },
};
</script>

<style scoped lang="scss">
.phase-timeline {
  padding: 24px 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  /* Inherit the app's chosen UI font so the Timeline reads with the same
     voice as the project titles and task text. The monospace family stays
     scoped to true metadata (dates, pills, numbers) below. */
  font-family: var(--app-font-family, inherit);
}

/* Header grid matches .pt-row exactly so the today chip aligns pixel-
   perfect with the today line in every bar. */
.pt-header {
  display: grid;
  grid-template-columns: 170px 1fr;
  column-gap: 14px;
  margin-bottom: 8px;
}
.pt-header-track {
  position: relative;
  min-width: 0;
  padding-top: 22px;
}
.pt-today-chip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  background: #c84b3b;
  padding: 2px 8px 2px 6px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(200, 75, 59, 0.3);
  z-index: 2;
  animation: pt-today-pulse 2.6s ease-in-out infinite;
  i { font-size: 10px; }
  .dark-theme & {
    background: #e07866;
    color: #fff;
  }
}
@keyframes pt-today-pulse {
  0%, 100% { box-shadow: 0 2px 4px rgba(200, 75, 59, 0.3); }
  50% { box-shadow: 0 2px 4px rgba(200, 75, 59, 0.3), 0 0 0 4px rgba(200, 75, 59, 0.14); }
}

.pt-months {
  position: relative;
  height: 22px;
  border-bottom: 1px dashed rgba(140, 140, 140, 0.35);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a8d90;
}
.pt-month-label {
  position: absolute;
  top: 5px;
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  padding: 0 4px;
  background: #fff;
  .dark-theme & { background: #1c1f22; }
}
.pt-today-marker {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 1.5px;
  background: #c84b3b;
  z-index: 1;
  animation: pt-today-line-pulse 2.6s ease-in-out infinite;
  .dark-theme & { background: #e07866; }
}
@keyframes pt-today-line-pulse {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 1; }
}

.pt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 44px 10px;
  color: #8a8d90;
  i { font-size: 2.1rem; opacity: 0.5; }
}

.pt-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* Full-row hover tint. Padding + negative margin lets the hover highlight
   bleed into the gutter without affecting the computed column widths, so
   the today line stays aligned on hover too. */
.pt-row {
  display: grid;
  grid-template-columns: 170px 1fr;
  column-gap: 14px;
  align-items: center;
  min-width: 0;
  padding: 6px 6px;
  margin: 0 -6px;
  border-radius: 6px;
  transition: background 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
  position: relative;
}
.pt-row:hover {
  background: rgba(140, 140, 140, 0.07);
  .dark-theme & { background: rgba(255, 255, 255, 0.045); }
}
.pt-row-active {
  background: rgba(43, 122, 120, 0.07);
  box-shadow: inset 3px 0 0 #2b7a78;
  &:hover { background: rgba(43, 122, 120, 0.11); }
  .dark-theme & {
    background: rgba(95, 179, 176, 0.09);
    box-shadow: inset 3px 0 0 #5fb3b0;
    &:hover { background: rgba(95, 179, 176, 0.14); }
  }
}
.pt-row-blocked {
  background: rgba(200, 75, 59, 0.05);
  &:hover { background: rgba(200, 75, 59, 0.1); }
  .dark-theme & {
    background: rgba(224, 120, 102, 0.07);
    &:hover { background: rgba(224, 120, 102, 0.11); }
  }
}

.pt-row-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  min-width: 0;
  &:hover .pt-row-name { color: var(--accent-color, #5e6ef2); }
}
.pt-row-num {
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 10px;
  color: #8a8d90;
  width: 16px;
  flex-shrink: 0;
}
.pt-row-name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #212529;
  font-family: var(--app-font-family, inherit);
  font-weight: 500;
  .dark-theme & { color: #e8e8e8; }
}
/* Saturated status pills: solid colour + white text so PENDING / ACTIVE /
   DONE / BLOCKED read at a glance from across the panel. */
.pt-row-status {
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 8.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 3px;
  font-weight: 600;
  flex-shrink: 0;
  background: rgba(140, 140, 140, 0.22);
  color: #4a4d50;
  .dark-theme & { background: rgba(255, 255, 255, 0.15); color: #d8dde0; }
  &.status-active { background: #2b7a78; color: #fff;
    .dark-theme & { background: #5fb3b0; color: #0b1f1e; } }
  &.status-done { background: #4b8a7f; color: #fff;
    .dark-theme & { background: #7bb4a7; color: #0b1f1e; } }
  &.status-blocked { background: #c84b3b; color: #fff;
    .dark-theme & { background: #e07866; color: #2a0f0a; } }
}

.pt-track {
  position: relative;
  height: 24px;
  background: rgba(140, 140, 140, 0.1);
  border-radius: 3px;
  overflow: visible;
  .dark-theme & { background: rgba(255, 255, 255, 0.05); }
}
.pt-today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background: #c84b3b;
  opacity: 0.55;
  z-index: 2;
  animation: pt-today-line-pulse 2.6s ease-in-out infinite;
  .dark-theme & { background: #e07866; }
}
.pt-bar {
  position: absolute;
  top: 3px;
  bottom: 3px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.12s;
  &.pt-state-pending { opacity: 0.45; }
  &.pt-state-active { outline: 1.5px solid #212529; outline-offset: 2px;
    .dark-theme & { outline-color: #f0f0f0; }
  }
  &.pt-state-done { opacity: 0.9; }
  &.pt-state-blocked { opacity: 0.6; outline: 1.5px dashed #c84b3b; outline-offset: 1px; }
  &:hover { filter: brightness(1.1); }
}
.pt-bar-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pt-block-strip {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background: repeating-linear-gradient(45deg, #c84b3b 0 3px, transparent 3px 6px);
  border-left: 1.5px solid #c84b3b;
  border-right: 1.5px solid #c84b3b;
  z-index: 3;
  border-radius: 1px;
}
/* Markers: 15x15 square frame holding a 10px glyph. The frame picks the
   kind colour and the glyph tells you what the event was at a glance. */
.pt-marker {
  position: absolute;
  top: -7px;
  width: 15px;
  height: 15px;
  z-index: 4;
  pointer-events: auto;
  cursor: help;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 0 0 1.5px #fff, 0 1px 3px rgba(0, 0, 0, 0.2);
  .dark-theme & { box-shadow: 0 0 0 1.5px #1c1f22, 0 1px 3px rgba(0, 0, 0, 0.4); }
  i { font-size: 9px; line-height: 1; }
  &.kind-milestone {
    background: #2b7a78;
    border-radius: 50%;
    transform: translateX(-50%);
    .dark-theme & { background: #5fb3b0; color: #0b1f1e; }
  }
  &.kind-decision {
    background: #b8893a;
    transform: translateX(-50%) rotate(45deg);
    width: 13px;
    height: 13px;
    i { transform: rotate(-45deg); font-size: 8px; }
    .dark-theme & { background: #d4a85a; color: #2a1f0a; }
  }
}

.pt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px dashed rgba(140, 140, 140, 0.3);
}
/* Primary-filled CTA, same accent colour the app uses for action
   affordances. Replaces the older outline pt-add-btn and pt-empty-btn. */
.pt-primary-btn {
  background: var(--accent-color, #5e6ef2);
  color: #fff;
  border: none;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: filter 0.12s, transform 0.08s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  &:hover { filter: brightness(1.08); }
  &:active { transform: translateY(1px); }
  i { font-size: 0.9rem; }
}
.pt-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #8a8d90;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  align-items: center;
}
.pt-legend-group {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
}
.pt-legend-sep {
  color: rgba(140, 140, 140, 0.5);
}
.pt-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.pt-legend-sw {
  width: 12px; height: 12px; border-radius: 3px;
  background: rgba(140, 140, 140, 0.3);
  &.state-pending { background: rgba(140, 140, 140, 0.4); }
  &.state-active { background: #2b7a78; .dark-theme & { background: #5fb3b0; } }
  &.state-done { background: #4b8a7f; .dark-theme & { background: #7bb4a7; } }
}
.pt-legend-mk {
  width: 12px; height: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  i { font-size: 7px; }
  &.mk-milestone { background: #2b7a78; border-radius: 50%;
    .dark-theme & { background: #5fb3b0; color: #0b1f1e; } }
  &.mk-decision { background: #b8893a; transform: rotate(45deg); width: 10px; height: 10px;
    .dark-theme & { background: #d4a85a; } }
  &.mk-block {
    background: repeating-linear-gradient(45deg, #c84b3b 0 2px, transparent 2px 4px);
    border-left: 1px solid #c84b3b;
    border-right: 1px solid #c84b3b;
  }
}
</style>
