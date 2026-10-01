<template>
  <div class="modal fade" id="newListTemplateModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ $t("ui.newCustomList") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div v-if="!pendingTemplate">
            <button
              v-for="tpl in templates"
              :key="tpl.id"
              type="button"
              class="template-option"
              @click="selectTemplate(tpl)"
            >
              <i :class="tpl.icon"></i>
              <span>{{ $t(tpl.labelKey) }}</span>
              <i v-if="isCustomized(tpl.id)" class="ph ph-pencil-simple customized-mark" :title="$t('ui.templateCustomized')"></i>
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
          <div v-else-if="pendingTemplate.promptForName" class="prompt-name-form">
            <label class="form-label">{{ $t("ui.meetingWithWhom") }}</label>
            <input
              type="text"
              class="form-control"
              v-model="personName"
              :placeholder="$t('ui.meetingNamePlaceholder')"
              ref="personNameInput"
              @keyup.enter="confirmPrompt"
              @keyup.esc="pendingTemplate = null"
            />
            <div class="d-flex justify-content-end mt-3">
              <button type="button" class="btn py-1 px-3 border me-2" @click="pendingTemplate = null">
                {{ $t("ui.cancel") }}
              </button>
              <button type="button" class="btn py-1 px-3 border" @click="confirmPrompt">
                {{ $t("ui.ok") }}
              </button>
            </div>
          </div>
          <div v-else-if="pendingTemplate.promptForDate" class="prompt-date-form">
            <label class="form-label">{{ $t("ui.talkTitleLabel") }}</label>
            <input
              type="text"
              class="form-control mb-2"
              v-model="talkTitle"
              :placeholder="$t('ui.talkTitlePlaceholder')"
              ref="talkTitleInput"
              @keyup.esc="pendingTemplate = null"
            />
            <label class="form-label">{{ $t("ui.talkDateLabel") }}</label>
            <input
              type="date"
              class="form-control"
              v-model="talkDate"
              @keyup.enter="confirmPrompt"
              @keyup.esc="pendingTemplate = null"
            />
            <div class="d-flex justify-content-end mt-3">
              <button type="button" class="btn py-1 px-3 border me-2" @click="pendingTemplate = null">
                {{ $t("ui.cancel") }}
              </button>
              <button type="button" class="btn py-1 px-3 border" :disabled="!talkDate" @click="confirmPrompt">
                {{ $t("ui.ok") }}
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
import configRepository from "../repositories/configRepository";

export default {
  name: "newListTemplateModal",
  data() {
    return {
      templates: listTemplates.templates,
      pendingTemplate: null,
      personName: "",
      talkTitle: "",
      talkDate: "",
    };
  },
  mounted() {
    document.getElementById("newListTemplateModal").addEventListener("hidden.bs.modal", this.resetPrompt);
  },
  methods: {
    resetPrompt: function () {
      this.pendingTemplate = null;
      this.personName = "";
      this.talkTitle = "";
      this.talkDate = "";
    },
    selectTemplate: function (tpl) {
      if (tpl.promptForName) {
        this.pendingTemplate = tpl;
        this.personName = "";
        this.$nextTick(function () {
          if (this.$refs.personNameInput) this.$refs.personNameInput.focus();
        });
      } else if (tpl.promptForDate) {
        this.pendingTemplate = tpl;
        this.talkTitle = "";
        this.talkDate = "";
        this.$nextTick(function () {
          if (this.$refs.talkTitleInput) this.$refs.talkTitleInput.focus();
        });
      } else {
        this.createFromTemplate(tpl);
        this.closeModal();
      }
    },
    confirmPrompt: function () {
      if (!this.pendingTemplate) return;
      if (this.pendingTemplate.promptForDate) {
        if (!this.talkDate) return;
        this.createFromTemplate(this.pendingTemplate, { talkTitle: this.talkTitle.trim(), talkDate: this.talkDate });
      } else {
        this.createFromTemplate(this.pendingTemplate, this.personName.trim());
      }
      this.closeModal();
    },
    closeModal: function () {
      let modalEl = document.getElementById("newListTemplateModal");
      let modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.hide();
    },
    isCustomized: function (tplId) {
      return listTemplates.isCustomized(tplId, this.$store.getters.config);
    },
    createFromTemplate: function (tpl, opts) {
      const listId = moment().format("YYYYMMDDTHHmmssS");
      let listName = "";
      if (tpl.promptForName) {
        listName = this.$t("ui.meetingPrefix") + (opts || "");
      } else if (tpl.promptForDate) {
        listName = (opts && opts.talkTitle) || this.$t(tpl.labelKey);
      }
      const customTodoListId = {
        listId: listId,
        listName: listName,
        archived: false,
        icon: tpl.id === "blank" ? "" : tpl.icon,
        color: tpl.color || "",
        kind: tpl.kind || "",
      };
      if (tpl.promptForDate && opts && opts.talkDate) {
        customTodoListId.talkDate = opts.talkDate;
      }
      this.$store.commit("actionsCListCreatedUpdate", !tpl.promptForName && !tpl.promptForDate);
      this.$store.commit("newCustomTodoList", customTodoListId);
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);

      listTemplates.tasksFor(tpl, this.$store.getters.config).forEach((text) => {
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
          calcStatus: null,
        });
      });
      toDoListRepository.update(listId, this.$store.getters.todoLists[listId]);

      // Drives the sidebar countdown badge: the most recently created talk
      // is treated as "the next talk" (single countdown, matching the
      // feature as asked for - not a list of every upcoming conference).
      if (tpl.promptForDate && opts && opts.talkDate) {
        this.$store.commit("updateConfig", { val: listName, key: "nextTalkTitle" });
        this.$store.commit("updateConfig", { val: opts.talkDate, key: "nextTalkDate" });
        configRepository.update(this.$store.getters.config);
      }
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 380px;
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

  .dark-theme & {
    color: #c9d1d9;
  }

  &:hover {
    background-color: #eaecef;
  }

  .dark-theme &:hover {
    background-color: #21262d;
  }

  i {
    font-size: 1.15rem;
    width: 22px;
    text-align: center;
    flex-shrink: 0;
  }
}

.customized-mark {
  margin-left: auto;
  font-size: 0.85rem !important;
  width: auto !important;
  color: var(--accent-color, #5e6ef2);
  opacity: 0.75;
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

  &:hover {
    color: var(--accent-color, #5e6ef2);
  }

  i {
    font-size: 1.1rem;
    width: 22px;
    text-align: center;
  }
}

.prompt-name-form,
.prompt-date-form {
  padding: 4px 2px;
}
</style>
