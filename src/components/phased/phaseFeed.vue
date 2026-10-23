<template>
  <div class="phase-feed">
    <div v-if="!sortedEntries.length" class="pf-empty">
      <i class="bi-journal-text"></i>
      <span>{{ $t('phased.noLogYet') || 'No log entries yet' }}</span>
      <button class="pf-primary-btn" @click="$emit('addEntry')">
        <i class="bi-plus-lg"></i>
        {{ $t('phased.addFirstEntry') || 'Add the first entry' }}
      </button>
    </div>
    <ul v-else class="pf-list">
      <template v-for="group in groupedEntries" :key="group.key">
        <!-- Month separator. Hidden if there is only one group so single-
             month projects do not grow an extra header for no reason. -->
        <li v-if="groupedEntries.length > 1" class="pf-group-head" :key="'g-' + group.key">
          <span class="pf-group-label">{{ group.label }}</span>
          <span class="pf-group-count">{{ group.entries.length }} {{ group.entries.length === 1 ? ($t('phased.entrySingular') || 'entry') : ($t('phased.entryPlural') || 'entries') }}</span>
          <span class="pf-group-line"></span>
        </li>
        <li
          v-for="entry in group.entries"
          :key="entry.id"
          class="pf-entry"
          :class="'kind-' + entry.kind"
          :style="{ borderLeftColor: entryBorderColor(entry) }"
        >
          <div class="pf-left">
            <div class="pf-date">{{ formatDate(entry.date) }}</div>
            <div class="pf-dot" :class="'dot-' + entry.kind"></div>
          </div>
          <div class="pf-body">
            <div class="pf-head">
              <span v-if="entry.kind !== 'note'" class="pf-kind-pill" :class="'kind-' + entry.kind">
                {{ kindLabel(entry.kind) }}
              </span>
              <span v-if="entry.snapshotKind" class="pf-snapshot" :class="'snap-' + entry.snapshotKind">
                <i class="bi-calendar-week"></i>
                {{ entry.snapshotKind === 'monday' ? ($t('phased.mondaySnapshot') || 'Monday open') : ($t('phased.fridaySnapshot') || 'Friday close') }}
              </span>
              <span v-if="entry.phaseId" class="pf-phase-tag" :style="{ color: phaseTagColor(entry.phaseId) }">{{ phaseName(entry.phaseId) }}</span>
            </div>
            <div class="pf-text">{{ entry.text }}</div>
            <div v-if="entry.kind === 'block' && entry.blockEndDate" class="pf-block-info">
              <i class="bi-arrow-right"></i>
              {{ $t('phased.blockEndDate') || 'Ended' }}: {{ formatDate(entry.blockEndDate) }}
            </div>
            <div v-else-if="entry.kind === 'block' && !entry.blockEndDate" class="pf-block-info pf-block-open">
              <i class="bi-hourglass-split"></i>
              {{ $t('phased.blockOpen') || 'ongoing' }}
            </div>
          </div>
          <div class="pf-actions">
            <i class="bi-pencil pf-action-icon" @click="$emit('editEntry', entry)" :title="$t('phased.editEntry') || 'Edit entry'"></i>
            <i class="bi-trash pf-action-icon pf-action-del" @click="$emit('removeEntry', entry)" :title="$t('phased.removeEntry') || 'Remove entry'"></i>
          </div>
        </li>
      </template>
    </ul>
    <div v-if="sortedEntries.length" class="pf-footer">
      <button class="pf-primary-btn" @click="$emit('addEntry')">
        <i class="bi-plus-lg"></i>
        {{ $t('phased.addEntry') || 'Add entry' }}
      </button>
      <div class="pf-legend">
        <span class="pf-legend-item"><span class="pf-legend-dot dot-milestone"></span>{{ $t('phased.kindMilestone') || 'Milestone' }}</span>
        <span class="pf-legend-item"><span class="pf-legend-dot dot-decision"></span>{{ $t('phased.kindDecision') || 'Decision' }}</span>
        <span class="pf-legend-item"><span class="pf-legend-dot dot-block"></span>{{ $t('phased.kindBlock') || 'Block' }}</span>
        <span class="pf-legend-item"><span class="pf-legend-dot dot-note"></span>{{ $t('phased.kindNote') || 'Note' }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import phasedProjectHelper from "../../helpers/phasedProjectHelper";

export default {
  name: "phaseFeed",
  props: {
    projectId: { required: true, type: String },
    cList: { required: true, type: Object },
    phases: { required: true, type: Array },
    logEntries: { required: true, type: Array },
  },
  emits: ["addEntry", "editEntry", "removeEntry"],
  computed: {
    sortedEntries() {
      // Descending by date so the most recent event sits on top of the
      // feed, like a lab notebook read backwards.
      return this.logEntries.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    },
    // Entries grouped by YYYY-MM, same descending order. Each group holds
    // the entries that fell inside that month plus a human-readable label
    // ("October 2026"). A one-group project skips the group header to
    // avoid visual noise, see template v-if.
    groupedEntries() {
      let groups = [];
      let seen = new Map();
      this.sortedEntries.forEach((e) => {
        let key = moment(e.date).format("YYYY-MM");
        if (!seen.has(key)) {
          let g = {
            key: key,
            label: moment(e.date).format("MMMM YYYY"),
            entries: [],
          };
          seen.set(key, g);
          groups.push(g);
        }
        seen.get(key).entries.push(e);
      });
      return groups;
    },
    phasesById() {
      let out = {};
      (this.phases || []).forEach((p) => (out[p.id] = p));
      return out;
    },
    phaseOrderIndex() {
      // Order index for every phase, used to look up its colour from the
      // palette without hitting phasedProjectHelper for every row.
      let out = {};
      let ordered = (this.phases || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      ordered.forEach((p, i) => (out[p.id] = i));
      return out;
    },
  },
  methods: {
    formatDate(d) {
      if (!d) return "";
      return moment(d).format("YYYY-MM-DD");
    },
    kindLabel(kind) {
      let key = "phased.kind" + (kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : "Note");
      return this.$t(key) || kind;
    },
    phaseName(phaseId) {
      let p = this.phasesById[phaseId];
      return p ? p.name : "";
    },
    phaseTagColor(phaseId) {
      let p = this.phasesById[phaseId];
      if (!p) return "";
      let i = this.phaseOrderIndex[phaseId] || 0;
      return phasedProjectHelper.phaseColor(p, i);
    },
    entryBorderColor(entry) {
      // Entries get a left border painted with their phase's bar colour so
      // visually they belong to the same lane as the matching bar in the
      // Timeline. Un-phased entries fall back to a neutral tint by kind.
      if (entry.phaseId && this.phasesById[entry.phaseId]) {
        return this.phaseTagColor(entry.phaseId);
      }
      switch (entry.kind) {
        case "milestone": return "#2b7a78";
        case "decision": return "#b8893a";
        case "block": return "#c84b3b";
        default: return "rgba(140, 140, 140, 0.25)";
      }
    },
  },
};
</script>

<style scoped lang="scss">
.phase-feed {
  /* Padding, font-size and family match .phase-timeline exactly so the two
     views feel like different pages of the same section. */
  padding: 24px 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-family: var(--app-font-family, inherit);
}

.pf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 44px 10px;
  color: #8a8d90;
  i { font-size: 2.1rem; opacity: 0.5; }
}

.pf-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Monthly group header: a small all-caps label on the left, a soft dotted
   rule filling the remaining width on the right so months read as
   dividers rather than cards. */
.pf-group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 4px 8px;
  font-family: var(--app-font-family, inherit);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  color: #8a8d90;
  &:first-child { padding-top: 4px; }
}
.pf-group-label { font-weight: 600; }
.pf-group-count {
  font-weight: 400;
  opacity: 0.65;
  letter-spacing: 0.04em;
}
.pf-group-line {
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(to right, rgba(140, 140, 140, 0.3) 0 3px, transparent 3px 6px);
}

.pf-entry {
  /* Row shape mirrors the Timeline row density: generous padding, grid
     with a fixed left meta column and a flexible body, hover tint for
     interaction. */
  display: grid;
  grid-template-columns: 92px 1fr auto;
  column-gap: 14px;
  padding: 14px 14px 14px 14px;
  border-bottom: 1px solid rgba(140, 140, 140, 0.15);
  border-left: 3px solid rgba(140, 140, 140, 0.2);
  margin-left: 2px;
  padding-left: 14px;
  align-items: start;
  min-width: 0;
  border-radius: 0;
  transition: background 0.15s ease;
  &:hover {
    background-color: rgba(140, 140, 140, 0.07);
    .pf-actions { opacity: 1; }
    .dark-theme & { background-color: rgba(255, 255, 255, 0.045); }
  }
  &:last-child { border-bottom: 0; }
}
.pf-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  padding-top: 3px;
}
.pf-date {
  font-family: var(--app-font-family, inherit);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  font-weight: 500;
  color: #8a8d90;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.pf-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #5e6ef2;
  margin-left: 2px;
  &.dot-milestone {
    background: #2b7a78;
    box-shadow: 0 0 0 3px rgba(43, 122, 120, 0.14);
    .dark-theme & { background: #5fb3b0; box-shadow: 0 0 0 3px rgba(95, 179, 176, 0.14); }
  }
  &.dot-decision { background: #b8893a; .dark-theme & { background: #d4a85a; } }
  &.dot-block { background: #c84b3b; .dark-theme & { background: #e07866; } }
  &.dot-note { background: #5e6ef2; }
}
.pf-body {
  min-width: 0;
  color: #212529;
  line-height: 1.5;
  overflow-wrap: break-word;
  word-break: normal;
  hyphens: none;
  .dark-theme & { color: #e8e8e8; }
}
.pf-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
/* Pills: saturated solid colour + light text so the kind pops at a
   glance, matching the status pills in the Timeline. */
.pf-kind-pill {
  font-family: var(--app-font-family, inherit);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 3px;
  color: #fff;
  &.kind-milestone { background: #2b7a78;
    .dark-theme & { background: #5fb3b0; color: #0b1f1e; } }
  &.kind-decision { background: #b8893a;
    .dark-theme & { background: #d4a85a; color: #2a1f0a; } }
  &.kind-block { background: #c84b3b;
    .dark-theme & { background: #e07866; color: #2a0f0a; } }
}
.pf-snapshot {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: var(--app-font-family, inherit);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  color: #fff;
  &.snap-monday { background: #4b8a7f;
    .dark-theme & { background: #7bb4a7; color: #0b1f1e; } }
  &.snap-friday { background: #b8893a;
    .dark-theme & { background: #d4a85a; color: #2a1f0a; } }
  i { font-size: 10px; }
}
.pf-phase-tag {
  color: #8a8d90;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-family: var(--app-font-family, inherit);
  padding: 2px 7px;
  border-radius: 3px;
  background: rgba(140, 140, 140, 0.1);
  font-weight: 600;
  &::before { content: ""; margin-right: 0; }
}
.pf-text {
  font-size: 13px;
  word-break: normal;
  overflow-wrap: break-word;
  hyphens: none;
  font-family: var(--app-font-family, inherit);
  line-height: 1.5;
}
.pf-block-info {
  margin-top: 4px;
  font-family: var(--app-font-family, inherit);
  font-size: 11px;
  color: #c84b3b;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  .dark-theme & { color: #e07866; }
}
.pf-block-open {
  font-style: italic;
}
.pf-actions {
  display: flex;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.15s;
  padding-top: 3px;
}
.pf-action-icon {
  color: #8a8d90;
  cursor: pointer;
  font-size: 0.95rem;
  &:hover { color: var(--accent-color, #5e6ef2); }
  &.pf-action-del:hover { color: #c84b3b; }
}

.pf-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 14px 0;
  margin-top: 8px;
  border-top: 1px dashed rgba(140, 140, 140, 0.3);
}
/* Primary-filled CTA that uses the accent colour, matching pt-primary-btn. */
.pf-primary-btn {
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
.pf-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 600;
  color: #8a8d90;
  font-family: var(--app-font-family, inherit);
}
.pf-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.pf-legend-dot {
  width: 9px; height: 9px;
  border-radius: 50%;
  &.dot-milestone { background: #2b7a78; .dark-theme & { background: #5fb3b0; } }
  &.dot-decision { background: #b8893a; .dark-theme & { background: #d4a85a; } }
  &.dot-block { background: #c84b3b; .dark-theme & { background: #e07866; } }
  &.dot-note { background: #5e6ef2; }
}
</style>
