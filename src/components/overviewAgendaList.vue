<template>
  <div class="oal">
    <p v-if="loading" class="oal-muted">...</p>
    <template v-else>
      <p v-if="data.load" class="oal-peak">{{ $t("overview.nextWeeksPeak", [formatDay(data.load.start), data.load.count]) }}</p>
      <ul v-if="shown.length" class="oal-list">
        <li v-for="(e, i) in shown" :key="i" class="oal-item" :class="'ak-' + e.kind">
          <span class="oal-date">{{ e.ongoing ? $t("overview.agendaNow") : formatDay(e.date) }}</span>
          <span class="oal-main">
            <span class="oal-title">{{ e.title }}</span>
            <span class="oal-meta">{{ $t("overview.agendaKind." + kindKey(e.kind)) }}{{ e.source ? " · " + e.source : "" }}</span>
          </span>
        </li>
      </ul>
      <p v-else class="oal-muted">{{ $t("overview.nextWeeksEmpty") }}</p>
      <p v-if="data.entries.length > shown.length" class="oal-muted">+{{ data.entries.length - shown.length }}</p>
    </template>
  </div>
</template>

<script>
import moment from "moment";
import overviewAgenda from "../helpers/overviewAgenda";

// Compact "next 30 days" list fed by the long-term overview (task deadlines,
// next talk, planned periods, phase and project ends). Used inside the Friday
// wrap-up and the weekly summary. It loads its own data when mounted and again
// whenever `refreshToken` changes, and emits `loaded` with { entries, load }.
export default {
  name: "overviewAgendaList",
  props: {
    limit: { type: Number, default: 8 },
    days: { type: Number, default: 30 },
    refreshToken: { type: Number, default: 0 },
  },
  emits: ["loaded"],
  data() {
    return { loading: true, data: { entries: [], load: null } };
  },
  computed: {
    shown() {
      return this.data.entries.slice(0, this.limit);
    },
    language() {
      return this.$store.getters.config.language;
    },
  },
  watch: {
    refreshToken() {
      this.refresh();
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    async refresh() {
      this.loading = true;
      try {
        let input = await overviewAgenda.load(this.$store);
        this.data = overviewAgenda.build(input, undefined, this.days);
      } catch (e) {
        this.data = { entries: [], load: null };
      }
      this.loading = false;
      this.$emit("loaded", this.data);
    },
    kindKey(kind) {
      return overviewAgenda.kindKey(kind);
    },
    formatDay(date) {
      return moment(date, "YYYY-MM-DD").locale(this.language).format("D MMM");
    },
  },
};
</script>

<style lang="scss" scoped>
.oal-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.oal-item {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  font-size: 0.9rem;
}
.oal-date {
  flex: 0 0 58px;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
  padding-top: 2px;
}
.oal-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.oal-title {
  font-weight: 500;
}
.oal-meta {
  font-size: 0.72rem;
  opacity: 0.65;
}
.oal-item.ak-deadline .oal-meta,
.oal-item.ak-talk .oal-meta {
  color: #e8553d;
  opacity: 1;
}
.oal-item.ak-paper .oal-meta {
  color: #9b6bd6;
  opacity: 1;
}
.oal-peak {
  margin: 0 0 6px;
  font-size: 0.8rem;
  opacity: 0.75;
}
.oal-muted {
  margin: 4px 0;
  font-size: 0.85rem;
  font-style: italic;
  opacity: 0.65;
}
</style>
