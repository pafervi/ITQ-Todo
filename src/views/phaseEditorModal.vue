<template>
  <div class="modal fade" id="phaseEditorModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ isNew ? ($t('phased.newPhase') || 'New phase') : ($t('phased.editPhase') || 'Edit phase') }}
          </h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal" @click="reset"></i>
        </div>
        <div class="modal-body">
          <div class="pe-field">
            <label>{{ $t('phased.phaseName') || 'Name' }}</label>
            <input type="text" v-model="draft.name" :placeholder="$t('phased.phaseNamePlaceholder') || 'e.g. Benchmark DFT'" ref="nameInput" />
          </div>
          <div class="pe-row">
            <div class="pe-field">
              <label>{{ $t('phased.startDate') || 'Start date' }}</label>
              <input type="date" v-model="draft.startDate" />
            </div>
            <div class="pe-field">
              <label>{{ $t('phased.endDate') || 'End date' }}</label>
              <input type="date" v-model="draft.endDate" />
            </div>
          </div>
          <div class="pe-field">
            <label>{{ $t('phased.phaseStatus') || 'Status' }}</label>
            <div class="pe-status-row">
              <button
                v-for="s in statuses"
                :key="s.value"
                type="button"
                class="pe-status-btn"
                :class="{ active: draft.status === s.value, ['status-' + s.value]: true }"
                @click="draft.status = s.value"
              >{{ s.label }}</button>
            </div>
          </div>
          <div class="pe-field pe-color-field">
            <label>{{ $t('phased.phaseColor') || 'Color (optional)' }}</label>
            <div class="pe-color-row">
              <span
                class="pe-color-swatch pe-color-auto"
                :class="{ active: !draft.color }"
                @click="draft.color = ''"
                :title="$t('phased.colorAuto') || 'Auto from palette'"
              ></span>
              <span
                v-for="c in palette"
                :key="c"
                class="pe-color-swatch"
                :class="{ active: draft.color === c }"
                :style="{ background: c }"
                @click="draft.color = c"
              ></span>
            </div>
          </div>
          <div v-if="error" class="pe-error">{{ error }}</div>
        </div>
        <div class="modal-footer">
          <button v-if="!isNew" type="button" class="btn btn-outline-danger btn-sm pe-remove"
            @click="removePhase">{{ $t('phased.removePhase') || 'Remove' }}</button>
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal" @click="reset">
            {{ $t('ui.cancel') || 'Cancel' }}
          </button>
          <button type="button" class="btn btn-primary btn-sm" @click="save">
            {{ $t('ui.save') || 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from "bootstrap";
import moment from "moment";
import phaseRepository from "../repositories/phaseRepository";
import logEntryRepository from "../repositories/logEntryRepository";
import phasedProjectHelper from "../helpers/phasedProjectHelper";

export default {
  name: "phaseEditorModal",
  data() {
    return {
      draft: this.blankDraft(),
      target: null, // existing phase being edited (null when creating)
      projectId: "",
      error: "",
    };
  },
  computed: {
    isNew() {
      return !this.target;
    },
    palette() {
      return phasedProjectHelper.palette();
    },
    statuses() {
      return [
        { value: "pending", label: this.$t("phased.statusPending") || "Pending" },
        { value: "active", label: this.$t("phased.statusActive") || "Active" },
        { value: "done", label: this.$t("phased.statusDone") || "Done" },
        { value: "blocked", label: this.$t("phased.statusBlocked") || "Blocked" },
      ];
    },
  },
  mounted() {
    // Opened programatically by the parent, which pushes target+projectId via
    // the actions store before showing the modal.
    let modalEl = document.getElementById("phaseEditorModal");
    if (modalEl) {
      modalEl.addEventListener("show.bs.modal", this.onShow);
    }
  },
  beforeUnmount() {
    let modalEl = document.getElementById("phaseEditorModal");
    if (modalEl) {
      modalEl.removeEventListener("show.bs.modal", this.onShow);
    }
  },
  methods: {
    blankDraft() {
      let today = moment().format("YYYY-MM-DD");
      let twoWeeks = moment().add(14, "days").format("YYYY-MM-DD");
      return {
        name: "",
        startDate: today,
        endDate: twoWeeks,
        status: "pending",
        color: "",
      };
    },
    onShow() {
      let payload = this.$store.getters.phaseEditorTarget || {};
      this.projectId = payload.projectId || "";
      this.target = payload.phase || null;
      if (this.target) {
        this.draft = {
          name: this.target.name || "",
          startDate: this.target.startDate || moment().format("YYYY-MM-DD"),
          endDate: this.target.endDate || moment().add(14, "days").format("YYYY-MM-DD"),
          status: this.target.status || "pending",
          color: this.target.color || "",
        };
      } else {
        this.draft = this.blankDraft();
      }
      this.error = "";
      this.$nextTick(() => {
        if (this.$refs.nameInput) this.$refs.nameInput.focus();
      });
    },
    reset() {
      this.target = null;
      this.projectId = "";
      this.error = "";
    },
    hideModal() {
      let modalEl = document.getElementById("phaseEditorModal");
      let modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.hide();
    },
    save() {
      if (!this.draft.name.trim()) {
        this.error = this.$t("phased.errNameRequired") || "A phase name is required";
        return;
      }
      if (!this.draft.startDate || !this.draft.endDate) {
        this.error = this.$t("phased.errDatesRequired") || "Start and end date are required";
        return;
      }
      if (moment(this.draft.endDate).isBefore(this.draft.startDate)) {
        this.error = this.$t("phased.errDateOrder") || "End date cannot be before start date";
        return;
      }
      if (!this.projectId) {
        this.error = this.$t("phased.errNoProject") || "Project id missing";
        return;
      }
      let prevStatus = this.target ? this.target.status : null;
      if (this.target) {
        this.$store.commit("updatePhase", {
          projectId: this.projectId,
          phaseId: this.target.id,
          patch: {
            name: this.draft.name.trim(),
            startDate: this.draft.startDate,
            endDate: this.draft.endDate,
            status: this.draft.status,
            color: this.draft.color || "",
          },
        });
      } else {
        let phases = (this.$store.getters.phases[this.projectId] || []).slice();
        let nextOrder = phases.length;
        this.$store.commit("addPhase", {
          id: phasedProjectHelper.newId("ph"),
          projectId: this.projectId,
          name: this.draft.name.trim(),
          startDate: this.draft.startDate,
          endDate: this.draft.endDate,
          status: this.draft.status,
          order: nextOrder,
          color: this.draft.color || "",
        });
      }
      phaseRepository.update(this.projectId, this.$store.getters.phases[this.projectId] || []);
      this.autoLog(prevStatus);
      this.hideModal();
      this.reset();
    },
    autoLog(prevStatus) {
      // Status transitions get an automatic log entry so the feed/timeline
      // reflect the change without extra typing. Only runs when the status
      // actually changed, so routine edits do not spam the log.
      if (!this.target && this.draft.status === "pending") return;
      if (this.target && prevStatus === this.draft.status) return;
      let kind = null;
      let text = "";
      let phaseName = this.draft.name.trim();
      if (this.draft.status === "done") {
        kind = "milestone";
        text = (this.$t("phased.autoLogClosed") || "Phase closed") + ": " + phaseName;
      } else if (this.draft.status === "blocked") {
        kind = "block";
        text = (this.$t("phased.autoLogBlocked") || "Phase blocked") + ": " + phaseName;
      } else if (this.draft.status === "active" && prevStatus !== "active") {
        kind = "milestone";
        text = (this.$t("phased.autoLogStarted") || "Phase started") + ": " + phaseName;
      }
      if (!kind) return;
      let phaseId = this.target ? this.target.id : null;
      // For a brand-new phase the id was just generated inside addPhase; find
      // it by scanning the latest entry in the store for this project.
      if (!phaseId) {
        let list = this.$store.getters.phases[this.projectId] || [];
        if (list.length) phaseId = list[list.length - 1].id;
      }
      let entry = {
        id: phasedProjectHelper.newId("le"),
        projectId: this.projectId,
        phaseId: phaseId,
        date: moment().format("YYYY-MM-DD"),
        kind: kind,
        text: text,
        blockEndDate: null,
      };
      this.$store.commit("addLogEntry", entry);
      logEntryRepository.update(this.projectId, this.$store.getters.logEntries[this.projectId] || []);
    },
    removePhase() {
      if (!this.target) return;
      let confirmed = window.confirm(this.$t("phased.confirmRemovePhase") || "Remove this phase? Its tasks will stay in the project without a phase.");
      if (!confirmed) return;
      // Detach any log entry attached to this phase (keep the entry; just
      // unlink from the removed phase).
      let entries = (this.$store.getters.logEntries[this.projectId] || []).slice();
      let touched = false;
      entries.forEach((e) => {
        if (e.phaseId === this.target.id) {
          this.$store.commit("updateLogEntry", { projectId: this.projectId, entryId: e.id, patch: { phaseId: null } });
          touched = true;
        }
      });
      this.$store.commit("removePhase", { projectId: this.projectId, phaseId: this.target.id });
      phaseRepository.update(this.projectId, this.$store.getters.phases[this.projectId] || []);
      if (touched) logEntryRepository.update(this.projectId, this.$store.getters.logEntries[this.projectId] || []);
      this.hideModal();
      this.reset();
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog { max-width: 440px; }
.pe-field {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #8a8d90;
  }
  input[type="text"], input[type="date"] {
    padding: 6px 10px;
    border: 1px solid #d0d5da;
    border-radius: 5px;
    font-size: 0.9rem;
    background: #fff;
    color: #212529;
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
}
.pe-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pe-status-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pe-status-btn {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #d0d5da;
  background: transparent;
  font-size: 0.82rem;
  cursor: pointer;
  color: #5c5c5c;
  .dark-theme & { color: #c9d1d9; border-color: #30363d; }
  &.active.status-pending { background: rgba(140, 140, 140, 0.15); border-color: #8a8d90; }
  &.active.status-active { background: rgba(43, 122, 120, 0.18); border-color: #2b7a78; color: #2b7a78; }
  &.active.status-done { background: rgba(75, 138, 127, 0.18); border-color: #4b8a7f; color: #4b8a7f; }
  &.active.status-blocked { background: rgba(200, 75, 59, 0.18); border-color: #c84b3b; color: #c84b3b; }
}
.pe-color-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.pe-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 1.5px solid transparent;
  background: #d0d5da;
  &.active { border-color: #212529; .dark-theme & { border-color: #f0f0f0; } }
}
.pe-color-auto {
  background: conic-gradient(#3f6d9a, #4b8a7f, #b8893a, #a3573b, #7a5a98, #3f6d9a);
}
.pe-error {
  color: #c84b3b;
  font-size: 0.82rem;
  padding: 6px 10px;
  background: rgba(200, 75, 59, 0.1);
  border-radius: 4px;
  margin-top: 6px;
}
.pe-remove {
  margin-right: auto;
}
</style>
