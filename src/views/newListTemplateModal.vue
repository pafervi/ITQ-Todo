<template>
  <div class="modal fade" id="newListTemplateModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ $t("ui.newCustomList") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal" @click="resetDraft"></i>
        </div>
        <div class="modal-body">
          <!-- Project type selector: checklist (the classic path, pick a
               template) or phased (a scientific/constructive project with
               phases, timeline and feed). -->
          <div class="type-switch">
            <button
              type="button"
              class="type-switch-btn"
              :class="{ active: projectType === 'checklist' }"
              @click="projectType = 'checklist'"
            >
              <i class="bi-check2-square"></i>
              <span>{{ $t('phased.typeChecklist') || 'Checklist' }}</span>
              <small>{{ $t('phased.typeChecklistHint') || 'Classic project with tasks to tick off' }}</small>
            </button>
            <button
              type="button"
              class="type-switch-btn"
              :class="{ active: projectType === 'phased' }"
              @click="projectType = 'phased'"
            >
              <i class="bi-bar-chart-steps"></i>
              <span>{{ $t('phased.typePhased') || 'Phased' }}</span>
              <small>{{ $t('phased.typePhasedHint') || 'Scientific project with phases over time' }}</small>
            </button>
          </div>

          <!-- Checklist path: the classic template picker. -->
          <div v-if="projectType === 'checklist'" class="checklist-path">
            <button
              v-for="tpl in templates"
              :key="tpl.id"
              type="button"
              class="template-option"
              @click="selectTemplate(tpl)"
            >
              <i :class="tpl.icon" :style="tpl.isUser && tpl.color ? { color: tpl.color } : null"></i>
              <span>{{ tplLabel(tpl) }}</span>
            </button>
            <button
              type="button"
              class="template-edit-link"
              data-bs-dismiss="modal"
              data-bs-toggle="modal"
              data-bs-target="#editTemplatesModal"
            >
              <i class="ph ph-sliders-horizontal"></i>
              <span>{{ $t("ui.editTemplates") }}</span>
            </button>
          </div>

          <!-- Phased path: name + rough project range. Fine-grained phases
               are added later from the project header, this just sets the
               project envelope. -->
          <div v-if="projectType === 'phased'" class="phased-path">
            <div class="pz-field">
              <label>{{ $t('phased.projectName') || 'Project name' }}</label>
              <input type="text" v-model="phasedDraft.name" ref="phasedNameInput"
                :placeholder="$t('phased.projectNamePlaceholder') || 'e.g. Al-pair stability in MFI'" />
            </div>
            <div class="pz-row">
              <div class="pz-field">
                <label>{{ $t('phased.startDate') || 'Start date' }}</label>
                <input type="date" v-model="phasedDraft.startDate" />
              </div>
              <div class="pz-field">
                <label>{{ $t('phased.endDate') || 'End date' }}</label>
                <input type="date" v-model="phasedDraft.endDate" />
              </div>
            </div>
            <div class="pz-field">
              <label>{{ $t('phased.projectIconColor') || 'Icon and color' }}</label>
              <div class="pz-icon-row">
                <span
                  v-for="ic in phasedIcons"
                  :key="ic"
                  class="pz-icon-swatch"
                  :class="{ active: phasedDraft.icon === ic }"
                  @click="phasedDraft.icon = ic"
                ><i :class="ic"></i></span>
              </div>
              <div class="pz-color-row">
                <span
                  class="pz-color-swatch pz-color-none"
                  :class="{ active: !phasedDraft.color }"
                  @click="phasedDraft.color = ''"
                ></span>
                <span
                  v-for="c in phasedColors"
                  :key="c"
                  class="pz-color-swatch"
                  :class="{ active: phasedDraft.color === c }"
                  :style="{ background: c }"
                  @click="phasedDraft.color = c"
                ></span>
              </div>
            </div>
            <div v-if="phasedError" class="pz-error">{{ phasedError }}</div>
            <div class="pz-footer">
              <button type="button" class="btn btn-primary btn-sm" @click="createPhasedProject">
                <i class="bi-plus-lg"></i>
                {{ $t('phased.createProject') || 'Create project' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import { Modal } from "bootstrap";
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";
import toDoListRepository from "../repositories/toDoListRepository";
import listTemplates from "../helpers/listTemplates";

export default {
  name: "newListTemplateModal",
  data() {
    return {
      projectType: "checklist",
      phasedDraft: this.blankPhasedDraft(),
      phasedError: "",
      // Mix of Phosphor (ph-*) icons already in phosphorIcons.scss and
      // bootstrap-icons (bi-*) which ships complete. New picks here are safe
      // without having to touch the Phosphor subset file.
      phasedIcons: [
        "ph ph-atom", "ph ph-cpu", "ph ph-hexagon", "ph ph-target",
        "ph ph-stack", "ph ph-chart-bar", "ph ph-microphone-stage", "ph ph-article",
        "bi-droplet-half", "bi-lightning-charge", "bi-globe-americas", "bi-rocket-takeoff",
        "bi-palette", "bi-music-note-beamed", "bi-mortarboard", "bi-briefcase",
        "bi-tree", "bi-camera", "bi-code-slash", "bi-gear-wide-connected",
        "bi-shield-check", "bi-journal-text", "bi-building", "bi-bank",
        "bi-geo-alt-fill", "bi-magnet", "bi-thermometer-half", "bi-trophy",
        "bi-eyedropper", "bi-bezier2", "bi-stars", "bi-fire",
      ],
      phasedColors: [
        "#3f6d9a", "#4b8a7f", "#b8893a", "#a3573b", "#7a5a98", "#5e6ef2",
        "#10b981", "#f97316", "#ed544b", "#06b6d4", "#8b5cf6", "#ed56a1",
        "#f9d54a", "#77e785", "#ba7956", "#374151", "#1e40af", "#dc2626",
        "#0ea5e9", "#84cc16", "#eab308", "#c026d3",
      ],
    };
  },
  computed: {
    templates: function () {
      return listTemplates.all(this.$store.getters.config);
    },
  },
  mounted() {
    let modalEl = document.getElementById("newListTemplateModal");
    if (modalEl) modalEl.addEventListener("show.bs.modal", this.onShow);
  },
  beforeUnmount() {
    let modalEl = document.getElementById("newListTemplateModal");
    if (modalEl) modalEl.removeEventListener("show.bs.modal", this.onShow);
  },
  methods: {
    blankPhasedDraft() {
      return {
        name: "",
        startDate: moment().format("YYYY-MM-DD"),
        endDate: moment().add(90, "days").format("YYYY-MM-DD"),
        icon: "ph ph-atom",
        color: "#4b8a7f",
      };
    },
    onShow() {
      this.projectType = "checklist";
      this.phasedDraft = this.blankPhasedDraft();
      this.phasedError = "";
    },
    resetDraft() {
      this.projectType = "checklist";
      this.phasedDraft = this.blankPhasedDraft();
      this.phasedError = "";
    },
    selectTemplate(tpl) {
      this.createFromTemplate(tpl);
      this.closeModal();
    },
    closeModal() {
      let modalEl = document.getElementById("newListTemplateModal");
      let modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.hide();
    },
    tplLabel(tpl) {
      return listTemplates.labelFor(tpl, (key) => this.$t(key));
    },
    createFromTemplate(tpl) {
      const listId = moment().format("YYYYMMDDTHHmmssS");
      const listName = tpl.isUser ? tpl.name : "";
      const customTodoListId = {
        listId: listId,
        listName: listName,
        archived: false,
        icon: tpl.id === "blank" ? "" : tpl.icon,
        color: tpl.color || "",
        kind: tpl.kind || "",
        type: "checklist",
      };
      this.$store.commit("actionsCListCreatedUpdate", true);
      this.$store.commit("newCustomTodoList", customTodoListId);
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);

      listTemplates.tasksFor(tpl).forEach((text) => {
        this.$store.commit("addTodo", {
          text: text,
          checked: false,
          listId: listId,
          desc: "",
          subTaskList: [],
          color: "none",
          priority: 0,
          tags: [],
          deadline: null,
          time: null,
          alarm: false,
          repeatingEvent: null,
        });
      });
      toDoListRepository.update(listId, this.$store.getters.todoLists[listId]);
    },
    createPhasedProject() {
      let name = (this.phasedDraft.name || "").trim();
      if (!name) {
        this.phasedError = this.$t("phased.errNameRequired") || "A project name is required";
        return;
      }
      if (!this.phasedDraft.startDate || !this.phasedDraft.endDate) {
        this.phasedError = this.$t("phased.errDatesRequired") || "Start and end date are required";
        return;
      }
      if (moment(this.phasedDraft.endDate).isBefore(this.phasedDraft.startDate)) {
        this.phasedError = this.$t("phased.errDateOrder") || "End date cannot be before start date";
        return;
      }
      const listId = moment().format("YYYYMMDDTHHmmssS");
      const customTodoListId = {
        listId: listId,
        listName: name,
        archived: false,
        icon: this.phasedDraft.icon || "ph ph-atom",
        color: this.phasedDraft.color || "",
        kind: "",
        type: "phased",
        startDate: this.phasedDraft.startDate,
        endDate: this.phasedDraft.endDate,
      };
      // Phased projects skip the "editing name on first mount" flow because
      // the name was just typed in; mark the created flag false so
      // listHeader does not jump into edit mode.
      this.$store.commit("actionsCListCreatedUpdate", false);
      this.$store.commit("newCustomTodoList", customTodoListId);
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
      // Seed empty phases and log entries for the project so the loaders
      // find a clean array on first open.
      this.$store.commit("loadPhases", { projectId: listId, phases: [] });
      this.$store.commit("loadLogEntries", { projectId: listId, entries: [] });
      this.closeModal();
      this.resetDraft();
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 460px;
}

.type-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}
.type-switch-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  background: transparent;
  border: 1px solid #d0d5da;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  color: #3c3c3c;

  i {
    font-size: 1.1rem;
    color: var(--accent-color, #5e6ef2);
  }
  span {
    font-weight: 500;
    font-size: 0.95rem;
  }
  small {
    font-size: 0.75rem;
    color: #8a8d90;
    line-height: 1.25;
  }

  .dark-theme & {
    color: #c9d1d9;
    border-color: #30363d;
    small { color: #8b949e; }
  }

  &:hover {
    background: rgba(94, 110, 242, 0.05);
    border-color: rgba(94, 110, 242, 0.4);
  }

  &.active {
    border-color: var(--accent-color, #5e6ef2);
    background: rgba(94, 110, 242, 0.08);
  }
}

.template-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: none;
  background: none;
  padding: 12px 10px;
  text-align: left;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #3c3c3c;

  .dark-theme & { color: #c9d1d9; }

  &:hover { background-color: #eaecef; }

  .dark-theme &:hover { background-color: #21262d; }

  i {
    font-size: 1.15rem;
    width: 22px;
    text-align: center;
    flex-shrink: 0;
  }
}

.template-edit-link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  background: none;
  padding: 10px;
  margin-top: 6px;
  border-top: 1px solid #eaecef;
  text-align: left;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82rem;
  color: grey;

  .dark-theme & {
    color: #8b949e;
    border-top-color: #21262d;
  }

  &:hover { color: var(--accent-color, #5e6ef2); }

  i {
    font-size: 1.1rem;
    width: 22px;
    text-align: center;
  }
}

.phased-path {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pz-field {
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
.pz-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pz-icon-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.pz-icon-swatch {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  background: rgba(140, 140, 140, 0.1);
  color: #5c5c5c;
  i { font-size: 1rem; }
  .dark-theme & { color: #c9d1d9; }
  &:hover { background: rgba(94, 110, 242, 0.12); }
  &.active {
    border-color: var(--accent-color, #5e6ef2);
    color: var(--accent-color, #5e6ef2);
    background: rgba(94, 110, 242, 0.1);
  }
}
.pz-color-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.pz-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 1.5px solid transparent;
  background: #d0d5da;
  &.active { border-color: #212529; .dark-theme & { border-color: #f0f0f0; } }
}
.pz-color-none {
  background: repeating-linear-gradient(45deg, #d0d5da 0 2px, #fff 2px 4px);
  .dark-theme & { background: repeating-linear-gradient(45deg, #30363d 0 2px, #21262d 2px 4px); }
}
.pz-error {
  color: #c84b3b;
  font-size: 0.82rem;
  padding: 6px 10px;
  background: rgba(200, 75, 59, 0.1);
  border-radius: 4px;
}
.pz-footer {
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
}
</style>
