<template>
  <div class="modal fade ritual-modal" id="fridayRitualModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content ritual-content">
        <div class="ritual-head">
          <div class="ritual-eyebrow">{{ weekLabel }}</div>
          <h1 class="ritual-title">{{ $t('ui.ritualTitle') || 'Friday wrap-up' }}</h1>
          <div class="ritual-subtitle">{{ $t('ui.ritualSubtitle') || 'Close the week in 90 seconds.' }}</div>
          <i class="bi-x ritual-close" data-bs-dismiss="modal"></i>
        </div>

        <div class="ritual-body">
          <!-- Auto-generated stats block: no user input, just a readout of
               what the week looked like, so there's always something on
               screen when the modal opens. -->
          <div class="ritual-stats">
            <div class="rs-cell">
              <div class="rs-number">{{ stats.shipped }}</div>
              <div class="rs-label">{{ $t('ui.ritualShipped') || 'shipped' }}</div>
            </div>
            <div class="rs-cell">
              <div class="rs-number">{{ stats.carriedOver }}</div>
              <div class="rs-label">{{ $t('ui.ritualCarried') || 'carried over' }}</div>
            </div>
            <div class="rs-cell">
              <div class="rs-number">{{ stats.overdueNow }}</div>
              <div class="rs-label">{{ $t('ui.ritualOverdue') || 'overdue' }}</div>
            </div>
            <div class="rs-cell">
              <div class="rs-number">{{ stats.deadlinesNext }}</div>
              <div class="rs-label">{{ $t('ui.ritualNextWeek') || 'deadlines next 7d' }}</div>
            </div>
          </div>

          <div class="ritual-split">
            <div class="ritual-col">
              <h3 class="ritual-sect-head">{{ $t('ui.ritualShippedTitle') || 'Shipped this week' }}</h3>
              <ul v-if="shippedByProject.length" class="ritual-list">
                <li v-for="group in shippedByProject" :key="group.listId">
                  <span class="rl-dot" :style="{ background: group.color || 'var(--accent-color, #5e6ef2)' }"></span>
                  <div>
                    <div class="rl-name">{{ group.listName }}</div>
                    <div class="rl-count">{{ group.tasks.length }} task{{ group.tasks.length === 1 ? '' : 's' }}</div>
                  </div>
                </li>
              </ul>
              <p v-else class="ritual-empty">{{ $t('ui.ritualNoShipped') || 'Nothing closed this week.' }}</p>
            </div>

            <div class="ritual-col">
              <h3 class="ritual-sect-head">{{ $t('ui.ritualPending') || 'Still pending' }}</h3>
              <ul v-if="pendingTop.length" class="ritual-list">
                <li v-for="t in pendingTop" :key="t.listId + '-' + t.text">
                  <span class="rl-dot" :style="{ background: t.overdue ? '#ed544b' : (t.color || 'var(--accent-color, #5e6ef2)') }"></span>
                  <div>
                    <div class="rl-name">{{ t.text }}</div>
                    <div class="rl-count">{{ t.listName }}{{ t.deadlineLabel ? ' · ' + t.deadlineLabel : '' }}</div>
                  </div>
                </li>
              </ul>
              <p v-else class="ritual-empty">{{ $t('ui.ritualNoPending') || 'Mesa limpia. Enjoy the weekend.' }}</p>
            </div>
          </div>

          <!-- Look ahead: the next 30 days from the long-term overview. -->
          <div class="ritual-ahead">
            <h3 class="ritual-sect-head">{{ $t('overview.nextWeeks') }}</h3>
            <overview-agenda-list :refresh-token="refreshToken" :limit="6" @loaded="agenda = $event"></overview-agenda-list>
          </div>

          <!-- Free-text prompts: 3 lines the user actually fills in. These
               are what give the ritual a trail across weeks. -->
          <div class="ritual-prompts">
            <label class="ritual-prompt">
              <span class="rp-head">{{ $t('ui.ritualPromptWin') || 'The big thing you shipped' }}</span>
              <textarea v-model="entry.win" rows="2" :placeholder="$t('ui.ritualPromptWinPh') || 'What are you proud of this week?'"></textarea>
            </label>

            <label class="ritual-prompt">
              <span class="rp-head">{{ $t('ui.ritualPromptDrag') || 'The topic you are dragging' }}</span>
              <textarea v-model="entry.drag" rows="2" :placeholder="$t('ui.ritualPromptDragPh') || 'What is weighing on you? What would unblock it?'"></textarea>
            </label>

            <label class="ritual-prompt">
              <span class="rp-head">{{ $t('ui.ritualPromptNext') || 'First thing Monday' }}</span>
              <textarea v-model="entry.next" rows="1" :placeholder="$t('ui.ritualPromptNextPh') || 'One sentence. Make it unambiguous.'"></textarea>
            </label>
          </div>
        </div>

        <div class="ritual-foot">
          <button type="button" class="rl-btn rl-btn-ghost" data-bs-dismiss="modal">
            {{ $t('ui.ritualLater') || 'Later' }}
          </button>
          <button type="button" class="rl-btn rl-btn-ghost" @click="exportMarkdown">
            <i class="ph ph-download-simple"></i>
            {{ $t('ui.ritualExport') || 'Export as markdown' }}
          </button>
          <button type="button" class="rl-btn rl-btn-primary" @click="saveAndClose">
            <i class="ph ph-check"></i>
            {{ $t('ui.ritualSave') || 'Save & close the week' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from "bootstrap";
import moment from "moment";
import configRepository from "../repositories/configRepository";
import overviewAgendaList from "../components/overviewAgendaList.vue";

const STORAGE_KEY = "fridayRitualLog";

function loadLog() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLog(log) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch (e) { /* best-effort */ }
}

function weekKey() {
  // ISO week + year: "2026-W40"
  let m = moment();
  return m.isoWeekYear() + "-W" + String(m.isoWeek()).padStart(2, "0");
}

export default {
  name: "fridayRitualModal",
  components: { overviewAgendaList },
  data() {
    return {
      agenda: { entries: [], load: null },
      entry: { win: "", drag: "", next: "" },
      refreshToken: 0,
      autoTimer: null,
    };
  },
  mounted() {
    document.getElementById("fridayRitualModal").addEventListener("show.bs.modal", this.onShow);
    this.scheduleAutoOpen();
  },
  unmounted() {
    document.getElementById("fridayRitualModal").removeEventListener("show.bs.modal", this.onShow);
    if (this.autoTimer) clearInterval(this.autoTimer);
  },
  methods: {
    onShow: function () {
      // Load any existing entry for this ISO week so the user can keep
      // editing the same wrap-up through Friday evening.
      let log = loadLog();
      let key = weekKey();
      this.entry = log[key] ? { ...log[key] } : { win: "", drag: "", next: "" };
      // Ensure every custom project is loaded so the stats are accurate.
      // Archived projects are loaded too because what they shipped this week
      // still counts, but their open tasks are excluded from pending,
      // overdue and deadline figures (see archivedIds below).
      let lists = this.$store.getters.cTodoListIds || [];
      lists.forEach((l) => this.$store.dispatch("loadTodoLists", l.listId));
      this.refreshToken++;
    },
    persist: function () {
      let log = loadLog();
      log[weekKey()] = {
        ...this.entry,
        savedAt: new Date().toISOString(),
      };
      saveLog(log);
    },
    saveAndClose: function () {
      this.persist();
      // Remember we closed this week's ritual so autoOpen won't fire again
      // until next Friday.
      this.$store.commit("updateConfig", { val: moment().format("YYYY-MM-DD"), key: "lastFridayRitualDate" });
      configRepository.update(this.$store.getters.config);
      Modal.getOrCreateInstance(document.getElementById("fridayRitualModal")).hide();
    },
    exportMarkdown: function () {
      this.persist();
      let now = moment();
      let lines = [];
      lines.push(`# Weekly review — ${now.format("D MMMM YYYY")} (${weekKey()})`);
      lines.push("");
      lines.push(`**Shipped:** ${this.stats.shipped} · **Carried over:** ${this.stats.carriedOver} · **Overdue:** ${this.stats.overdueNow} · **Deadlines next 7d:** ${this.stats.deadlinesNext}`);
      lines.push("");
      lines.push("## Shipped this week");
      if (this.shippedByProject.length) {
        this.shippedByProject.forEach((g) => {
          lines.push(`### ${g.listName}`);
          g.tasks.forEach((t) => lines.push(`- ${t}`));
          lines.push("");
        });
      } else {
        lines.push("_Nothing closed this week._");
        lines.push("");
      }
      lines.push("## Still pending");
      this.pendingTop.forEach((t) => {
        lines.push(`- [${t.overdue ? "!" : " "}] ${t.text}  _— ${t.listName}${t.deadlineLabel ? ", " + t.deadlineLabel : ""}_`);
      });
      lines.push("");
      lines.push("## Next 30 days");
      if (this.agenda.load) lines.push(`_Busiest week: ${this.agenda.load.start} (${this.agenda.load.count} items)_`);
      if (this.agenda.entries.length) {
        this.agenda.entries.forEach((e) => lines.push(`- ${e.date} [${e.kind}] ${e.title}${e.source ? " (" + e.source + ")" : ""}`));
      } else {
        lines.push("_Nothing scheduled._");
      }
      lines.push("");
      lines.push("## The big thing you shipped");
      lines.push(this.entry.win || "_(empty)_");
      lines.push("");
      lines.push("## The topic you are dragging");
      lines.push(this.entry.drag || "_(empty)_");
      lines.push("");
      lines.push("## First thing Monday");
      lines.push(this.entry.next || "_(empty)_");
      lines.push("");
      let blob = new Blob([lines.join("\n")], { type: "text/markdown" });
      let url = URL.createObjectURL(blob);
      let a = document.createElement("a");
      a.href = url;
      a.download = `weekly-review-${weekKey()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    // Auto-opening: once a day while the app is open, check if (a) today is
    // Friday, (b) the current time is past the configured ritual hour, and
    // (c) we haven't already closed this week's ritual. Fire the modal if
    // all three hold. Reruns every 20 min while the window stays open.
    scheduleAutoOpen: function () {
      let check = () => {
        try {
          let cfg = this.$store.getters.config || {};
          if (cfg.fridayRitualEnabled === false) return;
          let hour = typeof cfg.fridayRitualHour === "number" ? cfg.fridayRitualHour : 17;
          let now = moment();
          // Friday is isoWeekday 5.
          if (now.isoWeekday() !== 5) return;
          if (now.hour() < hour) return;
          let lastKey = cfg.lastFridayRitualDate;
          if (lastKey) {
            let last = moment(lastKey, "YYYY-MM-DD");
            if (last.isSame(now, "isoWeek")) return;
          }
          let el = document.getElementById("fridayRitualModal");
          if (!el) return;
          // Don't stack on top of another visible modal.
          if (document.querySelector(".modal.show")) return;
          Modal.getOrCreateInstance(el).show();
        } catch (e) { /* best-effort */ }
      };
      // First check 10s after mount, then every 20 min.
      setTimeout(check, 10 * 1000);
      this.autoTimer = setInterval(check, 20 * 60 * 1000);
    },
  },
  computed: {
    language: function () {
      return this.$store.getters.config.language;
    },
    weekLabel: function () {
      let start = moment().startOf("isoWeek");
      let end = moment().endOf("isoWeek");
      return `${start.locale(this.language).format("D MMM")} → ${end.locale(this.language).format("D MMM YYYY")}`;
    },
    weekRange: function () {
      void this.refreshToken;
      return {
        start: moment().startOf("isoWeek").format("YYYYMMDD"),
        end: moment().endOf("isoWeek").format("YYYYMMDD"),
        today: moment().format("YYYYMMDD"),
      };
    },
    // Shipped: tasks that were checked AND live in a day list that falls
    // within this week, OR a project task whose check happened this week
    // (we can't know for sure without a checkedAt timestamp, so project
    // tasks checked and still around count as shipped — close enough).
    shippedByProject: function () {
      let r = this.weekRange;
      let listIds = this.$store.getters.cTodoListIds || [];
      let listNameFor = (lid) => {
        if (/^\d{8}$/.test(lid)) return moment(lid, "YYYYMMDD").locale(this.language).format("ddd D MMM");
        let m = listIds.find((l) => l.listId === lid);
        return m ? m.listName : lid;
      };
      let colorFor = (lid) => {
        let m = listIds.find((l) => l.listId === lid);
        return m ? m.color || null : null;
      };
      let all = this.$store.getters.todoLists || {};
      let byList = {};
      Object.keys(all).forEach((lid) => {
        let isDay = /^\d{8}$/.test(lid);
        if (isDay && (lid < r.start || lid > r.end)) return;
        (all[lid] || []).forEach((t) => {
          if (!t || !t.checked) return;
          if (!byList[lid]) byList[lid] = { listId: lid, listName: listNameFor(lid), color: colorFor(lid), tasks: [] };
          byList[lid].tasks.push(t.text);
        });
      });
      return Object.values(byList).sort((a, b) => b.tasks.length - a.tasks.length);
    },
    pendingTop: function () {
      let r = this.weekRange;
      let listIds = this.$store.getters.cTodoListIds || [];
      let listNameFor = (lid) => {
        if (/^\d{8}$/.test(lid)) return moment(lid, "YYYYMMDD").locale(this.language).format("ddd D MMM");
        let m = listIds.find((l) => l.listId === lid);
        return m ? m.listName : lid;
      };
      let colorFor = (lid) => {
        let m = listIds.find((l) => l.listId === lid);
        return m ? m.color || null : null;
      };
      let out = [];
      let all = this.$store.getters.todoLists || {};
      let archivedIds = new Set(listIds.filter((l) => l && l.archived).map((l) => String(l.listId)));
      Object.keys(all).forEach((lid) => {
        if (archivedIds.has(lid)) return;
        (all[lid] || []).forEach((t) => {
          if (!t || t.checked) return;
          out.push({
            text: t.text,
            listId: lid,
            listName: listNameFor(lid),
            color: colorFor(lid),
            deadline: t.deadline || null,
            deadlineLabel: t.deadline ? moment(t.deadline, "YYYYMMDD").format("DD/MM") : null,
            overdue: t.deadline && t.deadline < r.today,
            priority: t.priority || 0,
          });
        });
      });
      out.sort((a, b) => {
        if (a.overdue && !b.overdue) return -1;
        if (!a.overdue && b.overdue) return 1;
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return (b.priority || 0) - (a.priority || 0);
      });
      return out.slice(0, 10);
    },
    stats: function () {
      let r = this.weekRange;
      let all = this.$store.getters.todoLists || {};
      let shipped = 0;
      let carried = 0;
      let overdueNow = 0;
      let deadlinesNext = 0;
      let nextWeekEnd = moment().add(7, "day").format("YYYYMMDD");
      let archivedIds = new Set(
        (this.$store.getters.cTodoListIds || []).filter((l) => l && l.archived).map((l) => String(l.listId))
      );
      Object.keys(all).forEach((lid) => {
        let isDay = /^\d{8}$/.test(lid);
        let isArchived = archivedIds.has(lid);
        (all[lid] || []).forEach((t) => {
          if (!t) return;
          if (t.checked) {
            if (!isDay || (lid >= r.start && lid <= r.end)) shipped++;
            return;
          }
          // Open tasks of archived projects are out of play.
          if (isArchived) return;
          if (isDay && lid < r.today) carried++;
          if (t.deadline && t.deadline < r.today) overdueNow++;
          if (t.deadline && t.deadline >= r.today && t.deadline <= nextWeekEnd) deadlinesNext++;
        });
      });
      return { shipped, carriedOver: carried, overdueNow, deadlinesNext };
    },
  },
};
</script>

<style scoped lang="scss">
.ritual-modal .modal-dialog { max-width: 820px; }

.ritual-content {
  border-radius: 18px;
  padding: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent-color, #5e6ef2) 6%, transparent) 0%, transparent 50%),
    #ffffff;
}

.dark-theme .ritual-content {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent-color, #5e6ef2) 14%, transparent) 0%, transparent 50%),
    #121a33;
}

.ritual-head {
  padding: 28px 32px 20px 32px;
  position: relative;
}

.ritual-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: grey;
  margin-bottom: 8px;
}

.dark-theme .ritual-eyebrow { color: #8b94b8; }

.ritual-title {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: clamp(1.8rem, 2.4vw + 0.6rem, 2.6rem);
  font-weight: 400;
  font-variation-settings: "opsz" 72, "wght" 420;
  letter-spacing: -0.015em;
  line-height: 1.05;
  margin: 0;
}

.dark-theme .ritual-title { color: #eef1ff; }

.ritual-subtitle {
  font-size: 0.95rem;
  margin-top: 6px;
  opacity: 0.7;
}

.ritual-close {
  position: absolute;
  top: 20px;
  right: 24px;
  cursor: pointer;
  font-size: 1.8rem;
  opacity: 0.55;

  &:hover { opacity: 1; }
}

.ritual-body {
  padding: 0 32px 10px 32px;
  max-height: 60vh;
  overflow: auto;
}

.ritual-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.rs-cell {
  background: rgba(0, 0, 0, 0.03);
  padding: 10px 12px;
  border-radius: 10px;
}

.dark-theme .rs-cell { background: rgba(94, 110, 242, 0.1); }

.rs-number {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: 1.6rem;
  font-variation-settings: "opsz" 48, "wght" 460;
}

.rs-label {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.65;
  margin-top: 2px;
}

.ritual-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.ritual-ahead {
  margin-bottom: 24px;
}

.ritual-sect-head {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 10px;
  font-weight: 500;
}

.ritual-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: flex;
    gap: 10px;
    padding: 6px 0;
    align-items: flex-start;
  }
}

.rl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.rl-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.rl-count {
  font-size: 0.72rem;
  color: grey;
  margin-top: 1px;
}

.dark-theme .rl-count { color: #8b94b8; }

.ritual-empty {
  color: grey;
  font-size: 0.85rem;
  font-style: italic;

  .dark-theme & { color: #8b94b8; }
}

.ritual-prompts {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 16px;
}

.ritual-prompt { display: block; }

.rp-head {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 6px;
  font-weight: 500;
}

.ritual-prompt textarea {
  width: 100%;
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: 1rem;
  line-height: 1.45;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.6);
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--accent-color, #5e6ef2);
  }
}

.dark-theme .ritual-prompt textarea {
  background: rgba(10, 15, 32, 0.5);
  border-color: rgba(94, 110, 242, 0.2);
  color: #eef1ff;
}

.ritual-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 32px 24px 32px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.dark-theme .ritual-foot { border-top-color: rgba(94, 110, 242, 0.14); }

.rl-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 0.88rem;
  background: transparent;
  color: inherit;

  &:hover { background: rgba(0, 0, 0, 0.06); }
}

.dark-theme .rl-btn:hover { background: rgba(94, 110, 242, 0.14); }

.rl-btn.rl-btn-primary {
  background: var(--accent-color, #5e6ef2);
  color: white;

  &:hover { filter: brightness(1.08); }
}
</style>
