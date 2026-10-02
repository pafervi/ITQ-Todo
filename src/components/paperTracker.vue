<template>
  <div v-if="stat" class="paper-tracker" :title="trackerTitle">
    <div class="pt-head">
      <i class="ph ph-file-text pt-icon"></i>
      <span class="pt-filename">{{ stat.filename }}</span>
      <span class="pt-wordcount">
        <span class="pt-current">{{ stat.words.toLocaleString() }}</span>
        <span v-if="target" class="pt-target">/ {{ target.toLocaleString() }}</span>
        <span class="pt-label">{{ $t('ui.paperWords') || 'words' }}</span>
      </span>
      <button
        type="button"
        class="pt-edit"
        @click.stop="editTarget"
        :title="$t('ui.paperSetTarget') || 'Set target word count'"
      >
        <i class="ph ph-pencil-simple"></i>
      </button>
    </div>
    <div v-if="target" class="pt-progress">
      <div class="pt-progress-fill" :style="progressFillStyle"></div>
    </div>
    <div v-if="stat.sections.length > 1" class="pt-sections">
      <span
        v-for="(s, i) in stat.sections"
        :key="i"
        class="pt-section"
        :title="s.name + ' · ' + s.words.toLocaleString() + ' words'"
      >
        <span class="pt-section-name">{{ s.name }}</span>
        <span class="pt-section-count">{{ s.words }}</span>
      </span>
    </div>
    <input
      v-if="editing"
      ref="targetInput"
      type="number"
      min="0"
      step="500"
      class="pt-target-input"
      v-model.number="targetDraft"
      @blur="saveTarget"
      @keyup.enter="saveTarget"
      @keyup.esc="editing = false"
      :placeholder="$t('ui.paperTargetPlaceholder') || 'target words, e.g. 6000'"
    />
  </div>
</template>

<script>
import paperTrackerHelper from "../helpers/paperTrackerHelper";
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";

export default {
  name: "paperTracker",
  props: {
    folderPath: { type: String, default: "" },
    target: { type: Number, default: null },
    cTodoListIndex: { type: Number, default: null },
  },
  data() {
    return {
      stat: null,
      editing: false,
      targetDraft: this.target || 6000,
      refreshTimer: null,
    };
  },
  mounted() {
    this.refresh();
    // Re-poll every 90s while mounted so the word count tracks the file.
    this.refreshTimer = setInterval(this.refresh, 90 * 1000);
  },
  unmounted() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  },
  watch: {
    folderPath: function () { this.refresh(); },
  },
  methods: {
    refresh: function () {
      try {
        this.stat = paperTrackerHelper.statFor(this.folderPath);
      } catch (e) {
        this.stat = null;
      }
    },
    editTarget: function () {
      this.targetDraft = this.target || 6000;
      this.editing = true;
      this.$nextTick(() => {
        if (this.$refs.targetInput) {
          this.$refs.targetInput.focus();
          this.$refs.targetInput.select();
        }
      });
    },
    saveTarget: function () {
      this.editing = false;
      let value = parseInt(this.targetDraft, 10);
      if (isNaN(value) || value <= 0) value = null;
      if (this.cTodoListIndex == null) return;
      this.$store.commit("updateCustomListField", {
        index: this.cTodoListIndex,
        field: "paperTarget",
        value: value,
      });
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
  },
  computed: {
    progressFillStyle: function () {
      if (!this.target) return { width: "0%" };
      let pct = Math.min(100, Math.round((this.stat.words / this.target) * 100));
      let color = "var(--accent-color, #5e6ef2)";
      if (pct >= 100) color = "#10b981";
      else if (pct >= 66) color = "var(--accent-color, #5e6ef2)";
      else if (pct >= 33) color = "#f59e0b";
      else color = "#9ca3af";
      return { width: pct + "%", backgroundColor: color };
    },
    trackerTitle: function () {
      if (!this.stat) return "";
      let line = `${this.stat.filename} · ${this.stat.words.toLocaleString()} words`;
      if (this.target) {
        let pct = Math.round((this.stat.words / this.target) * 100);
        line += ` · ${pct}% of ${this.target.toLocaleString()}`;
      }
      return line;
    },
  },
};
</script>

<style scoped lang="scss">
.paper-tracker {
  padding: 8px 10px 10px 10px;
  margin: 0 6px 10px 6px;
  background: color-mix(in srgb, var(--project-color, var(--accent-color, #5e6ef2)) 6%, transparent);
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--project-color, var(--accent-color, #5e6ef2)) 14%, transparent);
}

.pt-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
}

.pt-icon {
  color: var(--project-color, var(--accent-color, #5e6ef2));
  font-size: 1rem;
  flex-shrink: 0;
}

.pt-filename {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  font-weight: 500;
}

.pt-wordcount {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
}

.pt-current {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: 0.95rem;
  font-variation-settings: "opsz" 48, "wght" 460;
}

.pt-target {
  opacity: 0.6;
  font-size: 0.75rem;
}

.pt-label {
  margin-left: 2px;
  font-size: 0.65rem;
  opacity: 0.6;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pt-edit {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: inherit;
  opacity: 0.4;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;

  &:hover { opacity: 1; }

  i { font-size: 0.9rem; }
}

.pt-progress {
  height: 3px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}

.dark-theme .pt-progress { background: rgba(255, 255, 255, 0.08); }

.pt-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.2, 1, 0.1, 1), background-color 0.3s ease;
}

.pt-sections {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.pt-section {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.66rem;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.05);
  color: inherit;
}

.dark-theme .pt-section { background: rgba(255, 255, 255, 0.06); }

.pt-section-name { font-weight: 500; max-width: 10rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-section-count { opacity: 0.6; font-variant-numeric: tabular-nums; }

.pt-target-input {
  margin-top: 6px;
  width: 100%;
  font-size: 0.78rem;
  padding: 3px 6px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 5px;
  background: white;

  &:focus { outline: none; border-color: var(--project-color, var(--accent-color, #5e6ef2)); }
}

.dark-theme .pt-target-input {
  background: #0d1326;
  border-color: rgba(94, 110, 242, 0.3);
  color: #eef1ff;
}
</style>
