<template>
  <div class="heatmap">
    <div class="heatmap-grid" :style="{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }">
      <div class="heatmap-week" v-for="(week, wi) in weeks" :key="wi">
        <span
          v-for="(day, di) in week"
          :key="di"
          class="heatmap-cell"
          :class="cellClass(day)"
          :title="cellTitle(day)"
        ></span>
      </div>
    </div>
    <div class="heatmap-legend">
      <span>{{ $t("ui.heatmapLess") }}</span>
      <span class="heatmap-cell level-0"></span>
      <span class="heatmap-cell level-1"></span>
      <span class="heatmap-cell level-2"></span>
      <span class="heatmap-cell level-3"></span>
      <span class="heatmap-cell level-4"></span>
      <span>{{ $t("ui.heatmapMore") }}</span>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import dbRepository from "../repositories/dbRepository";

const DAYS_BACK = 84; // ~12 weeks

export default {
  name: "productivityHeatmap",
  data() {
    return {
      byDate: {},
    };
  },
  mounted() {
    this.loadData();
  },
  methods: {
    loadData: function () {
      let db_req = dbRepository.open();
      db_req.onsuccess = (event) => {
        let db = event.target.result;
        let request = dbRepository.selectAll(db, "todo_lists");
        let byDate = {};
        request.onsuccess = () => {
          let cursor = request.result;
          if (cursor) {
            if (/^\d{8}$/.test(cursor.key) && Array.isArray(cursor.value)) {
              let total = cursor.value.length;
              let done = cursor.value.filter((t) => t.checked).length;
              byDate[cursor.key] = { total: total, done: done };
            }
            cursor.continue();
          } else {
            this.byDate = byDate;
          }
        };
      };
    },
    cellClass: function (day) {
      let entry = this.byDate[day.key];
      if (!entry || !entry.total) return "level-0";
      let ratio = entry.done / entry.total;
      if (ratio >= 1) return "level-4";
      if (ratio >= 0.66) return "level-3";
      if (ratio >= 0.33) return "level-2";
      return "level-1";
    },
    cellTitle: function (day) {
      let entry = this.byDate[day.key];
      let dateLabel = moment(day.key, "YYYYMMDD").format("DD/MM/YYYY");
      if (!entry || !entry.total) return `${dateLabel}: ${this.$t("ui.heatmapNoTasks")}`;
      return `${dateLabel}: ${entry.done}/${entry.total}`;
    },
  },
  computed: {
    weeks: function () {
      // Build a flat list of the last DAYS_BACK days, then chunk into
      // 7-day weeks (Monday-first) so the grid reads like a GitHub
      // contributions graph.
      let days = [];
      let start = moment().subtract(DAYS_BACK - 1, "days");
      for (let i = 0; i < DAYS_BACK; i++) {
        let d = moment(start).add(i, "days");
        days.push({ key: d.format("YYYYMMDD"), weekday: d.isoWeekday() });
      }
      // pad the front so the first column starts on Monday
      let firstWeekday = days[0].weekday;
      for (let i = 1; i < firstWeekday; i++) {
        days.unshift({ key: "", weekday: i });
      }
      let weeks = [];
      for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }
      return weeks;
    },
  },
};
</script>

<style scoped lang="scss">
.heatmap-grid {
  display: grid;
  gap: 3px;
}

.heatmap-week {
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  gap: 3px;
}

.heatmap-cell {
  width: 100%;
  aspect-ratio: 1;
  min-width: 8px;
  min-height: 8px;
  border-radius: 2px;
  background-color: #eaecef;

  .dark-theme & {
    background-color: #21262d;
  }
}

.heatmap-cell.level-0 {
  background-color: #eaecef;

  .dark-theme & {
    background-color: #21262d;
  }
}

.heatmap-cell.level-1 {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 25%, #eaecef 75%);
}

.heatmap-cell.level-2 {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 50%, #eaecef 50%);
}

.heatmap-cell.level-3 {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 75%, #eaecef 25%);
}

.heatmap-cell.level-4 {
  background-color: var(--accent-color, #5e6ef2);
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 8px;
  font-size: 0.68rem;
  color: grey;

  .dark-theme & {
    color: #8b949e;
  }

  .heatmap-cell {
    width: 10px;
    height: 10px;
    min-width: 10px;
    min-height: 10px;
  }
}
</style>
