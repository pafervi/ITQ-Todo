<template>
  <div v-if="ready" class="wfb" :class="{ 'is-empty': !chips.length }">
    <template v-if="chips.length">
      <span class="wfb-label">{{ $t("overview.weekThis") }}</span>
      <button v-for="c in chips" :key="c.id" type="button" class="wfb-chip" :class="{ 'is-done': c.done }" :style="{ '--c': c.color }" :title="c.subtitle" @click="open">
        <span class="wfb-dot"></span>
        <span class="wfb-title">{{ c.title }}</span>
        <span v-if="c.subtitle" class="wfb-sub">{{ c.subtitle }}</span>
      </button>
      <button type="button" class="wfb-plan" @click="open">{{ $t("overview.focusEdit") }}</button>
    </template>
    <button v-else type="button" class="wfb-prompt" @click="open">
      <i class="ph ph-plus"></i> {{ $t("overview.focusPrompt") }}
    </button>
  </div>
</template>

<script>
import overviewFocus from "../helpers/overviewFocus";
import projectColorHelper from "../helpers/projectColorHelper";

// One line under the week strip on the Today screen with what the user chose
// to focus on this week (the "Weeks" plan of the overview).
export default {
  name: "weekFocusBar",
  computed: {
    ready() {
      return this.$store.getters.overviewLoaded && !this.$store.getters.overviewOpen;
    },
    projects() {
      return (this.$store.getters.cTodoListIds || [])
        .filter((p) => p && !p.archived)
        .map((p) => ({ id: p.listId, name: p.listName || "", color: p.color || projectColorHelper.solidFor(p.listId) }));
    },
    chips() {
      let phases = this.$store.getters.phases || {};
      return overviewFocus.currentWeek(this.$store.getters.overviewFocus).map((item) => {
        let d = overviewFocus.describe(item, this.projects, phases);
        return { id: item.id, title: d.title, subtitle: d.subtitle, color: d.color || "#7a8aa0", done: !!item.done };
      });
    },
  },
  watch: {
    // Phase names are looked up live; load the phases of the projects the
    // plan points to so renamed phases show their current name.
    "$store.getters.overviewFocus": {
      handler() {
        this.ensurePhases();
      },
      deep: true,
    },
  },
  async mounted() {
    await this.$store.dispatch("loadOverview");
    this.ensurePhases();
  },
  methods: {
    ensurePhases() {
      let seen = {};
      overviewFocus.currentWeek(this.$store.getters.overviewFocus).forEach((f) => {
        if (f.kind !== "phase" || !f.projectId || seen[f.projectId]) return;
        seen[f.projectId] = true;
        if (!this.$store.getters.phases[f.projectId]) this.$store.dispatch("loadPhases", f.projectId);
      });
    },
    open() {
      this.$store.commit("setOverviewMode", "weeks");
      this.$store.commit("setOverviewOpen", true);
    },
  },
};
</script>

<style lang="scss" scoped>
.wfb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 24px 8px;
  font-size: 0.82rem;
}
.wfb-label {
  font-weight: 600;
  opacity: 0.75;
  margin-right: 2px;
}
.wfb-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 320px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
  background: color-mix(in srgb, var(--c) 12%, transparent);
  color: inherit;
  cursor: pointer;

  &.is-done {
    opacity: 0.55;

    .wfb-title {
      text-decoration: line-through;
    }
  }
}
.wfb-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c);
  flex: 0 0 auto;
}
.wfb-title {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wfb-sub {
  opacity: 0.65;
  font-size: 0.74rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wfb-plan,
.wfb-prompt {
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;

  &:hover {
    opacity: 1;
  }
}
.wfb-prompt {
  padding-left: 0;
}
</style>
