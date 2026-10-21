<template>
  <div class="modal fade" id="snapshotPromptModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i :class="headerIcon" class="me-2"></i>
            {{ title }}
          </h5>
        </div>
        <div class="modal-body">
          <p class="snap-intro">{{ intro }}</p>
          <div v-if="!projects.length" class="snap-empty">
            {{ $t('phased.snapshotNoProjects') || 'No active phased projects to snapshot.' }}
          </div>
          <div v-for="p in projects" :key="p.cList.listId" class="snap-project">
            <div class="snap-project-head">
              <i v-if="p.cList.icon" :class="p.cList.icon" class="snap-project-icon" :style="p.cList.color ? { color: p.cList.color } : null"></i>
              <span class="snap-project-name">{{ p.cList.listName || ($t('ui.untitledProject') || 'Untitled project') }}</span>
              <span v-if="p.activePhase" class="snap-active-phase">· {{ p.activePhase.name }}</span>
            </div>
            <textarea
              v-model="responses[p.cList.listId]"
              class="snap-textarea"
              rows="3"
              :placeholder="placeholder"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" @click="skipAll">
            {{ $t('phased.snapshotSkip') || 'Skip this week' }}
          </button>
          <button type="button" class="btn btn-primary btn-sm" @click="saveAll">
            {{ $t('phased.snapshotSave') || 'Save snapshot' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from "bootstrap";
import moment from "moment";
import logEntryRepository from "../repositories/logEntryRepository";
import configRepository from "../repositories/configRepository";
import phasedProjectHelper from "../helpers/phasedProjectHelper";

export default {
  name: "snapshotPromptModal",
  data() {
    return {
      kind: "monday", // 'monday' | 'friday'
      responses: {}, // keyed by projectId
    };
  },
  computed: {
    projects() {
      // Phased projects that are not archived, that have at least one phase
      // not in 'done' or 'pending' at some point this week. We keep it
      // simple: any non-archived phased project with any phase.
      let cTodoListIds = this.$store.getters.cTodoListIds || [];
      let phasesDict = this.$store.getters.phases || {};
      let out = [];
      cTodoListIds.forEach((cList) => {
        if (!phasedProjectHelper.isPhased(cList)) return;
        if (cList.archived) return;
        let phases = phasesDict[cList.listId] || [];
        if (!phases.length) return;
        let activePhase = phases.find((p) => p.status === "active");
        out.push({ cList: cList, activePhase: activePhase || null });
      });
      return out;
    },
    title() {
      return this.kind === "monday"
        ? (this.$t("phased.snapshotMondayTitle") || "Monday open")
        : (this.$t("phased.snapshotFridayTitle") || "Friday close");
    },
    intro() {
      return this.kind === "monday"
        ? (this.$t("phased.snapshotMondayIntro") || "What is the state of each project right now, and what moves this week?")
        : (this.$t("phased.snapshotFridayIntro") || "What closed this week on each project, and what is left?");
    },
    placeholder() {
      return this.kind === "monday"
        ? (this.$t("phased.snapshotMondayPlaceholder") || "Where it stands, what moves this week...")
        : (this.$t("phased.snapshotFridayPlaceholder") || "What closed, what is left, what blocked...");
    },
    headerIcon() {
      return this.kind === "monday" ? "bi-calendar-plus" : "bi-calendar-check";
    },
  },
  mounted() {
    let modalEl = document.getElementById("snapshotPromptModal");
    if (modalEl) modalEl.addEventListener("show.bs.modal", this.onShow);
  },
  beforeUnmount() {
    let modalEl = document.getElementById("snapshotPromptModal");
    if (modalEl) modalEl.removeEventListener("show.bs.modal", this.onShow);
  },
  methods: {
    onShow() {
      let payload = this.$store.getters.snapshotPromptTarget || {};
      this.kind = payload.kind || "monday";
      this.responses = {};
      this.projects.forEach((p) => (this.responses[p.cList.listId] = ""));
    },
    hideModal() {
      let modalEl = document.getElementById("snapshotPromptModal");
      let modal = Modal.getInstance(modalEl);
      if (modal) modal.hide();
    },
    stampSnapshot() {
      let config = configRepository.load();
      let todayKey = moment().format("YYYY-MM-DD");
      if (this.kind === "monday") config.lastMondaySnapshot = todayKey;
      if (this.kind === "friday") config.lastFridaySnapshot = todayKey;
      configRepository.update(config);
      this.$store.commit("loadConfig", config);
    },
    skipAll() {
      this.stampSnapshot();
      this.hideModal();
    },
    saveAll() {
      let todayKey = moment().format("YYYY-MM-DD");
      this.projects.forEach((p) => {
        let text = (this.responses[p.cList.listId] || "").trim();
        if (!text) return;
        let activePhaseId = p.activePhase ? p.activePhase.id : null;
        let entry = {
          id: phasedProjectHelper.newId("le"),
          projectId: p.cList.listId,
          phaseId: activePhaseId,
          date: todayKey,
          kind: "note",
          text: text,
          blockEndDate: null,
          snapshotKind: this.kind,
        };
        this.$store.commit("addLogEntry", entry);
        logEntryRepository.update(p.cList.listId, this.$store.getters.logEntries[p.cList.listId] || []);
      });
      this.stampSnapshot();
      this.hideModal();
    },
  },
};
</script>

<style scoped lang="scss">
.snap-intro {
  font-size: 0.9rem;
  color: #5c5c5c;
  margin-bottom: 16px;
  .dark-theme & { color: #c9d1d9; }
}
.snap-empty {
  padding: 24px;
  text-align: center;
  color: #8a8d90;
  font-style: italic;
}
.snap-project {
  margin-bottom: 16px;
  padding: 10px 12px;
  background: rgba(140, 140, 140, 0.06);
  border-radius: 5px;
  .dark-theme & { background: rgba(255, 255, 255, 0.03); }
}
.snap-project-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 0.95rem;
}
.snap-project-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}
.snap-project-name {
  font-weight: 500;
  color: #212529;
  .dark-theme & { color: #e8e8e8; }
}
.snap-active-phase {
  color: #8a8d90;
  font-size: 0.85rem;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
}
.snap-textarea {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d0d5da;
  border-radius: 5px;
  font-size: 0.9rem;
  font-family: inherit;
  background: #fff;
  color: #212529;
  resize: vertical;
  .dark-theme & {
    background: #21262d;
    color: #c9d1d9;
    border-color: #30363d;
  }
  &:focus {
    outline: none;
    border-color: var(--accent-color, #5e6ef2);
  }
}
</style>
