<template>
  <div class="modal fade" id="paperTrackerModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi-file-earmark-text"></i> {{ $t("ui.paperTracker") }}
            <span v-if="listName" class="pt-list-tag">{{ listName }}</span>
          </h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <p class="pt-hint">{{ $t("ui.paperTrackerHint") }}</p>

          <!-- Whole-paper summary -->
          <div v-if="rows.length" class="pt-overall">
            <div class="pt-overall-top">
              <span class="pt-overall-label">{{ $t("ui.paperOverall") }}</span>
              <span class="pt-overall-pct" :style="{ color: barColor(total.pct) }">{{ total.pct === null ? "-" : total.pct + "%" }}</span>
            </div>
            <div class="pt-bar pt-bar-lg">
              <span class="pt-bar-fill" :style="{ width: (total.pct || 0) + '%', backgroundColor: barColor(total.pct) }"></span>
            </div>
            <div class="pt-overall-meta">
              <span>{{ total.words.toLocaleString() }}<template v-if="total.target"> / {{ total.target.toLocaleString() }}</template> {{ $t("ui.paperWordsWord") }}</span>
              <span v-if="total.conceptsTotal">{{ total.conceptsDone }}/{{ total.conceptsTotal }} {{ $t("ui.paperConcepts") }}</span>
            </div>
          </div>

          <!-- Optional: read written words from the manuscript -->
          <div class="pt-sync">
            <template v-if="!canReadFiles">
              <span class="pt-note">{{ $t("ui.paperSyncNeedApp") }}</span>
            </template>
            <template v-else-if="!folderPath">
              <span class="pt-note">{{ $t("ui.paperSyncNeedFolder") }}</span>
            </template>
            <template v-else-if="!files.length">
              <span class="pt-note">{{ $t("ui.paperSyncNoFiles") }}</span>
            </template>
            <template v-else>
              <label class="pt-sync-label" for="ptSyncFile">{{ $t("ui.paperSyncFile") }}</label>
              <select id="ptSyncFile" class="pt-select" v-model="syncFile" @change="saveFile">
                <option value="" disabled>{{ $t("ui.paperSyncPick") }}</option>
                <option v-for="f in files" :key="f" :value="f">{{ f }}</option>
              </select>
              <button type="button" class="pt-btn" :disabled="!syncFile || !rows.length" @click="syncFromFile">
                <i class="bi-arrow-repeat"></i> {{ $t("ui.paperSync") }}
              </button>
            </template>
            <p v-if="syncMsg" class="pt-sync-msg" :class="{ 'pt-sync-warn': syncWarn }">{{ syncMsg }}</p>
            <div v-if="detected.length" class="pt-detected">
              <span class="pt-detected-title">{{ $t("ui.paperSyncDetected") }}</span>
              <button
                v-for="d in detected"
                :key="d.name"
                type="button"
                class="pt-chip"
                @click="addDetected(d)"
              >
                <i class="bi-plus"></i> {{ d.name }} <span class="pt-chip-n">{{ d.words.toLocaleString() }}</span>
              </button>
            </div>
          </div>

          <!-- Empty state: start from a template -->
          <div v-if="!rows.length" class="pt-empty">
            <p>{{ $t("ui.paperEmpty") }}</p>
            <div class="pt-template-row">
              <button type="button" class="pt-btn" @click="applyTemplate('article')">{{ $t("ui.paperTemplateArticle") }}</button>
              <button type="button" class="pt-btn" @click="applyTemplate('computational')">{{ $t("ui.paperTemplateComp") }}</button>
            </div>
          </div>

          <!-- Sections -->
          <div v-for="(row, idx) in rows" :key="row.s.id" class="pt-section">
            <div class="pt-section-head">
              <input
                class="pt-name-input"
                type="text"
                :value="row.s.name"
                :placeholder="$t('ui.paperSectionName')"
                @change="setName(row.s.id, $event.target.value)"
              />
              <span class="pt-section-pct" :style="{ color: barColor(row.p.pct) }">{{ row.p.pct === null ? "-" : row.p.pct + "%" }}</span>
              <button type="button" class="pt-icon-btn" :disabled="idx === 0" :title="$t('ui.paperMoveUp')" @click="moveSection(row.s.id, -1)">
                <i class="bi-chevron-up"></i>
              </button>
              <button type="button" class="pt-icon-btn" :disabled="idx === rows.length - 1" :title="$t('ui.paperMoveDown')" @click="moveSection(row.s.id, 1)">
                <i class="bi-chevron-down"></i>
              </button>
              <button type="button" class="pt-icon-btn pt-danger" :title="$t('ui.paperDeleteSection')" @click="deleteSection(row.s.id)">
                <i class="bi-x"></i>
              </button>
            </div>

            <div class="pt-words-row">
              <button type="button" class="pt-step" @click="stepWords(row.s.id, -100)">-100</button>
              <input
                type="number"
                min="0"
                class="pt-num"
                :value="row.s.words || 0"
                :title="$t('ui.paperWordsWritten')"
                @change="setWords(row.s.id, $event.target.value)"
              />
              <span class="pt-slash">/</span>
              <input
                type="number"
                min="0"
                class="pt-num"
                :value="row.s.target || ''"
                :placeholder="$t('ui.paperTargetShort')"
                :title="$t('ui.paperTargetWords')"
                @change="setTarget(row.s.id, $event.target.value)"
              />
              <button type="button" class="pt-step" @click="stepWords(row.s.id, 100)">+100</button>
              <button type="button" class="pt-step" @click="stepWords(row.s.id, 500)">+500</button>
              <span class="pt-unit">{{ $t("ui.paperWordsWord") }}</span>
            </div>
            <template v-if="row.p.target">
              <div class="pt-bar">
                <span class="pt-bar-fill" :style="{ width: row.p.wordsPct + '%', backgroundColor: barColor(row.p.wordsPct) }"></span>
              </div>
              <div class="pt-meta">
                <span>{{ row.p.wordsPct }}%</span>
                <span>{{ row.p.remaining.toLocaleString() }} {{ $t("ui.paperRemaining") }}</span>
              </div>
            </template>

            <!-- Conceptual draft -->
            <button type="button" class="pt-concepts-toggle" @click="toggleOpen(row.s.id)">
              <i :class="isOpen(row.s.id) ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
              {{ $t("ui.paperConceptsToggle") }}
              <span class="pt-concepts-count">{{ row.p.conceptsDone }}/{{ row.p.conceptsTotal }}</span>
              <span v-if="row.p.conceptsTotal" class="pt-mini-bar">
                <span class="pt-bar-fill" :style="{ width: row.p.conceptsPct + '%', backgroundColor: barColor(row.p.conceptsPct) }"></span>
              </span>
            </button>
            <div v-if="isOpen(row.s.id)" class="pt-concepts">
              <div v-for="c in row.s.concepts" :key="c.id" class="pt-concept" :class="{ 'pt-concept-done': c.done }">
                <input type="checkbox" class="pt-check" :checked="c.done" @change="toggleConcept(row.s.id, c.id)" />
                <input
                  class="pt-concept-text"
                  type="text"
                  :value="c.text"
                  @change="setConceptText(row.s.id, c.id, $event.target.value)"
                />
                <button type="button" class="pt-icon-btn pt-danger" @click="removeConcept(row.s.id, c.id)">
                  <i class="bi-x"></i>
                </button>
              </div>
              <input
                class="pt-concept-add"
                type="text"
                v-model="newConcept[row.s.id]"
                :placeholder="$t('ui.paperAddConcept')"
                @keyup.enter="addConcept(row.s.id)"
              />
            </div>
          </div>

          <!-- Add section -->
          <div class="pt-add">
            <input
              class="pt-add-input"
              type="text"
              v-model="newSectionName"
              :placeholder="$t('ui.paperAddSectionPh')"
              @keyup.enter="addSection"
            />
            <button type="button" class="pt-btn" :disabled="!newSectionName.trim()" @click="addSection">
              <i class="bi-plus-lg"></i> {{ $t("ui.paperAddSection") }}
            </button>
            <button v-if="rows.length" type="button" class="pt-btn pt-btn-ghost" @click="applyTemplate('article')" :title="$t('ui.paperTemplates')">
              {{ $t("ui.paperTemplateArticle") }}
            </button>
          </div>

          <div v-if="rows.length || hasPaper" class="pt-remove">
            <button type="button" class="pt-btn pt-btn-ghost pt-danger" @click="removeTracker">
              <i class="bi-trash"></i> {{ confirmRemove ? $t("ui.paperRemoveConfirm") : $t("ui.paperRemove") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";
import paperTrackerHelper from "../helpers/paperTrackerHelper";

// Paper tracker: a manuscript plan per project, shown like the batch tracker
// (one modal, driven by paperTrackerTarget). The plan lives on the project
// record as `paper = { sections: [...], file }`; see paperTrackerHelper for
// the shape and the progress maths. Every edit goes through commit(), which
// clones the plan, applies the change and saves, so nothing is mutated in
// place and nothing is polled in the background.
export default {
  name: "paperTrackerModal",
  props: {
    targetListId: { required: false, type: String, default: null },
  },
  data() {
    return {
      newSectionName: "",
      newConcept: {},
      opened: {},
      confirmRemove: false,
      files: [],
      syncFile: "",
      syncMsg: "",
      syncWarn: false,
      detected: [],
    };
  },
  mounted() {
    let el = document.getElementById("paperTrackerModal");
    if (!el) return;
    el.addEventListener("show.bs.modal", this.onShow);
  },
  unmounted() {
    let el = document.getElementById("paperTrackerModal");
    if (el) el.removeEventListener("show.bs.modal", this.onShow);
  },
  computed: {
    listIndex: function () {
      if (!this.targetListId) return -1;
      return (this.$store.getters.cTodoListIds || []).findIndex((l) => l.listId === this.targetListId);
    },
    list: function () {
      return this.listIndex === -1 ? null : this.$store.getters.cTodoListIds[this.listIndex];
    },
    listName: function () {
      return this.list ? this.list.listName || "" : "";
    },
    folderPath: function () {
      return this.list ? this.list.folderPath || "" : "";
    },
    hasPaper: function () {
      return !!(this.list && this.list.paper);
    },
    paper: function () {
      let p = this.list && this.list.paper;
      return p && Array.isArray(p.sections) ? p : { sections: [], file: "" };
    },
    rows: function () {
      return this.paper.sections.map((s) => ({ s: s, p: paperTrackerHelper.sectionProgress(s) }));
    },
    total: function () {
      return paperTrackerHelper.totals(this.paper);
    },
    canReadFiles: function () {
      return paperTrackerHelper.canReadFiles();
    },
  },
  methods: {
    barColor: function (pct) {
      return paperTrackerHelper.barColor(pct);
    },
    onShow: function () {
      this.newSectionName = "";
      this.newConcept = {};
      this.opened = {};
      this.confirmRemove = false;
      this.syncMsg = "";
      this.syncWarn = false;
      this.detected = [];
      this.files = paperTrackerHelper.listFiles(this.folderPath);
      let saved = this.paper.file;
      this.syncFile = saved && this.files.includes(saved) ? saved : paperTrackerHelper.suggestFile(this.files) || "";
    },

    // ---- persistence ----
    commit: function (mutator) {
      if (this.listIndex === -1) return;
      let next = JSON.parse(JSON.stringify(this.paper));
      mutator(next);
      this.$store.commit("updateCustomListField", { index: this.listIndex, field: "paper", value: next });
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
    },
    toCount: function (value) {
      let n = Math.floor(Number(value));
      return isFinite(n) && n > 0 ? n : 0;
    },
    find: function (draft, sectionId) {
      return draft.sections.find((s) => s.id === sectionId);
    },

    // ---- sections ----
    addSection: function () {
      let name = this.newSectionName.trim();
      if (!name) return;
      this.commit((d) => {
        d.sections.push(paperTrackerHelper.newSection(name, null));
      });
      this.newSectionName = "";
    },
    applyTemplate: function (key) {
      let existing = this.paper.sections.map((s) => paperTrackerHelper.normalizeName(s.name));
      this.commit((d) => {
        paperTrackerHelper.templateSections(key).forEach((sec) => {
          // Never duplicate a section that is already in the plan.
          if (!existing.includes(paperTrackerHelper.normalizeName(sec.name))) d.sections.push(sec);
        });
      });
    },
    setName: function (id, value) {
      this.commit((d) => {
        let s = this.find(d, id);
        if (s) s.name = String(value || "").trim();
      });
    },
    moveSection: function (id, dir) {
      this.commit((d) => {
        let i = d.sections.findIndex((s) => s.id === id);
        let j = i + dir;
        if (i === -1 || j < 0 || j >= d.sections.length) return;
        let tmp = d.sections[i];
        d.sections[i] = d.sections[j];
        d.sections[j] = tmp;
      });
    },
    deleteSection: function (id) {
      this.commit((d) => {
        d.sections = d.sections.filter((s) => s.id !== id);
      });
    },
    removeTracker: function () {
      if (!this.confirmRemove) {
        this.confirmRemove = true;
        setTimeout(() => {
          this.confirmRemove = false;
        }, 3000);
        return;
      }
      if (this.listIndex === -1) return;
      this.$store.commit("updateCustomListField", { index: this.listIndex, field: "paper", value: null });
      customToDoListIdsRepository.update(this.$store.getters.cTodoListIds);
      this.confirmRemove = false;
      this.detected = [];
      this.syncMsg = "";
    },

    // ---- words ----
    setWords: function (id, value) {
      this.commit((d) => {
        let s = this.find(d, id);
        if (s) s.words = this.toCount(value);
      });
    },
    stepWords: function (id, delta) {
      this.commit((d) => {
        let s = this.find(d, id);
        if (s) s.words = Math.max(0, this.toCount(s.words) + delta);
      });
    },
    setTarget: function (id, value) {
      this.commit((d) => {
        let s = this.find(d, id);
        if (s) s.target = this.toCount(value) || null;
      });
    },

    // ---- concepts ----
    isOpen: function (id) {
      if (id in this.opened) return !!this.opened[id];
      // Sections tracked by concepts only start expanded; word-tracked ones
      // stay compact until asked.
      let s = this.paper.sections.find((x) => x.id === id);
      return !!(s && s.concepts.length && !s.target);
    },
    toggleOpen: function (id) {
      this.opened[id] = !this.isOpen(id);
    },
    addConcept: function (id) {
      let text = String(this.newConcept[id] || "").trim();
      if (!text) return;
      this.commit((d) => {
        let s = this.find(d, id);
        if (s) s.concepts.push({ id: paperTrackerHelper.newId(), text: text, done: false });
      });
      this.newConcept[id] = "";
      this.opened[id] = true;
    },
    toggleConcept: function (id, conceptId) {
      this.commit((d) => {
        let s = this.find(d, id);
        let c = s && s.concepts.find((x) => x.id === conceptId);
        if (c) c.done = !c.done;
      });
    },
    setConceptText: function (id, conceptId, value) {
      let text = String(value || "").trim();
      this.commit((d) => {
        let s = this.find(d, id);
        if (!s) return;
        if (!text) {
          s.concepts = s.concepts.filter((x) => x.id !== conceptId);
          return;
        }
        let c = s.concepts.find((x) => x.id === conceptId);
        if (c) c.text = text;
      });
    },
    removeConcept: function (id, conceptId) {
      this.commit((d) => {
        let s = this.find(d, id);
        if (s) s.concepts = s.concepts.filter((x) => x.id !== conceptId);
      });
    },

    // ---- manuscript sync (optional, on demand) ----
    saveFile: function () {
      this.commit((d) => {
        d.file = this.syncFile;
      });
    },
    syncFromFile: function () {
      this.syncMsg = "";
      this.syncWarn = false;
      this.detected = [];
      let res = paperTrackerHelper.analyseFile(this.folderPath, this.syncFile);
      if (!res.ok) {
        this.syncMsg = this.$t("ui.paperSyncErr");
        this.syncWarn = true;
        return;
      }
      let match = paperTrackerHelper.matchSections(this.paper.sections, res.sections);
      this.commit((d) => {
        d.file = this.syncFile;
        d.sections.forEach((s) => {
          if (match.matches[s.id]) s.words = match.matches[s.id].words;
        });
      });
      let parts = [this.$t("ui.paperSyncDone", [Object.keys(match.matches).length, res.filename])];
      if (match.unmatchedPlan.length) {
        parts.push(this.$t("ui.paperSyncUnmatched", [match.unmatchedPlan.map((s) => s.name || "?").join(", ")]));
        this.syncWarn = true;
      }
      if (res.missing && res.missing.length) {
        parts.push(this.$t("ui.paperSyncMissing", [res.missing.join(", ")]));
        this.syncWarn = true;
      }
      this.syncMsg = parts.join(" ");
      // Headings of the file that are not in the plan: offer them as chips.
      // Only the top level is offered (a lone H1 title in Markdown is skipped).
      let levels = res.sections.map((s) => s.level);
      let top = levels.length ? Math.min.apply(null, levels) : 1;
      if (levels.filter((l) => l === top).length === 1 && levels.length > 1) top += 1;
      this.detected = match.unmatchedFile.filter((s) => s.level === top);
    },
    addDetected: function (det) {
      this.commit((d) => {
        let sec = paperTrackerHelper.newSection(det.name, null);
        sec.words = det.words;
        d.sections.push(sec);
      });
      this.detected = this.detected.filter((x) => x !== det);
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 720px;
}

.pt-list-tag {
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

.pt-hint,
.pt-note {
  font-size: 0.82rem;
  color: grey;

  .dark-theme & {
    color: #8b94b8;
  }
}

.pt-hint {
  margin-bottom: 14px;
}

/* ---- overall ---- */
.pt-overall {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 14px;
  background-color: rgba(94, 110, 242, 0.07);
  border-left: 3px solid var(--accent-color, #5e6ef2);

  .dark-theme & {
    background-color: rgba(94, 110, 242, 0.12);
  }
}

.pt-overall-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.pt-overall-label {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: grey;

  .dark-theme & {
    color: #8b94b8;
  }
}

.pt-overall-pct {
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.pt-overall-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 0.78rem;
  color: grey;
  font-variant-numeric: tabular-nums;

  .dark-theme & {
    color: #8b94b8;
  }
}

/* ---- sync ---- */
.pt-sync {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.pt-sync-label {
  font-size: 0.78rem;
  color: grey;

  .dark-theme & {
    color: #8b94b8;
  }
}

.pt-select {
  min-width: 160px;
  padding: 3px 8px;
  font-size: 0.82rem;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background-color: transparent;
  color: inherit;

  .dark-theme & {
    border-color: #30363d;
    background-color: #13171d;
    color: #c9d1d9;
  }
}

.pt-sync-msg {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.8rem;
  color: #10b981;

  &.pt-sync-warn {
    color: #d97706;
  }
}

.pt-detected {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pt-detected-title {
  font-size: 0.74rem;
  color: grey;

  .dark-theme & {
    color: #8b94b8;
  }
}

.pt-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border: 1px dashed rgba(94, 110, 242, 0.5);
  border-radius: 12px;
  background: transparent;
  font-size: 0.78rem;
  color: var(--accent-color, #5e6ef2);
  cursor: pointer;

  &:hover {
    background-color: rgba(94, 110, 242, 0.12);
  }
}

.pt-chip-n {
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

/* ---- buttons ---- */
.pt-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border: 1px solid rgba(94, 110, 242, 0.4);
  border-radius: 7px;
  background-color: rgba(94, 110, 242, 0.1);
  color: var(--accent-color, #5e6ef2);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: rgba(94, 110, 242, 0.2);
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .dark-theme & {
    color: #c7d0ff;
  }
}

.pt-btn-ghost {
  background-color: transparent;
  border-color: transparent;
  color: grey;
  font-weight: 500;

  .dark-theme & {
    color: #8b94b8;
  }
}

.pt-danger:hover:not(:disabled) {
  color: #ed544b !important;
  background-color: rgba(237, 84, 75, 0.12);
}

.pt-icon-btn {
  background: none;
  border: none;
  color: grey;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  padding: 3px 5px;
  border-radius: 4px;

  &:hover:not(:disabled) {
    background-color: rgba(94, 110, 242, 0.14);
    color: var(--accent-color, #5e6ef2);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}

.pt-step {
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

/* ---- empty ---- */
.pt-empty {
  text-align: center;
  padding: 18px 0 8px 0;
  font-size: 0.88rem;
  color: grey;

  .dark-theme & {
    color: #8b94b8;
  }
}

.pt-template-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ---- section card ---- */
.pt-section {
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  background-color: rgba(94, 110, 242, 0.05);
  border-left: 3px solid var(--accent-color, #5e6ef2);

  .dark-theme & {
    background-color: rgba(94, 110, 242, 0.09);
  }
}

.pt-section-head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.pt-name-input {
  flex: 1;
  min-width: 0;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  font-weight: 600;
  font-size: 0.95rem;
  color: inherit;

  &:hover,
  &:focus {
    border-color: #d0d7de;
    outline: none;

    .dark-theme & {
      border-color: #30363d;
    }
  }
}

.pt-section-pct {
  font-weight: 700;
  font-size: 0.9rem;
  margin-right: 6px;
  font-variant-numeric: tabular-nums;
}

.pt-words-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.pt-num {
  width: 74px;
  padding: 2px 6px;
  border: 1px solid #d0d7de;
  border-radius: 5px;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
  background-color: transparent;
  color: inherit;

  .dark-theme & {
    background-color: #13171d;
    border-color: #30363d;
    color: #c9d1d9;
  }
}

.pt-slash {
  opacity: 0.6;
  font-weight: 600;
}

.pt-unit {
  margin-left: 4px;
  font-size: 0.78rem;
  color: grey;

  .dark-theme & {
    color: #8b94b8;
  }
}

.pt-bar {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background-color: rgba(0, 0, 0, 0.08);
  overflow: hidden;

  .dark-theme & {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.pt-bar-lg {
  height: 9px;
  border-radius: 5px;
}

.pt-bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s ease;
}

.pt-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  font-size: 0.74rem;
  color: grey;
  font-variant-numeric: tabular-nums;

  .dark-theme & {
    color: #8b94b8;
  }
}

/* ---- concepts ---- */
.pt-concepts-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 2px 0;
  border: none;
  background: none;
  font-size: 0.8rem;
  color: grey;
  cursor: pointer;

  &:hover {
    color: var(--accent-color, #5e6ef2);
  }

  .dark-theme & {
    color: #8b94b8;
  }
}

.pt-concepts-count {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.pt-mini-bar {
  display: inline-block;
  width: 60px;
  height: 4px;
  border-radius: 2px;
  background-color: rgba(0, 0, 0, 0.08);
  overflow: hidden;

  .dark-theme & {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.pt-concepts {
  margin-top: 6px;
  padding-left: 4px;
}

.pt-concept {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 1px 0;
}

.pt-check {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  accent-color: var(--accent-color, #5e6ef2);
  cursor: pointer;
}

.pt-concept-text,
.pt-concept-add,
.pt-add-input {
  flex: 1;
  min-width: 0;
  padding: 3px 7px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  font-size: 0.86rem;
  color: inherit;

  &:hover,
  &:focus {
    border-color: #d0d7de;
    outline: none;

    .dark-theme & {
      border-color: #30363d;
    }
  }
}

.pt-concept-done .pt-concept-text {
  text-decoration: line-through;
  opacity: 0.6;
}

.pt-concept-add,
.pt-add-input {
  width: 100%;
  border-style: dashed;
  border-color: #d0d7de;
  margin-top: 4px;

  .dark-theme & {
    border-color: #30363d;
  }
}

/* ---- footer ---- */
.pt-add {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);

  .dark-theme & {
    border-top-color: rgba(255, 255, 255, 0.08);
  }

  .pt-add-input {
    margin-top: 0;
  }
}

.pt-remove {
  margin-top: 10px;
  text-align: right;
}
</style>
