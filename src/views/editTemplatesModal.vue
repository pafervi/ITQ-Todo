<template>
  <div class="modal fade" id="editTemplatesModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="ph ph-sliders-horizontal"></i> {{ $t("ui.editTemplatesTitle") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <p class="et-hint">{{ $t("ui.editTemplatesHint") }}</p>

          <div class="et-layout">
            <div class="et-picker">
              <button
                v-for="tpl in editableTemplates"
                :key="tpl.id"
                type="button"
                class="et-picker-item"
                :class="{ active: tpl.id === selectedId }"
                @click="pickTemplate(tpl.id)"
              >
                <i :class="tpl.icon"></i>
                <span>{{ tplLabel(tpl) }}</span>
              </button>
              <button type="button" class="et-picker-new" @click="newTemplate">
                <i class="ph ph-plus"></i>
                <span>{{ $t("ui.templateNew") }}</span>
              </button>
            </div>

            <div class="et-editor et-editor-empty" v-if="!selectedTpl">
              <p class="et-empty">{{ $t("ui.templatesEmpty") }}</p>
            </div>
            <div class="et-editor" v-else>
              <div class="et-identity">
                <input
                  type="text"
                  class="form-control et-name-input"
                  v-model="draftName"
                  :placeholder="$t('ui.templateNamePlaceholder')"
                  maxlength="60"
                />
                <div class="et-icons">
                  <button
                    v-for="ic in iconChoices"
                    :key="ic"
                    type="button"
                    class="et-icon-btn"
                    :class="{ active: ic === draftIcon }"
                    @click="draftIcon = ic"
                  >
                    <i :class="ic"></i>
                  </button>
                </div>
                <div class="et-colors">
                  <button
                    v-for="c in colorChoices"
                    :key="c || 'none'"
                    type="button"
                    class="et-color-dot"
                    :class="{ active: c === draftColor, 'et-color-none': !c }"
                    :style="c ? { backgroundColor: c } : null"
                    @click="draftColor = c"
                  ></button>
                </div>
              </div>
              <div class="et-lines">
                <div
                  class="et-line"
                  :class="{ 'et-line-dragging': dragIndex === i, 'et-line-over': overIndex === i && dragIndex !== i }"
                  v-for="(line, i) in lines"
                  :key="i"
                  @dragover.prevent="onLineDragOver(i)"
                  @drop.prevent="onLineDrop(i)"
                >
                  <span
                    class="et-line-handle"
                    draggable="true"
                    :title="$t('ui.dragToReorder')"
                    @dragstart="onLineDragStart(i, $event)"
                    @dragend="onLineDragEnd"
                  >
                    <i class="bi-grip-vertical"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control et-line-input"
                    v-model="lines[i]"
                    :placeholder="$t('ui.editTemplatesLinePlaceholder')"
                    @keyup.enter="addLineAfter(i)"
                    @keydown.alt.up.prevent="moveLine(i, -1)"
                    @keydown.alt.down.prevent="moveLine(i, 1)"
                  />
                  <button type="button" class="et-line-remove" :title="$t('ui.remove')" @click="removeLine(i)">
                    <i class="ph ph-x-circle"></i>
                  </button>
                </div>
                <p class="et-empty" v-if="!lines.length">{{ $t("ui.editTemplatesEmpty") }}</p>
              </div>

              <button type="button" class="et-add" @click="addLine">
                <i class="ph ph-plus"></i> {{ $t("ui.editTemplatesAddLine") }}
              </button>

              <div class="et-actions">
                <button type="button" class="et-reset et-delete" @click="deleteTemplate">
                  <i class="ph ph-x-circle"></i> {{ confirmDelete ? $t("ui.templateDeleteConfirm") : $t("ui.templateDelete") }}
                </button>
                <span class="et-saved" v-if="justSaved">{{ $t("ui.editTemplatesSaved") }}</span>
                <button type="button" class="et-save" :disabled="!draftName.trim()" @click="save">{{ $t("ui.save") }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import listTemplates from "../helpers/listTemplates";
import configRepository from "../repositories/configRepository";

export default {
  name: "editTemplatesModal",
  data() {
    return {
      selectedId: null,
      lines: [],
      justSaved: false,
      savedTimeout: null,
      iconChoices: listTemplates.iconChoices,
      colorChoices: listTemplates.colorChoices,
      draftName: "",
      draftIcon: "",
      draftColor: "",
      confirmDelete: false,
      dragIndex: null,
      overIndex: null,
    };
  },
  mounted() {
    let modalEl = document.getElementById("editTemplatesModal");
    if (modalEl) modalEl.addEventListener("shown.bs.modal", this.onShown);
  },
  methods: {
    onShown: function () {
      // Default to the first editable template (or keep the last picked one).
      if (!this.selectedId && this.editableTemplates.length) {
        this.pickTemplate(this.editableTemplates[0].id);
      } else if (this.selectedId) {
        this.pickTemplate(this.selectedId);
      }
    },
    pickTemplate: function (id) {
      this.selectedId = id;
      this.justSaved = false;
      this.confirmDelete = false;
      let tpl = this.editableTemplates.find((t) => t.id === id);
      this.lines = tpl ? listTemplates.tasksFor(tpl) : [];
      if (tpl) {
        this.draftName = tpl.name;
        this.draftIcon = tpl.icon;
        this.draftColor = tpl.color || "";
      }
    },
    tplLabel: function (tpl) {
      return listTemplates.labelFor(tpl, (key) => this.$t(key));
    },
    persistUserTemplates: function (list) {
      this.$store.commit("updateConfig", { val: list, key: "userTemplates" });
      configRepository.update(this.$store.getters.config);
    },
    newTemplate: function () {
      let created = {
        id: listTemplates.newUserId(),
        name: this.$t("ui.templateNewName"),
        icon: listTemplates.iconChoices[0],
        color: "",
        tasks: [],
      };
      let current = this.$store.getters.config.userTemplates || [];
      this.persistUserTemplates(current.concat([created]));
      this.pickTemplate(created.id);
      this.$nextTick(() => {
        let input = this.$el.querySelector(".et-name-input");
        if (input) {
          input.focus();
          input.select();
        }
      });
    },
    deleteTemplate: function () {
      if (!this.confirmDelete) {
        this.confirmDelete = true;
        return;
      }
      let current = this.$store.getters.config.userTemplates || [];
      this.persistUserTemplates(current.filter((u) => u.id !== this.selectedId));
      this.selectedId = null;
      this.confirmDelete = false;
      if (this.editableTemplates.length) this.pickTemplate(this.editableTemplates[0].id);
    },
    addLine: function () {
      this.lines.push("");
      this.$nextTick(this.focusLastLine);
    },
    addLineAfter: function (i) {
      this.lines.splice(i + 1, 0, "");
      this.$nextTick(this.focusLastLine);
    },
    focusLastLine: function () {
      let inputs = this.$el.querySelectorAll(".et-line-input");
      if (inputs.length) inputs[inputs.length - 1].focus();
    },
    removeLine: function (i) {
      this.lines.splice(i, 1);
    },
    // Moves a line to another position; keeps the focus on the moved input.
    reorderLine: function (from, to) {
      if (from === to || from < 0 || to < 0 || from >= this.lines.length || to >= this.lines.length) return false;
      let moved = this.lines.splice(from, 1)[0];
      this.lines.splice(to, 0, moved);
      return true;
    },
    moveLine: function (i, delta) {
      if (!this.reorderLine(i, i + delta)) return;
      this.$nextTick(() => {
        let inputs = this.$el.querySelectorAll(".et-line-input");
        if (inputs[i + delta]) inputs[i + delta].focus();
      });
    },
    onLineDragStart: function (i, event) {
      this.dragIndex = i;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(i));
        let row = event.target.closest(".et-line");
        if (row && event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(row, 12, 14);
      }
    },
    onLineDragOver: function (i) {
      if (this.dragIndex === null) return;
      this.overIndex = i;
    },
    onLineDrop: function (i) {
      if (this.dragIndex !== null) this.reorderLine(this.dragIndex, i);
      this.onLineDragEnd();
    },
    onLineDragEnd: function () {
      this.dragIndex = null;
      this.overIndex = null;
    },
    save: function () {
      let cleaned = this.lines.map((l) => l.trim()).filter((l) => l.length);
      let name = this.draftName.trim();
      if (!this.selectedTpl || !name) return;
      let current = this.$store.getters.config.userTemplates || [];
      this.persistUserTemplates(
        current.map((u) =>
          u.id === this.selectedId ? { id: u.id, name: name, icon: this.draftIcon, color: this.draftColor, tasks: cleaned } : u
        )
      );
      this.lines = cleaned.slice();
      this.flashSaved();
    },
    flashSaved: function () {
      this.justSaved = true;
      clearTimeout(this.savedTimeout);
      this.savedTimeout = setTimeout(() => {
        this.justSaved = false;
      }, 1600);
    },
  },
  computed: {
    editableTemplates: function () {
      return listTemplates.editableTemplates(this.$store.getters.config);
    },
    selectedTpl: function () {
      return this.editableTemplates.find((t) => t.id === this.selectedId) || null;
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 640px;
}

.modal.fade .modal-dialog {
  transition: transform 0.28s cubic-bezier(0.2, 1, 0.1, 1), opacity 0.22s ease-out;
  transform: scale(0.96);
  opacity: 0;
}

.modal.show .modal-dialog {
  transform: scale(1);
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .modal.fade .modal-dialog {
    transition: none;
    transform: none;
    opacity: 1;
  }
}

.et-hint {
  font-size: 0.82rem;
  color: grey;
  margin-bottom: 14px;

  .dark-theme & {
    color: #8b949e;
  }
}

.et-layout {
  display: flex;
  gap: 16px;
}

.et-picker {
  flex: 0 0 180px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-right: 1px solid #eaecef;
  padding-right: 10px;

  .dark-theme & {
    border-right-color: #21262d;
  }
}

.et-picker-item {
  display: flex;
  align-items: center;
  gap: 9px;
  border: none;
  background: none;
  padding: 8px 9px;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
  font-size: 0.85rem;
  color: #3c3c3c;

  .dark-theme & {
    color: #c9d1d9;
  }

  &:hover {
    background-color: #eaecef;

    .dark-theme & {
      background-color: #21262d;
    }
  }

  &.active {
    background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 15%, transparent);
    color: var(--accent-color, #5e6ef2);
    font-weight: 600;
  }

  > i:first-child {
    font-size: 1.05rem;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }
}

.et-editor {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.et-lines {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.et-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.et-line-over {
  box-shadow: 0 -2px 0 0 var(--accent-color, #5e6ef2);
}

.et-line-dragging {
  opacity: 0.45;
}

.et-line-handle {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  cursor: grab;
  color: grey;
  font-size: 1.1rem;
  padding: 4px 0;
  user-select: none;

  &:hover {
    color: var(--accent-color, #5e6ef2);
  }

  &:active {
    cursor: grabbing;
  }
}

.et-editor-empty {
  justify-content: center;
}

.et-line-input {
  flex: 1 1 auto;
  font-size: 0.88rem;
  padding: 6px 10px;
}

.et-line-remove {
  border: none;
  background: none;
  color: grey;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  flex-shrink: 0;

  &:hover {
    color: #ed544b;
  }
}

.et-empty {
  font-size: 0.82rem;
  color: grey;
  padding: 6px 0;

  .dark-theme & {
    color: #8b949e;
  }
}

.et-add {
  align-self: flex-start;
  margin-top: 10px;
  border: 1px dashed #c9ccd1;
  background: none;
  border-radius: 7px;
  padding: 6px 12px;
  font-size: 0.82rem;
  color: grey;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  .dark-theme & {
    border-color: #30363d;
    color: #8b949e;
  }

  &:hover {
    color: var(--accent-color, #5e6ef2);
    border-color: var(--accent-color, #5e6ef2);
  }
}

.et-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #eaecef;

  .dark-theme & {
    border-top-color: #21262d;
  }
}

.et-reset {
  border: none;
  background: none;
  color: grey;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 5px;

  .dark-theme & {
    color: #8b949e;
  }

  &:hover {
    color: var(--accent-color, #5e6ef2);
  }
}

.et-saved {
  font-size: 0.8rem;
  color: #2dbd6e;
}

.et-save {
  margin-left: auto;
  border: none;
  background-color: var(--accent-color, #5e6ef2);
  color: #fff;
  border-radius: 7px;
  padding: 7px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    filter: brightness(1.06);
  }
}

.et-picker-new {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px dashed #c9ccd1;
  background: none;
  padding: 7px 9px;
  margin-top: 6px;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
  font-size: 0.82rem;
  color: grey;

  .dark-theme & {
    border-color: #30363d;
    color: #8b949e;
  }

  &:hover {
    color: var(--accent-color, #5e6ef2);
    border-color: var(--accent-color, #5e6ef2);
  }

  > i {
    width: 20px;
    text-align: center;
  }
}

.et-identity {
  margin-bottom: 14px;
}

.et-name-input {
  font-size: 0.95rem;
  font-weight: 600;
  padding: 6px 10px;
  margin-bottom: 10px;
}

.et-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
}

.et-icon-btn {
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  background: none;
  border-radius: 7px;
  cursor: pointer;
  color: #3c3c3c;
  font-size: 1.05rem;

  .dark-theme & {
    color: #c9d1d9;
  }

  &:hover {
    background-color: #eaecef;

    .dark-theme & {
      background-color: #21262d;
    }
  }

  &.active {
    border-color: var(--accent-color, #5e6ef2);
    color: var(--accent-color, #5e6ef2);
  }
}

.et-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.et-color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;

  &.active {
    border-color: #3c3c3c;
    box-shadow: 0 0 0 2px #fff inset;

    .dark-theme & {
      border-color: #fff;
      box-shadow: 0 0 0 2px #0d1117 inset;
    }
  }

  &.et-color-none {
    background: repeating-linear-gradient(45deg, #d0d7de, #d0d7de 3px, transparent 3px, transparent 6px);
  }
}

.et-delete:hover {
  color: #ed544b;
}

.et-save:disabled {
  opacity: 0.45;
  cursor: default;
}

@media (max-width: 600px) {
  .et-layout {
    flex-direction: column;
  }

  .et-picker {
    flex: 1 1 auto;
    flex-direction: row;
    flex-wrap: wrap;
    border-right: none;
    border-bottom: 1px solid #eaecef;
    padding-right: 0;
    padding-bottom: 10px;

    .dark-theme & {
      border-bottom-color: #21262d;
    }
  }
}
</style>
