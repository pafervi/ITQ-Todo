<template>
  <div class="modal fade" id="addLogEntryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ isNew ? ($t('phased.newLogEntry') || 'New log entry') : ($t('phased.editLogEntry') || 'Edit log entry') }}
          </h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal" @click="reset"></i>
        </div>
        <div class="modal-body">
          <div class="le-kind-row">
            <button
              v-for="k in kinds"
              :key="k.value"
              type="button"
              class="le-kind-btn"
              :class="{ active: draft.kind === k.value, ['kind-' + k.value]: true }"
              @click="draft.kind = k.value"
            >
              <span class="le-kind-dot" :class="'kind-' + k.value"></span>
              {{ k.label }}
            </button>
          </div>
          <div class="le-field">
            <label>{{ $t('phased.entryDate') || 'Date' }}</label>
            <input type="date" v-model="draft.date" />
          </div>
          <div v-if="draft.kind === 'block'" class="le-field">
            <label>{{ $t('phased.blockEndDate') || 'End date (optional)' }}</label>
            <input type="date" v-model="draft.blockEndDate" />
            <small class="le-hint">{{ $t('phased.blockEndHint') || 'Leave empty if the block is still ongoing.' }}</small>
          </div>
          <div class="le-field">
            <label>{{ $t('phased.entryPhase') || 'Phase (optional)' }}</label>
            <select v-model="draft.phaseId">
              <option :value="null">{{ $t('phased.noPhase') || '— No specific phase —' }}</option>
              <option v-for="p in orderedPhases" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="le-field">
            <label>{{ $t('phased.entryText') || 'Entry text' }}</label>
            <textarea v-model="draft.text" rows="3" ref="textInput"
              :placeholder="placeholderFor(draft.kind)"></textarea>
          </div>
          <div v-if="error" class="le-error">{{ error }}</div>
        </div>
        <div class="modal-footer">
          <button v-if="!isNew" type="button" class="btn btn-outline-danger btn-sm le-remove"
            @click="removeEntry">{{ $t('phased.removeEntry') || 'Remove' }}</button>
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
import logEntryRepository from "../repositories/logEntryRepository";
import phasedProjectHelper from "../helpers/phasedProjectHelper";

export default {
  name: "addLogEntryModal",
  data() {
    return {
      draft: this.blankDraft(),
      target: null,
      projectId: "",
      error: "",
    };
  },
  computed: {
    isNew() { return !this.target; },
    kinds() {
      return [
        { value: "note", label: this.$t("phased.kindNote") || "Note" },
        { value: "milestone", label: this.$t("phased.kindMilestone") || "Milestone" },
        { value: "decision", label: this.$t("phased.kindDecision") || "Decision" },
        { value: "block", label: this.$t("phased.kindBlock") || "Block" },
      ];
    },
    orderedPhases() {
      let list = this.$store.getters.phases[this.projectId] || [];
      return list.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    },
  },
  mounted() {
    let modalEl = document.getElementById("addLogEntryModal");
    if (modalEl) modalEl.addEventListener("show.bs.modal", this.onShow);
  },
  beforeUnmount() {
    let modalEl = document.getElementById("addLogEntryModal");
    if (modalEl) modalEl.removeEventListener("show.bs.modal", this.onShow);
  },
  methods: {
    blankDraft() {
      return {
        date: moment().format("YYYY-MM-DD"),
        kind: "note",
        text: "",
        phaseId: null,
        blockEndDate: "",
      };
    },
    onShow() {
      let payload = this.$store.getters.logEntryEditorTarget || {};
      this.projectId = payload.projectId || "";
      this.target = payload.entry || null;
      let prefilledKind = payload.kind || null;
      let prefilledPhaseId = payload.phaseId || null;
      if (this.target) {
        this.draft = {
          date: this.target.date || moment().format("YYYY-MM-DD"),
          kind: this.target.kind || "note",
          text: this.target.text || "",
          phaseId: this.target.phaseId || null,
          blockEndDate: this.target.blockEndDate || "",
        };
      } else {
        this.draft = this.blankDraft();
        if (prefilledKind) this.draft.kind = prefilledKind;
        if (prefilledPhaseId) this.draft.phaseId = prefilledPhaseId;
      }
      this.error = "";
      this.$nextTick(() => {
        if (this.$refs.textInput) this.$refs.textInput.focus();
      });
    },
    placeholderFor(kind) {
      switch (kind) {
        case "milestone": return this.$t("phased.phMilestone") || "e.g. Benchmark closed, SCAN selected";
        case "decision": return this.$t("phased.phDecision") || "e.g. Move to MACE L1, L0 insufficient for Al-Al";
        case "block": return this.$t("phased.phBlock") || "e.g. Marenostrum maintenance until Sep 25";
        case "note":
        default: return this.$t("phased.phNote") || "What happened?";
      }
    },
    reset() {
      this.target = null;
      this.projectId = "";
      this.error = "";
    },
    hideModal() {
      let modalEl = document.getElementById("addLogEntryModal");
      let modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.hide();
    },
    save() {
      if (!this.draft.text.trim()) {
        this.error = this.$t("phased.errTextRequired") || "Entry text cannot be empty";
        return;
      }
      if (!this.draft.date) {
        this.error = this.$t("phased.errDateRequired") || "A date is required";
        return;
      }
      if (!this.projectId) {
        this.error = this.$t("phased.errNoProject") || "Project id missing";
        return;
      }
      let patch = {
        date: this.draft.date,
        kind: this.draft.kind,
        text: this.draft.text.trim(),
        phaseId: this.draft.phaseId || null,
        blockEndDate: this.draft.kind === "block" ? (this.draft.blockEndDate || null) : null,
      };
      if (this.target) {
        this.$store.commit("updateLogEntry", {
          projectId: this.projectId,
          entryId: this.target.id,
          patch: patch,
        });
      } else {
        this.$store.commit("addLogEntry", {
          id: phasedProjectHelper.newId("le"),
          projectId: this.projectId,
          ...patch,
        });
      }
      logEntryRepository.update(this.projectId, this.$store.getters.logEntries[this.projectId] || []);
      this.hideModal();
      this.reset();
    },
    removeEntry() {
      if (!this.target) return;
      let confirmed = window.confirm(this.$t("phased.confirmRemoveEntry") || "Remove this log entry?");
      if (!confirmed) return;
      this.$store.commit("removeLogEntry", { projectId: this.projectId, entryId: this.target.id });
      logEntryRepository.update(this.projectId, this.$store.getters.logEntries[this.projectId] || []);
      this.hideModal();
      this.reset();
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog { max-width: 460px; }
.le-kind-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.le-kind-btn {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #d0d5da;
  background: transparent;
  font-size: 0.82rem;
  cursor: pointer;
  color: #5c5c5c;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  .dark-theme & { color: #c9d1d9; border-color: #30363d; }
  &.active.kind-note { background: rgba(94, 110, 242, 0.18); border-color: #5e6ef2; color: #5e6ef2; }
  &.active.kind-milestone { background: rgba(43, 122, 120, 0.18); border-color: #2b7a78; color: #2b7a78; }
  &.active.kind-decision { background: rgba(184, 137, 58, 0.18); border-color: #b8893a; color: #b8893a; }
  &.active.kind-block { background: rgba(200, 75, 59, 0.18); border-color: #c84b3b; color: #c84b3b; }
}
.le-kind-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  &.kind-note { background: #5e6ef2; }
  &.kind-milestone { background: #2b7a78; }
  &.kind-decision { background: #b8893a; }
  &.kind-block { background: #c84b3b; }
}
.le-field {
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
  input[type="date"], select, textarea {
    padding: 6px 10px;
    border: 1px solid #d0d5da;
    border-radius: 5px;
    font-size: 0.9rem;
    background: #fff;
    color: #212529;
    font-family: inherit;
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
  textarea { resize: vertical; }
  .le-hint {
    font-size: 0.76rem;
    color: #8a8d90;
    margin-top: 2px;
  }
}
.le-error {
  color: #c84b3b;
  font-size: 0.82rem;
  padding: 6px 10px;
  background: rgba(200, 75, 59, 0.1);
  border-radius: 4px;
  margin-top: 6px;
}
.le-remove {
  margin-right: auto;
}
</style>
