<template>
  <div class="modal fade" id="ReorderCustomListsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="ph ph-arrows-down-up me-2"></i>
            {{ $t('ui.reorderCustomLists') || 'Reorder projects' }}
          </h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <p class="reorder-hint">
            {{ $t('ui.reorderCustomListsHint') || 'Drag a row by its handle, or use the arrows. Changes save as you go.' }}
          </p>
          <ul class="reorder-list" @dragover.prevent>
            <li
              v-for="(list, index) in draftOrder"
              :key="list.listId"
              class="reorder-item"
              :class="{ 'drag-over': dragOverIndex === index, 'dragging': dragFromIndex === index }"
              draggable="true"
              @dragstart="onDragStart($event, index)"
              @dragend="onDragEnd"
              @dragenter.prevent="onDragEnter(index)"
              @dragover.prevent="onDragOver($event, index)"
              @dragleave="onDragLeave($event, index)"
              @drop.prevent="onDrop(index)"
            >
              <i class="ph ph-list reorder-grip" :title="$t('ui.dragToReorder') || 'Drag to reorder'"></i>
              <span class="reorder-color-dot" :style="{ background: colorFor(list) }"></span>
              <span class="reorder-icon">
                <i v-if="list.icon" :class="list.icon"></i>
                <i v-else class="ph ph-folder-simple"></i>
              </span>
              <span class="reorder-name">{{ list.listName }}</span>
              <span v-if="list.phased" class="reorder-tag" :title="$t('ui.phasedProject') || 'Phased project'">
                <i class="ph ph-stack"></i>
              </span>
              <span v-if="list.archived" class="reorder-tag reorder-tag-archived" :title="$t('ui.archived') || 'Archived'">
                <i class="ph ph-archive"></i>
              </span>
              <div class="reorder-arrows">
                <button type="button" class="reorder-arrow-btn" :disabled="index === 0"
                  @click="moveUp(index)" :title="$t('ui.moveUp') || 'Move up'">
                  <i class="ph ph-caret-up"></i>
                </button>
                <button type="button" class="reorder-arrow-btn" :disabled="index === draftOrder.length - 1"
                  @click="moveDown(index)" :title="$t('ui.moveDown') || 'Move down'">
                  <i class="ph ph-caret-down"></i>
                </button>
              </div>
            </li>
          </ul>
          <div v-if="draftOrder.length === 0" class="reorder-empty">
            {{ $t('ui.noCustomLists') || 'No projects to reorder yet.' }}
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="resetOrder"
            :disabled="!dirty">
            <i class="ph ph-arrow-counter-clockwise me-1"></i>
            {{ $t('ui.reset') || 'Reset' }}
          </button>
          <button type="button" class="btn btn-primary btn-sm" data-bs-dismiss="modal">
            {{ $t('ui.done') || 'Done' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";

// Reorder modal. Rewritten from the previous drag-only version that
// mutated the store's getter array in place (which did not trigger Vue
// reactivity and left the board stale until a reload). This version:
//  - Uses the reorderCustomTodoLists mutation (replaces the array with a
//    slice so every v-for that reads cTodoListIds re-renders).
//  - Keeps drag-and-drop INSIDE the modal (simple geometry, less flaky
//    than dragging full project cards around the board).
//  - Adds explicit up/down arrow buttons so reorder never depends on
//    HTML5 drag API alone. If drag misfires, arrows always work.
//  - Shows color dot, icon and phased/archived tags so each row reads
//    like a mini project card instead of a bare name.
//  - Persists after every change (hitting the repo so a reload keeps
//    the order), and provides a Reset button for undo-in-session.

export default {
  name: "ReorderCustomListsModal",
  data() {
    return {
      // Snapshot of the order taken when the modal opens, used by Reset.
      // Stored as list of listIds so we can rebuild the order from the
      // current store even if the user added/removed projects since.
      initialOrder: [],
      dragFromIndex: -1,
      dragOverIndex: -1,
    };
  },
  mounted() {
    let el = document.getElementById("ReorderCustomListsModal");
    if (!el) return;
    // Bootstrap fires show.bs.modal just before the modal opens: perfect
    // moment to snapshot the current order for Reset.
    el.addEventListener("show.bs.modal", this.captureInitialOrder);
  },
  unmounted() {
    let el = document.getElementById("ReorderCustomListsModal");
    if (el) el.removeEventListener("show.bs.modal", this.captureInitialOrder);
  },
  computed: {
    // Live view of the custom-project list from the store. Reads reactively
    // so arrow / drop commits re-render instantly.
    draftOrder: function () {
      return this.$store.getters.cTodoListIds || [];
    },
    dirty: function () {
      if (this.initialOrder.length !== this.draftOrder.length) return true;
      for (let i = 0; i < this.draftOrder.length; i++) {
        if (this.draftOrder[i].listId !== this.initialOrder[i]) return true;
      }
      return false;
    },
  },
  methods: {
    captureInitialOrder: function () {
      this.initialOrder = (this.$store.getters.cTodoListIds || []).map((l) => l.listId);
      this.dragFromIndex = -1;
      this.dragOverIndex = -1;
    },
    colorFor: function (list) {
      // Explicit list color if the user picked one; otherwise a neutral grey
      // dot so every row still has something to anchor the eye.
      return list.color || "#c7cad1";
    },
    commitMove: function (from, to) {
      if (from === to) return;
      if (from < 0 || to < 0) return;
      if (from >= this.draftOrder.length || to >= this.draftOrder.length) return;
      this.$store.commit("reorderCustomTodoLists", { from: from, to: to });
      // Persist immediately so a reload keeps the order; the repo update
      // reads the freshly-committed array from the store.
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
    moveUp: function (index) {
      this.commitMove(index, index - 1);
    },
    moveDown: function (index) {
      this.commitMove(index, index + 1);
    },
    resetOrder: function () {
      if (!this.initialOrder.length) return;
      // Rebuild the stored order from the initial listId sequence. Any list
      // the user added or removed since open gets dropped / stays appended.
      let current = this.$store.getters.cTodoListIds || [];
      let byId = {};
      current.forEach((l) => (byId[l.listId] = l));
      let restored = [];
      this.initialOrder.forEach((id) => {
        if (byId[id]) {
          restored.push(byId[id]);
          delete byId[id];
        }
      });
      // Append any list added during the session (we don't know where it
      // belongs; appending is the safe default).
      Object.keys(byId).forEach((id) => restored.push(byId[id]));
      // Reorder via a sequence of commits so Vue picks up the whole-array
      // replacement on each step. Simplest robust path.
      let targetIds = restored.map((l) => l.listId);
      for (let to = 0; to < targetIds.length; to++) {
        let currentArr = this.$store.getters.cTodoListIds;
        let from = currentArr.findIndex((l) => l.listId === targetIds[to]);
        if (from !== -1 && from !== to) {
          this.$store.commit("reorderCustomTodoLists", { from: from, to: to });
        }
      }
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
    onDragStart: function (event, index) {
      this.dragFromIndex = index;
      event.dataTransfer.effectAllowed = "move";
      // Writing SOMETHING is required for Firefox to actually start the drag.
      try { event.dataTransfer.setData("text/plain", "reorder:" + index); } catch (e) { /* firefox-only edge case */ }
    },
    onDragEnd: function () {
      this.dragFromIndex = -1;
      this.dragOverIndex = -1;
    },
    onDragEnter: function (index) {
      this.dragOverIndex = index;
    },
    onDragOver: function (event, index) {
      event.dataTransfer.dropEffect = "move";
      this.dragOverIndex = index;
    },
    onDragLeave: function (event, index) {
      if (this.dragOverIndex === index) {
        // Only clear when leaving the row rectangle, not when moving onto
        // an inner child like the arrow button.
        if (!event.currentTarget) {
          this.dragOverIndex = -1;
          return;
        }
        let r = event.currentTarget.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX >= r.right ||
            event.clientY < r.top || event.clientY >= r.bottom) {
          this.dragOverIndex = -1;
        }
      }
    },
    onDrop: function (toIndex) {
      let from = this.dragFromIndex;
      this.dragFromIndex = -1;
      this.dragOverIndex = -1;
      if (from < 0) return;
      this.commitMove(from, toIndex);
    },
  },
};
</script>

<style scoped lang="scss">
@import "/src/assets/style/globalVars.scss";

.modal-dialog {
  max-width: 460px;
}

.modal-body {
  padding: 14px 18px 18px;
}

.reorder-hint {
  font-size: 0.78rem;
  color: #7d8590;
  margin: 0 0 10px;
  line-height: 1.4;
}

.dark-theme .reorder-hint {
  color: #8b949e;
}

.reorder-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 56vh;
  overflow-y: auto;
  border: 1px solid #e6e7ea;
  border-radius: 8px;
  background: #fafbfc;
}

.dark-theme .reorder-list {
  border-color: #30363d;
  background: #161b22;
}

.reorder-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #eaecef;
  cursor: grab;
  user-select: none;
  background: transparent;
  transition: background 0.12s ease, transform 0.08s ease;
}

.reorder-item:last-child {
  border-bottom: none;
}

.reorder-item:hover {
  background: rgba(94, 110, 242, 0.06);
}

.reorder-item.dragging {
  opacity: 0.4;
  cursor: grabbing;
}

.reorder-item.drag-over {
  background: rgba(94, 110, 242, 0.14);
  box-shadow: inset 2px 0 0 var(--accent-color, #5e6ef2);
}

.dark-theme .reorder-item {
  border-bottom-color: #30363d;
}

.dark-theme .reorder-item:hover {
  background: rgba(94, 110, 242, 0.12);
}

.dark-theme .reorder-item.drag-over {
  background: rgba(94, 110, 242, 0.22);
}

.reorder-grip {
  color: #c0c4cc;
  font-size: 1rem;
  cursor: grab;
  flex-shrink: 0;
}

.dark-theme .reorder-grip {
  color: #6b7280;
}

.reorder-item:hover .reorder-grip {
  color: var(--accent-color, #5e6ef2);
}

.reorder-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08) inset;
}

.reorder-icon {
  color: #6b7280;
  font-size: 1rem;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}

.dark-theme .reorder-icon {
  color: #8b949e;
}

.reorder-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #24292f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark-theme .reorder-name {
  color: #e6edf3;
}

.reorder-tag {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--accent-color, #5e6ef2);
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(94, 110, 242, 0.1);
}

.reorder-tag-archived {
  color: #7d8590;
  background: rgba(125, 133, 144, 0.14);
}

.reorder-arrows {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
}

.reorder-arrow-btn {
  background: transparent;
  border: 1px solid transparent;
  padding: 2px 6px;
  border-radius: 4px;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
  font-size: 0.75rem;
  transition: background 0.1s ease, color 0.1s ease;
}

.reorder-arrow-btn:hover:not(:disabled) {
  background: rgba(94, 110, 242, 0.14);
  color: var(--accent-color, #5e6ef2);
}

.reorder-arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.dark-theme .reorder-arrow-btn {
  color: #8b949e;
}

.dark-theme .reorder-arrow-btn:hover:not(:disabled) {
  background: rgba(94, 110, 242, 0.22);
  color: #c7d0ff;
}

.reorder-empty {
  text-align: center;
  padding: 32px 12px;
  color: #8b949e;
  font-size: 0.85rem;
}

.modal-footer {
  padding: 10px 18px;
  border-top: 1px solid #eaecef;
}

.dark-theme .modal-footer {
  border-top-color: #30363d;
}
</style>
