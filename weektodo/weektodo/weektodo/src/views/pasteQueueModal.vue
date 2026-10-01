<template>
  <div class="modal fade" id="pasteQueueModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ $t("ui.pasteQueueTitle") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <p class="paste-queue-hint">{{ $t("ui.pasteQueueHint") }}</p>
          <textarea
            v-model="rawText"
            class="paste-queue-textarea"
            rows="9"
            :placeholder="$t('ui.pasteQueuePlaceholder')"
          ></textarea>
          <div class="d-flex justify-content-end mt-3">
            <button type="button" class="btn py-1 px-3 border" data-bs-dismiss="modal" @click="applyQueue">
              <i class="bi-check2"></i> {{ $t("ui.pasteQueueApply") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import slurmParser from "../helpers/slurmParser";
import toDoListRepository from "../repositories/toDoListRepository";

export default {
  name: "pasteQueueModal",
  props: {
    targetListId: { required: false, type: String, default: null },
  },
  data() {
    return {
      rawText: "",
    };
  },
  methods: {
    applyQueue: function () {
      let listId = this.targetListId;
      let text = this.rawText;
      this.rawText = "";
      if (!listId || !text) return;

      let jobs = slurmParser.parse(text);
      if (!jobs.length) return;

      this.$store.dispatch("loadTodoLists", listId).then(() => {
        let list = this.$store.getters.todoLists[listId] || [];
        jobs.forEach((job) => {
          let existing = list.find((t) => t.text.indexOf(job.jobId) !== -1);
          if (existing) {
            if (job.calcStatus) existing.calcStatus = job.calcStatus;
          } else {
            this.$store.commit("addTodo", {
              text: job.name ? `${job.name} (${job.jobId})` : `Job ${job.jobId}`,
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
              calcStatus: job.calcStatus,
            });
          }
        });
        toDoListRepository.update(listId, this.$store.getters.todoLists[listId]);
      });
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 480px;
}

.paste-queue-hint {
  font-size: 0.8rem;
  color: grey;
  margin-bottom: 10px;

  .dark-theme & {
    color: #8b949e;
  }
}

.paste-queue-textarea {
  width: 100%;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.78rem;
  border: 1px solid #eaecef;
  border-radius: 6px;
  padding: 8px 10px;
  resize: vertical;

  .dark-theme & {
    background-color: #13171d;
    border-color: #30363d;
    color: #c9d1d9;
  }
}
</style>
