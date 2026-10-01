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
                <span>{{ $t(tpl.labelKey) }}</span>
                <i v-if="isCustomized(tpl.id)" class="ph ph-pencil-simple et-custom-dot" :title="$t('ui.templateCustomized')"></i>
              </button>
            </div>

            <div class="et-editor" v-if="selectedTpl">
              <div class="et-lines">
                <div class="et-line" v-for="(line, i) in lines" :key="i">
                  <input
                    type="text"
                    class="form-control et-line-input"
                    v-model="lines[i]"
                    :placeholder="$t('ui.editTemplatesLinePlaceholder')"
                    @keyup.enter="addLineAfter(i)"
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
                <button
                  type="button"
                  class="et-reset"
                  v-if="isCustomized(selectedId)"
                  @click="resetToDefault"
                >
                  <i class="ph ph-arrows-clockwise"></i> {{ $t("ui.editTemplatesReset") }}
                </button>
                <span class="et-saved" v-if="justSaved">{{ $t("ui.editTemplatesSaved") }}</span>
                <button type="button" class="et-save" @click="save">{{ $t("ui.save") }}</button>
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
      editableTemplates: listTemplates.editableTemplates(),
      selectedId: null,
      lines: [],
      justSaved: false,
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
      let tpl = this.editableTemplates.find((t) => t.id === id);
      this.lines = tpl ? listTemplates.tasksFor(tpl, this.$store.getters.config) : [];
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
    save: function () {
      let cleaned = this.lines.map((l) => l.trim()).filter((l) => l.length);
      // Copy the whole map so the assignment is a fresh object (reactivity),
      // then persist through the same config channel as every other setting.
      let current = this.$store.getters.config.customTemplates || {};
      let next = Object.assign({}, current);
      next[this.selectedId] = { tasks: cleaned };
      this.$store.commit("updateConfig", { val: next, key: "customTemplates" });
      configRepository.update(this.$store.getters.config);
      this.lines = cleaned.slice();
      this.flashSaved();
    },
    resetToDefault: function () {
      let current = this.$store.getters.config.customTemplates || {};
      let next = Object.assign({}, current);
      delete next[this.selectedId];
      this.$store.commit("updateConfig", { val: next, key: "customTemplates" });
      configRepository.update(this.$store.getters.config);
      this.pickTemplate(this.selectedId);
    },
    flashSaved: function () {
      this.justSaved = true;
      clearTimeout(this._savedTimeout);
      this._savedTimeout = setTimeout(() => {
        this.justSaved = false;
      }, 1600);
    },
    isCustomized: function (id) {
      return listTemplates.isCustomized(id, this.$store.getters.config);
    },
  },
  computed: {
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

.et-custom-dot {
  margin-left: auto;
  font-size: 0.8rem;
  opacity: 0.7;
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
