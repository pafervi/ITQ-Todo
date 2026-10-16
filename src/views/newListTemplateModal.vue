<template>
  <div class="modal fade" id="newListTemplateModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ $t("ui.newCustomList") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div>
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
  computed: {
    templates: function () {
      return listTemplates.all(this.$store.getters.config);
    },
  },
  methods: {
    selectTemplate: function (tpl) {
      this.createFromTemplate(tpl);
      this.closeModal();
    },
    closeModal: function () {
      let modalEl = document.getElementById("newListTemplateModal");
      let modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.hide();
    },
    tplLabel: function (tpl) {
      return listTemplates.labelFor(tpl, (key) => this.$t(key));
    },
    createFromTemplate: function (tpl) {
      const listId = moment().format("YYYYMMDDTHHmmssS");
      // User templates start the project already named after the template.
      const listName = tpl.isUser ? tpl.name : "";
      const customTodoListId = {
        listId: listId,
        listName: listName,
        archived: false,
        icon: tpl.id === "blank" ? "" : tpl.icon,
        color: tpl.color || "",
        kind: tpl.kind || "",
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
</style>
