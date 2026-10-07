<template>
  <div class="productivity-heatmap">
    <div class="ph-grid">
      <div
        v-for="(day, i) in days"
        :key="i"
        class="ph-cell"
        :class="'ph-level-' + day.level"
        :title="day.title"
      ></div>
    </div>
    <div class="ph-legend">
      <span class="ph-legend-label">{{ $t("ui.mcHeatmapLess") || "Less" }}</span>
      <span class="ph-legend-cell ph-level-0"></span>
      <span class="ph-legend-cell ph-level-1"></span>
      <span class="ph-legend-cell ph-level-2"></span>
      <span class="ph-legend-cell ph-level-3"></span>
      <span class="ph-legend-cell ph-level-4"></span>
      <span class="ph-legend-label">{{ $t("ui.mcHeatmapMore") || "More" }}</span>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import dbRepository from "../repositories/dbRepository";

// Fourteen weeks of daily completions. Reads every daily list (keys look
// like YYYYMMDD) straight out of IndexedDB, counts the checked tasks per
// day and maps each count onto a 0-4 colour level for the grid.
const WEEKS = 14;
const DAYS_PER_WEEK = 7;

export default {
  name: "productivityHeatmap",
  data() {
    return {
      counts: {},
    };
  },
  mounted() {
    this.loadData();
  },
  computed: {
    maxCount() {
      let max = 0;
      Object.values(this.counts).forEach((v) => {
        if (v > max) max = v;
      });
      return max;
    },
    days() {
      let out = [];
      let total = WEEKS * DAYS_PER_WEEK;
      // Right-align on today: last cell = today, grid grows to the past.
      let start = moment().subtract(total - 1, "days");
      for (let i = 0; i < total; i++) {
        let d = start.clone().add(i, "days");
        let key = d.format("YYYYMMDD");
        let count = this.counts[key] || 0;
        out.push({
          key: key,
          count: count,
          level: this.levelFor(count),
          title: d.format("ddd DD MMM") + " — " + count + " ✓",
        });
      }
      return out;
    },
  },
  methods: {
    levelFor(count) {
      if (!count) return 0;
      let max = this.maxCount || 1;
      let ratio = count / max;
      if (ratio >= 0.75) return 4;
      if (ratio >= 0.5) return 3;
      if (ratio >= 0.25) return 2;
      return 1;
    },
    loadData() {
      let db_req = dbRepository.open();
      db_req.onsuccess = (event) => {
        let db = event.target.result;
        let request = dbRepository.selectAll(db, "todo_lists");
        let counts = {};
        request.onsuccess = () => {
          let cursor = request.result;
          if (cursor) {
            let key = String(cursor.key);
            // Only daily lists (YYYYMMDD) feed the heatmap.
            if (/^\d{8}$/.test(key) && Array.isArray(cursor.value)) {
              let done = cursor.value.filter((t) => t && t.checked).length;
              if (done) counts[key] = done;
            }
            cursor.continue();
          } else {
            this.counts = counts;
          }
        };
        request.onerror = () => {
          this.counts = {};
        };
      };
    },
  },
};
</script>

<style scoped lang="scss">
.productivity-heatmap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ph-grid {
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 1fr);
  gap: 3px;
  width: 100%;
  aspect-ratio: 14 / 7;
}

.ph-cell {
  border-radius: 2px;
  min-width: 8px;
  min-height: 8px;
}

.ph-level-0 {
  background-color: rgba(0, 0, 0, 0.06);

  .dark-theme & {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.ph-level-1 {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 22%, transparent);
}

.ph-level-2 {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 45%, transparent);
}

.ph-level-3 {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 70%, transparent);
}

.ph-level-4 {
  background-color: var(--accent-color, #5e6ef2);
}

.ph-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  color: grey;
  justify-content: flex-end;

  .dark-theme & {
    color: #8b949e;
  }
}

.ph-legend-label {
  margin: 0 2px;
}

.ph-legend-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
</style>
