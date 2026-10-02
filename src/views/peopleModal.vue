<template>
  <div class="modal fade" id="peopleModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content people-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="ph ph-users-three"></i>
            {{ $t('ui.people') || 'People' }}
          </h5>
          <span class="people-hint">
            <i class="ph ph-at"></i>
            {{ $t('ui.peopleHint') || 'tasks mentioning @person land here' }}
          </span>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <p v-if="!peopleList.length" class="people-empty">
            {{ $t('ui.peopleEmpty') || 'No @mentions in any open task yet. Try adding "@mercedes" to a task.' }}
          </p>

          <div v-else class="people-grid">
            <div
              v-for="p in peopleList"
              :key="p.slug"
              class="person-card"
              :class="{ selected: selectedSlug === p.slug }"
              @click="selectedSlug = p.slug"
            >
              <div class="person-avatar" :style="{ backgroundColor: p.color }">
                {{ p.initials }}
              </div>
              <div class="person-meta">
                <div class="person-name">{{ p.display }}</div>
                <div class="person-counts">
                  <span v-if="p.counts.waiting_on_them > 0" class="pc-chip pc-waiting"
                    :title="$t('ui.peopleWaitingOnThem') || 'They owe you'">
                    <i class="ph ph-hourglass"></i>{{ p.counts.waiting_on_them }}
                  </span>
                  <span v-if="p.counts.they_waiting_on_us > 0" class="pc-chip pc-owe"
                    :title="$t('ui.peopleOweThem') || 'You owe them'">
                    <i class="ph ph-paper-plane-tilt"></i>{{ p.counts.they_waiting_on_us }}
                  </span>
                  <span v-if="p.counts.together > 0" class="pc-chip pc-together"
                    :title="$t('ui.peopleTogether') || 'Together'">
                    <i class="ph ph-handshake"></i>{{ p.counts.together }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedPerson" class="person-detail">
            <h6 class="person-detail-title">
              <span class="person-avatar sm" :style="{ backgroundColor: selectedPerson.color }">{{ selectedPerson.initials }}</span>
              {{ selectedPerson.display }}
            </h6>

            <div class="person-column" v-if="bucketTasks('waiting_on_them').length">
              <div class="person-column-head waiting">
                <i class="ph ph-hourglass"></i>
                {{ $t('ui.peopleWaitingOnThem') || 'Waiting on them' }}
              </div>
              <ul class="person-task-list">
                <li v-for="t in bucketTasks('waiting_on_them')" :key="t.listId + '-' + t.index" @click="openTask(t)">
                  <span class="task-text">{{ t.text }}</span>
                  <span class="task-list-label">{{ t.listName }}</span>
                </li>
              </ul>
            </div>

            <div class="person-column" v-if="bucketTasks('they_waiting_on_us').length">
              <div class="person-column-head owe">
                <i class="ph ph-paper-plane-tilt"></i>
                {{ $t('ui.peopleOweThem') || 'You owe them' }}
              </div>
              <ul class="person-task-list">
                <li v-for="t in bucketTasks('they_waiting_on_us')" :key="t.listId + '-' + t.index" @click="openTask(t)">
                  <span class="task-text">{{ t.text }}</span>
                  <span class="task-list-label">{{ t.listName }}</span>
                </li>
              </ul>
            </div>

            <div class="person-column" v-if="bucketTasks('together').length">
              <div class="person-column-head together">
                <i class="ph ph-handshake"></i>
                {{ $t('ui.peopleTogether') || 'Together' }}
              </div>
              <ul class="person-task-list">
                <li v-for="t in bucketTasks('together')" :key="t.listId + '-' + t.index" @click="openTask(t)">
                  <span class="task-text">{{ t.text }}</span>
                  <span class="task-list-label">{{ t.listName }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div v-if="peopleList.length" class="people-footnote">
            <i class="ph ph-info"></i>
            {{ $t('ui.peopleFootnote') || 'Tag a task with #waiting (they owe you) or #owe (you owe them) to classify it.' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from "bootstrap";
import moment from "moment";
import peopleHelper from "../helpers/peopleHelper";

export default {
  name: "peopleModal",
  data() {
    return {
      selectedSlug: null,
      refreshToken: 0,
    };
  },
  mounted() {
    document.getElementById("peopleModal").addEventListener("show.bs.modal", this.onShow);
  },
  unmounted() {
    document.getElementById("peopleModal").removeEventListener("show.bs.modal", this.onShow);
  },
  methods: {
    onShow: function () {
      // Load every custom project list so mentions in archived or unopened
      // projects are picked up too. Day lists are already loaded by the
      // visible day cards.
      let lists = this.$store.getters.cTodoListIds || [];
      lists.forEach((l) => this.$store.dispatch("loadTodoLists", l.listId));
      this.refreshToken++;
    },
    openTask: function (task) {
      this.$store.dispatch("loadTodoLists", task.listId).then(() => {
        let todoList = this.$store.getters.todoLists[task.listId];
        let todo = todoList ? todoList[task.index] : null;
        if (!todo) return;
        this.$store.commit("actionsSelectedTodoIdUpdate", { toDo: todo, index: task.index });
        Modal.getOrCreateInstance(document.getElementById("peopleModal")).hide();
        let modal = new Modal(document.getElementById("toDoModal"), { keyboard: false });
        modal.show();
      });
    },
    listNameFor: function (listId) {
      if (moment(listId, "YYYYMMDD", true).isValid()) {
        return moment(listId, "YYYYMMDD").locale(this.language).format("ddd D MMM");
      }
      let found = this.$store.getters.cTodoListIds.find((l) => l.listId == listId);
      return found ? found.listName : listId;
    },
    bucketTasks: function (bucket) {
      if (!this.selectedPerson) return [];
      return this.selectedPerson.tasks
        .filter((t) => t.bucket === bucket)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    },
  },
  computed: {
    language: function () {
      return this.$store.getters.config.language;
    },
    aggregated: function () {
      // refreshToken keeps the computed in sync with show events even when
      // the store references don't change under the hood.
      void this.refreshToken;
      return peopleHelper.aggregateFrom(
        this.$store.getters.todoLists || {},
        this.listNameFor
      );
    },
    peopleList: function () {
      let out = Object.values(this.aggregated).map((p) => ({
        ...p,
        color: peopleHelper.colorFor(p.slug),
        initials: peopleHelper.initialsFor(p.slug),
        totalOpen: p.counts.waiting_on_them + p.counts.they_waiting_on_us + p.counts.together,
      }));
      out.sort((a, b) => b.totalOpen - a.totalOpen);
      return out;
    },
    selectedPerson: function () {
      if (!this.selectedSlug) return null;
      return this.peopleList.find((p) => p.slug === this.selectedSlug) || null;
    },
  },
  watch: {
    // Auto-select the person with the most open items when the list arrives
    // or changes and nothing is picked yet. Lives in a watcher instead of
    // the computed to keep the computed side-effect-free (ESLint rule
    // vue/no-side-effects-in-computed-properties).
    peopleList: {
      immediate: true,
      handler: function (list) {
        if (list && list.length && !this.selectedSlug) {
          this.selectedSlug = list[0].slug;
        }
      },
    },
  },
};
</script>

<style scoped lang="scss">
.people-content {
  border-radius: 14px;
  padding: 0;
  overflow: hidden;
}

.modal-header {
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  .modal-title {
    font-family: var(--font-voice, "Fraunces", Georgia, serif);
    font-size: 1.25rem;
    font-weight: 400;
    font-variation-settings: "opsz" 48, "wght" 460;
    letter-spacing: -0.01em;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.dark-theme .modal-header {
  border-bottom-color: rgba(94, 110, 242, 0.18);
}

.people-hint {
  font-size: 0.75rem;
  color: grey;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 1 1 auto;
  margin-left: 6px;

  .dark-theme & { color: #8b94b8; }
}

.modal-body {
  padding: 18px 20px;
  max-height: 70vh;
  overflow: auto;
}

.people-empty {
  text-align: center;
  padding: 60px 20px;
  color: grey;
  font-size: 0.95rem;

  .dark-theme & { color: #8b94b8; }
}

.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
  margin-bottom: 22px;
}

.person-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.2s ease;

  &:hover { background: rgba(0, 0, 0, 0.07); }
  &.selected {
    background: color-mix(in srgb, var(--accent-color, #5e6ef2) 12%, transparent);
    outline: 1px solid color-mix(in srgb, var(--accent-color, #5e6ef2) 40%, transparent);
  }

  .dark-theme & {
    background: rgba(94, 110, 242, 0.08);
    &:hover { background: rgba(94, 110, 242, 0.14); }
    &.selected {
      background: color-mix(in srgb, var(--accent-color, #5e6ef2) 20%, transparent);
    }
  }
}

.person-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  font-size: 0.8rem;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);

  &.sm {
    width: 28px;
    height: 28px;
    font-size: 0.72rem;
  }
}

.person-meta {
  flex: 1 1 auto;
  min-width: 0;
}

.person-name {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-weight: 400;
  font-variation-settings: "opsz" 48, "wght" 460;
  font-size: 1rem;
  margin-bottom: 2px;
}

.person-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pc-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.7rem;
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: 500;

  i { font-size: 0.72rem; }
}

.pc-chip.pc-waiting { background: rgba(249, 115, 22, 0.14); color: #c2410c; }
.pc-chip.pc-owe { background: rgba(237, 84, 75, 0.14); color: #b91c1c; }
.pc-chip.pc-together { background: rgba(94, 110, 242, 0.14); color: var(--accent-color, #5e6ef2); }

.dark-theme .pc-chip.pc-waiting { color: #fdba74; }
.dark-theme .pc-chip.pc-owe { color: #fda4af; }
.dark-theme .pc-chip.pc-together { color: #a5b4fc; }

.person-detail {
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.dark-theme .person-detail {
  border-top-color: rgba(94, 110, 242, 0.14);
}

.person-detail-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: 1.15rem;
  font-weight: 400;
  font-variation-settings: "opsz" 48, "wght" 460;
}

.person-column { margin-bottom: 18px; }

.person-column-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;

  &.waiting { color: #c2410c; }
  &.owe { color: #b91c1c; }
  &.together { color: var(--accent-color, #5e6ef2); }

  i { font-size: 0.9rem; }
}

.dark-theme .person-column-head {
  &.waiting { color: #fdba74; }
  &.owe { color: #fda4af; }
}

.person-task-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 7px;
    cursor: pointer;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }
  }
}

.dark-theme .person-task-list li:hover {
  background: rgba(94, 110, 242, 0.1);
}

.task-text { flex: 1 1 auto; font-size: 0.88rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-list-label { font-size: 0.72rem; color: grey; flex-shrink: 0; }

.dark-theme .task-list-label { color: #8b94b8; }

.people-footnote {
  margin-top: 18px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
  font-size: 0.75rem;
  color: grey;
  display: flex;
  align-items: center;
  gap: 6px;

  .dark-theme & {
    background: rgba(94, 110, 242, 0.08);
    color: #8b94b8;
  }
}
</style>
