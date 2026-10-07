<template>
  <div class="modal fade" id="batchTrackerModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="ph ph-stack"></i> {{ $t("ui.batchTrackerTitle") || "Batch tracker" }}
            <span v-if="listName" class="bt-list-tag">{{ listName }}</span>
          </h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <p class="bt-hint">{{ $t("ui.batchTrackerHint") || "Track long-running sets of calculations as a single task. Set the total and update how many have finished." }}</p>

          <!-- Existing tracked tasks: a row per task with batch set. -->
          <div v-if="tracked.length" class="bt-tracked">
            <div v-for="row in tracked" :key="row.index" class="bt-row">
              <div class="bt-row-head">
                <span class="bt-row-title" :title="row.task.text">{{ row.task.text }}</span>
                <button type="button" class="bt-clear" @click="clearBatch(row.index)" :title="$t('ui.batchTrackerClear') || 'Remove batch'">
                  <i class="bi-x"></i>
                </button>
              </div>
              <div class="bt-controls">
                <div class="bt-counts">
                  <button type="button" class="bt-step" @click="step(row.index, -10)" title="-10">−10</button>
                  <button type="button" class="bt-step" @click="step(row.index, -1)" title="-1">−1</button>
                  <input
                    type="number"
                    class="bt-done-input"
                    min="0"
                    :max="row.task.batch.total"
                    v-model.number="row.doneInput"
                    @change="setDone(row.index, row.doneInput)"
                  />
                  <span class="bt-slash">/</span>
                  <input
                    type="number"
                    class="bt-total-input"
                    min="1"
                    v-model.number="row.totalInput"
                    @change="setTotal(row.index, row.totalInput)"
                  />
                  <button type="button" class="bt-step" @click="step(row.index, 1)" title="+1">+1</button>
                  <button type="button" class="bt-step" @click="step(row.index, 10)" title="+10">+10</button>
                </div>
                <div class="bt-bar">
                  <span class="bt-bar-fill" :style="{ width: percent(row.task.batch) + '%', backgroundColor: barColor(row.task.batch) }"></span>
                </div>
                <div class="bt-meta">
                  <span class="bt-percent">{{ percent(row.task.batch) }}%</span>
                  <span class="bt-remaining">{{ remaining(row.task.batch) }} {{ $t("ui.batchTrackerRemaining") || "remaining" }}</span>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="bt-empty">{{ $t("ui.batchTrackerEmpty") || "No batch is being tracked in this project yet. Pick a task below and give it a total." }}</p>

          <!-- Pending tasks without a batch: give one a size with a single click. -->
          <div v-if="pending.length" class="bt-add">
            <h6 class="bt-add-title">{{ $t("ui.batchTrackerAdd") || "Start tracking a task" }}</h6>
            <ul class="bt-pending">
              <li v-for="row in pending" :key="row.index" class="bt-pending-row">
                <span class="bt-pending-text" :title="row.task.text">{{ row.task.text }}</span>
                <div class="bt-pending-actions">
                  <input
                    type="number"
                    class="bt-pending-total"
                    min="1"
                    v-model.number="row.newTotal"
                    :placeholder="$t('ui.batchTrackerTotalPh') || 'Total'"
                    @keyup.enter="startTracking(row.index, row.newTotal)"
                  />
                  <button type="button" class="bt-start" @click="startTracking(row.index, row.newTotal)" :disabled="!row.newTotal">
                    <i class="bi-play-fill"></i>
                    {{ $t("ui.batchTrackerStart") || "Track" }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import toDoListRepository from "../repositories/toDoListRepository";

// Batch tracker: lets a single task stand in for a long run of calculations
// (hundreds or thousands of jobs) and keeps a done/total counter on it. The
// task gains a `batch: { total, done }` field; the chip in toDoItem renders
// its progress. One modal per project list, driven by batchTrackerTarget.
export default {
  name: "batchTrackerModal",
  props: {
    targetListId: { required: false, type: String, default: null },
  },
  data() {
    return {
      // Mirrors of the two input fields, keyed by task index. The number
      // inputs are v-modelled on these so the user can type without each
      // keystroke committing to the store; the actual commit lands on
      // change / enter / step buttons.
      inputs: {},
    };
  },
  computed: {
    list: function () {
      if (!this.targetListId) return [];
      return this.$store.getters.todoLists[this.targetListId] || [];
    },
    listName: function () {
      if (!this.targetListId) return "";
      let hit = (this.$store.getters.cTodoListIds || []).find((l) => l.listId === this.targetListId);
      return hit ? hit.listName : "";
    },
    tracked: function () {
      let out = [];
      this.list.forEach((task, index) => {
        if (!task || task.checked) return;
        if (task.batch && typeof task.batch.total === "number" && task.batch.total > 0) {
          let key = String(index);
          if (!this.inputs[key]) this.inputs[key] = { doneInput: task.batch.done || 0, totalInput: task.batch.total };
          out.push({
            index: index,
            task: task,
            doneInput: this.inputs[key].doneInput,
            totalInput: this.inputs[key].totalInput,
          });
        }
      });
      return out;
    },
    pending: function () {
      let out = [];
      this.list.forEach((task, index) => {
        if (!task || task.checked) return;
        if (task.batch && task.batch.total) return;
        let key = "n" + index;
        if (!this.inputs[key]) this.inputs[key] = { newTotal: null };
        out.push({ index: index, task: task, newTotal: this.inputs[key].newTotal });
      });
      return out;
    },
  },
  mounted() {
    let modalEl = document.getElementById("batchTrackerModal");
    if (modalEl) {
      modalEl.addEventListener("hidden.bs.modal", () => {
        this.inputs = {};
      });
    }
  },
  methods: {
    percent: function (batch) {
      if (!batch || !batch.total) return 0;
      return Math.min(100, Math.round(((batch.done || 0) / batch.total) * 100));
    },
    remaining: function (batch) {
      if (!batch || !batch.total) return 0;
      return Math.max(0, batch.total - (batch.done || 0));
    },
    barColor: function (batch) {
      let p = this.percent(batch);
      if (p >= 100) return "#10b981";
      if (p >= 66) return "var(--accent-color, #5e6ef2)";
      if (p >= 33) return "#f59e0b";
      return "#9ca3af";
    },
    commit: function (index, patch) {
      let task = this.list[index];
      if (!task) return;
      let next = Object.assign({}, task.batch || { total: 0, done: 0 }, patch);
      next.total = Math.max(0, Math.floor(next.total || 0));
      next.done = Math.max(0, Math.min(next.total, Math.floor(next.done || 0)));
      task.batch = next;
      let key = String(index);
      this.inputs[key] = { doneInput: next.done, totalInput: next.total };
      toDoListRepository.update(this.targetListId, this.list);
    },
    setDone: function (index, value) {
      this.commit(index, { done: value });
    },
    setTotal: function (index, value) {
      this.commit(index, { total: value });
    },
    step: function (index, delta) {
      let task = this.list[index];
      if (!task || !task.batch) return;
      this.commit(index, { done: (task.batch.done || 0) + delta });
    },
    startTracking: function (index, total) {
      if (!total || total <= 0) return;
      this.commit(index, { total: total, done: 0 });
    },
    clearBatch: function (index) {
      let task = this.list[index];
      if (!task) return;
      delete task.batch;
      toDoListRepository.update(this.targetListId, this.list);
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 680px;
}

.bt-list-tag {
  font-size: 0.78rem;
  font-weight: 500;
  color: grey;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: rgba(94, 110, 242, 0.1);

  .dark-theme & {
    color: #c8cfe8;
    background-color: rgba(94, 110, 242, 0.18);
  }
}

.bt-hint {
  font-size: 0.82rem;
  color: grey;
  margin-bottom: 14px;

  .dark-theme & {
    color: #8b94b8;
  }
}

.bt-tracked {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bt-row {
  padding: 10px 12px;
  border-radius: 10px;
  background-color: rgba(94, 110, 242, 0.06);
  border-left: 3px solid var(--accent-color, #5e6ef2);

  .dark-theme & {
    background-color: rgba(94, 110, 242, 0.1);
  }
}

.bt-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.bt-row-title {
  font-weight: 600;
  font-size: 0.92rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  color: #1a1a1a;

  .dark-theme & {
    color: #e8ecf8;
  }
}

.bt-clear {
  background: none;
  border: none;
  color: grey;
  font-size: 1rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;

  &:hover {
    background-color: rgba(237, 84, 75, 0.14);
    color: #ed544b;
  }
}

.bt-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bt-counts {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.bt-step {
  background-color: rgba(0, 0, 0, 0.05);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  color: #333;
  font-variant-numeric: tabular-nums;

  &:hover {
    background-color: rgba(94, 110, 242, 0.14);
    color: var(--accent-color, #5e6ef2);
  }

  .dark-theme & {
    background-color: rgba(255, 255, 255, 0.06);
    color: #d7dcee;

    &:hover {
      background-color: rgba(94, 110, 242, 0.22);
      color: #eef1ff;
    }
  }
}

.bt-done-input,
.bt-total-input {
  width: 68px;
  padding: 2px 6px;
  border: 1px solid #d0d7de;
  border-radius: 5px;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  text-align: center;

  .dark-theme & {
    background-color: #13171d;
    border-color: #30363d;
    color: #c9d1d9;
  }
}

.bt-slash {
  opacity: 0.6;
  font-weight: 600;
}

.bt-bar {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background-color: rgba(0, 0, 0, 0.08);
  overflow: hidden;

  .dark-theme & {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.bt-bar-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s ease;
}

.bt-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.76rem;
  color: grey;
  font-variant-numeric: tabular-nums;

  .dark-theme & {
    color: #8b94b8;
  }
}

.bt-percent {
  font-weight: 600;
}

.bt-empty {
  font-size: 0.85rem;
  color: grey;
  text-align: center;
  padding: 16px 0;

  .dark-theme & {
    color: #8b94b8;
  }
}

.bt-add {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);

  .dark-theme & {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
}

.bt-add-title {
  font-size: 0.82rem;
  color: grey;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;

  .dark-theme & {
    color: #8b94b8;
  }
}

.bt-pending {
  list-style: none;
  padding: 0;
  margin: 0;
}

.bt-pending-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);

  &:last-child {
    border-bottom: none;
  }

  .dark-theme & {
    border-bottom-color: rgba(255, 255, 255, 0.04);
  }
}

.bt-pending-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88rem;
  color: #333;

  .dark-theme & {
    color: #d7dcee;
  }
}

.bt-pending-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.bt-pending-total {
  width: 90px;
  padding: 2px 6px;
  border: 1px solid #d0d7de;
  border-radius: 5px;
  font-size: 0.82rem;
  text-align: center;
  font-variant-numeric: tabular-nums;

  .dark-theme & {
    background-color: #13171d;
    border-color: #30363d;
    color: #c9d1d9;
  }
}

.bt-start {
  background-color: var(--accent-color, #5e6ef2);
  color: white;
  border: none;
  border-radius: 5px;
  padding: 3px 10px;
  font-size: 0.82rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
