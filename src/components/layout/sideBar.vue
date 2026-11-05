<template>
  <div
    class="side-bar"
    @mouseenter="handleEnter"
    @mouseleave="handleLeave"
  >
    <div class="side-bar-rail" :class="{ 'is-expanded': expanded }">
      <div class="sb-item sb-logo-item" data-bs-toggle="modal" data-bs-target="#aboutModal" :title="$t('about.about')">
        <div class="logo-badge">
          <img class="logo" src="/img/latticetodo-mark-color.svg" width="30" height="30" alt="LatticeTodo Logo" />
          <img class="logo logo-white" src="/img/latticetodo-mark-white.svg" width="30" height="30" alt="LatticeTodo Logo" />
        </div>
        <span class="sb-label sb-brand-label">Lattice&nbsp;Todo</span>
      </div>

      <div class="sidebar-group sidebar-group-nav">
        <div v-if="showCalendar" class="sb-item" @click="setTodayDate" :title="$t('ui.today')">
          <i class="ph ph-house sb-icon"></i>
          <span class="sb-label">{{ $t('ui.today') }}</span>
        </div>
        <datepicker
          v-if="datepickerEnabled"
          id="side-bar-date-picker-input"
          v-model="pickedDate"
          :locale="language"
          :weekStartsOn="weekStartOnMonday"
        />
        <div v-if="showCalendar" class="sb-item" @click="changeDate" :title="$t('ui.calendar')">
          <i class="ph ph-calendar-blank sb-icon"></i>
          <span class="sb-label">{{ $t('ui.calendar') }}</span>
        </div>
        <div class="sb-item" :class="{ 'sb-active': overviewOpen }" @click="toggleOverview" :title="$t('ui.overview')">
          <i class="ph ph-chart-bar-horizontal sb-icon"></i>
          <span class="sb-label">{{ $t('ui.overview') }}</span>
        </div>
      </div>

      <div class="sidebar-divider"></div>

      <div class="sidebar-group sidebar-group-create">
        <div class="sb-item" :title="$t('ui.search')" data-bs-toggle="modal" data-bs-target="#searchModal">
          <i class="ph ph-magnifying-glass sb-icon"></i>
          <span class="sb-label">{{ $t('ui.search') }}</span>
        </div>
        <div v-if="showCalendar" class="sb-item" :title="$t('ui.recurringTasks')"
          data-bs-toggle="modal" data-bs-target="#RecurrentEventsModal">
          <i class="ph ph-arrows-clockwise sb-icon"></i>
          <span class="sb-label">{{ $t('ui.recurringTasks') }}</span>
        </div>
        <div class="sb-item" :title="$t('ui.deadlines')"
          data-bs-toggle="modal" data-bs-target="#deadlinesModal">
          <i class="ph ph-calendar-check sb-icon"></i>
          <span class="sb-label">{{ $t('ui.deadlines') }}</span>
        </div>
        <div v-if="showCustomList" class="sb-item" data-bs-toggle="modal"
          data-bs-target="#newListTemplateModal" :title="$t('ui.newCustomList')">
          <i class="ph ph-list-plus sb-icon"></i>
          <span class="sb-label">{{ $t('ui.newCustomList') }}</span>
        </div>
        <!-- Reorder Custom lists was a modal entry; dragging the project
             header now reorders projects directly, so the sidebar slot is
             freed. -->
        <div class="sb-item" data-bs-toggle="modal"
          data-bs-target="#missionControlModal" :title="$t('ui.missionControl')">
          <i class="ph ph-gauge sb-icon"></i>
          <span class="sb-label">{{ $t('ui.missionControl') }}</span>
        </div>
        <div class="sb-item" data-bs-toggle="modal"
          data-bs-target="#peopleModal" :title="$t('ui.people')">
          <i class="ph ph-address-book sb-icon"></i>
          <span class="sb-label">{{ $t('ui.people') }}</span>
        </div>
        <div v-if="isFriday" class="sb-item sb-item-friday" data-bs-toggle="modal"
          data-bs-target="#fridayRitualModal" :title="$t('ui.fridayRitual') || 'Friday wrap-up'">
          <i class="ph ph-sparkle sb-icon"></i>
          <span class="sb-label">{{ $t('ui.fridayRitual') || 'Friday wrap-up' }}</span>
        </div>
      </div>

      <span class="sb-spacer"></span>

      <div class="sidebar-group sidebar-group-status">
        <span v-if="streakCount > 0" class="sb-item sb-badge streak-badge" :class="{ 'streak-celebrate': streakCelebrate }" :title="$t('ui.streakTitle', [streakCount])">
          <streak-crystal :count="streakCount" class="sb-icon streak-icon" />
          <span class="sb-count">{{ streakCount }}</span>
          <span class="sb-label sb-label-small">{{ $t('ui.streak') || 'Streak' }}</span>
        </span>
        <span v-if="scheduledThisWeek > 0" class="sb-item sb-badge scheduled-week-badge" :title="$t('ui.scheduledWeekTitle', [scheduledThisWeek]) || (scheduledThisWeek + ' scheduled this week')">
          <i class="bi-calendar-week sb-icon"></i>
          <span class="sb-count">{{ scheduledThisWeek }}</span>
          <span class="sb-label sb-label-small">{{ $t('ui.scheduledWeek') || 'This week' }}</span>
        </span>
        <span class="sb-item sb-badge zeolite-badge" :title="$t('ui.themeItemOfDay', [todayItemName])"
          data-bs-toggle="modal" data-bs-target="#zeoliteInfoModal">
          <i class="ph ph-hexagon sb-icon"></i>
          <span class="sb-label sb-label-small">{{ todayItemName }}</span>
        </span>
        <span v-if="daysUntilTalk !== null" class="sb-item sb-badge talk-countdown-badge" :title="talkCountdownTitle">
          <i class="ph ph-microphone-stage sb-icon"></i>
          <span class="sb-count">{{ daysUntilTalk }}</span>
          <span class="sb-label sb-label-small">{{ $t('ui.talk') || 'Next talk' }}</span>
        </span>
        <span class="sb-item sb-badge accent-item" :title="$t('settings.accentColor')"
          @click="$refs.accentInput.click()">
          <span class="accent-quick-picker" :style="{ backgroundColor: accentColor }"></span>
          <input ref="accentInput" type="color" class="accent-quick-input" v-model="accentColorModel"
            @change="setAccentColor" />
          <span class="sb-label sb-label-small">{{ $t('settings.accentColor') }}</span>
        </span>
        <span class="sb-item sb-badge saved-item" :class="{ pulse: savedPulse }" :title="$t('ui.savedIndicator')">
          <span class="saved-dot"></span>
          <span class="sb-label sb-label-small">{{ $t('ui.savedIndicator') }}</span>
        </span>
      </div>

      <div ref="moreMenu" class="dropend sidebar-extra-menu">
        <div class="sb-item sb-dropdown-trigger" type="button" data-bs-toggle="dropdown"
          data-bs-popper-config='{"strategy":"fixed"}'>
          <i class="ph ph-dots-three sb-icon"></i>
          <span class="sb-label">{{ $t('ui.more') || 'More' }}</span>
        </div>
        <ul class="dropdown-menu floating-menu" aria-labelledby="btnTaskOptionMenu">
          <li>
            <button class="dropdown-item" type="button" @click="print">
              <i class="ph ph-printer"></i> <span>{{ $t("ui.print") }} </span>
            </button>
          </li>
          <li v-show="showCustomList">
            <button class="dropdown-item" type="button" @click="exportAllMarkdown">
              <i class="ph ph-download-simple"></i> <span>{{ $t("ui.exportAllProjects") }}</span>
            </button>
          </li>
          <li v-show="showCustomList">
            <button class="dropdown-item" type="button" data-bs-toggle="modal" data-bs-target="#ReorderCustomListsModal">
              <i class="ph ph-arrows-down-up"></i> <span>{{ $t("ui.reorderCustomLists") || "Reorder projects" }}</span>
            </button>
          </li>
          <li>
            <hr class="dropdown-divider" />
          </li>
          <li>
            <button class="dropdown-item" type="button" data-bs-toggle="modal" data-bs-target="#aboutModal">
              <img class="about-menu-logo about-menu-logo-color" src="/img/latticetodo-mark-color.svg" alt="" width="14" height="14" />
              <img class="about-menu-logo about-menu-logo-white" src="/img/latticetodo-mark-white.svg" alt="" width="14" height="14" />
              <span>{{ $t("about.about") }}</span>
            </button>
          </li>
          <li>
            <button class="dropdown-item" type="button" @click="openFeatureGuide">
              <i class="ph ph-sparkle"></i> <span>{{ $t("ui.featureGuide") }}</span>
            </button>
          </li>
          <li>
            <button class="dropdown-item" type="button" data-bs-toggle="modal" data-bs-target="#shortcutsModal">
              <i class="ph ph-keyboard"></i> <span>{{ $t("ui.shortcuts") }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="sidebar-group sidebar-group-settings">
        <div class="sb-item" data-bs-toggle="modal" data-bs-target="#tipsModal" :title="$t('tips.tips')">
          <i class="ph ph-info sb-icon"></i>
          <span class="sb-label">{{ $t('tips.tips') }}</span>
        </div>
        <div class="sb-item" data-bs-toggle="modal" data-bs-target="#configModal"
          :title="$t('settings.settings')" @click="openConfigModal">
          <i class="ph ph-gear sb-icon"></i>
          <span class="sb-label">{{ $t('settings.settings') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import Datepicker from "vue3-datepicker";
import languageHelper from "../../helpers/languageHelper.js";
import configRepository from "../../repositories/configRepository";
import streakHelper from "../../helpers/streakHelper";
import themesHelper from "../../helpers/themesHelper";
import streakCrystal from "../streakCrystal.vue";

export default {
  name: "sideBar",
  emits: ["changeDate"],
  components: {
    Datepicker,
    streakCrystal,
  },
  data() {
    return {
      pickedDate: new Date(),
      datepickerEnabled: false,
      accentColorModel: this.$store.getters.config.accentColor || "#5e6ef2",
      savedPulse: false,
      savedPulseTimeout: null,
      streakCount: 0,
      streakRefreshTimeout: null,
      // Visual flash on the streak badge whenever a day finishes 100% while
      // the app is open.
      streakCelebrate: false,
      streakCelebrateTimeout: null,
      // Hover-expand state. A short enter delay avoids the rail popping open
      // when the mouse just drifts across the edge of the window on its way
      // somewhere else; the leave is immediate so it never feels sticky.
      expanded: false,
      enterTimer: null,
      // True while the "More" menu is open, so the rail stays expanded while the
      // pointer travels to the (floating) menu.
      moreOpen: false,
    };
  },
  mounted() {
    this.refreshStreak();
    window.addEventListener("beforeprint", () => {
      document.getElementById("app-container").classList.add("ready-to-print");
      if (JSON.parse(localStorage.getItem("config")).darkTheme)
        document.getElementById("app-container").classList.remove("dark-theme");
    });

    window.addEventListener("afterprint", () => {
      document.getElementById("app-container").classList.remove("ready-to-print");
      if (JSON.parse(localStorage.getItem("config")).darkTheme)
        document.getElementById("app-container").classList.add("dark-theme");
    });

    this.$refs.moreMenu.addEventListener("show.bs.dropdown", this.onMoreShow);
    this.$refs.moreMenu.addEventListener("hidden.bs.dropdown", this.onMoreHidden);
    window.addEventListener("wtd-saved", this.onSaved);
    window.addEventListener("wtd-day-completed", this.onDayCompleted);
  },
  unmounted() {
    window.removeEventListener("wtd-saved", this.onSaved);
    window.removeEventListener("wtd-day-completed", this.onDayCompleted);
    clearTimeout(this.streakRefreshTimeout);
    clearTimeout(this.streakCelebrateTimeout);
    clearTimeout(this.enterTimer);
  },
  methods: {
    toggleOverview: function () {
      this.$store.commit("setOverviewOpen", !this.$store.getters.overviewOpen);
    },
    handleEnter: function () {
      // 180ms grace keeps a passing cursor from triggering the full expand.
      clearTimeout(this.enterTimer);
      this.enterTimer = setTimeout(() => {
        this.expanded = true;
      }, 180);
    },
    handleLeave: function () {
      clearTimeout(this.enterTimer);
      if (this.moreOpen) return;
      this.expanded = false;
    },
    onMoreShow: function () {
      this.moreOpen = true;
    },
    onMoreHidden: function () {
      this.moreOpen = false;
      // Collapse again unless the pointer is still over the rail.
      if (!this.$el.matches(":hover")) this.expanded = false;
    },
    changeDate: function () {
      this.datepickerEnabled = true;
      this.$nextTick(function () {
        document.getElementById("side-bar-date-picker-input").click();
        document.getElementById("side-bar-date-picker-input").focus();
        document.getElementById("side-bar-date-picker-input").addEventListener("focusout", this.resetDatePicker);
        document.getElementById("side-bar-date-picker-input").onkeydown = function (evt) {
          evt.keyCode == 27 && document.getElementById("side-bar-date-picker-input").blur();
        };
      });
    },
    setTodayDate: function () {
      this.$emit("changeDate", moment().format("YYYYMMDD"));
    },
    resetDatePicker: function () {
      document.getElementById("side-bar-date-picker-input").removeEventListener("focusout", this.resetDatePicker);
      this.datepickerEnabled = false;
    },
    openConfigModal: function () {
      document.getElementById("config-general-tab").click();
    },
    openFeatureGuide: function () {
      window.dispatchEvent(new CustomEvent("open-feature-guide", { detail: {} }));
    },
    print: function () {
      window.print();
    },
    setAccentColor: function () {
      this.$store.commit("updateConfig", { val: this.accentColorModel, key: "accentColor" });
      configRepository.update(this.$store.getters.config);
    },
    pulseSaved: function () {
      this.savedPulse = true;
      clearTimeout(this.savedPulseTimeout);
      this.savedPulseTimeout = setTimeout(() => {
        this.savedPulse = false;
      }, 900);
    },
    onSaved: function () {
      this.pulseSaved();
      clearTimeout(this.streakRefreshTimeout);
      this.streakRefreshTimeout = setTimeout(this.refreshStreak, 800);
    },
    refreshStreak: function () {
      streakHelper.computeStreak().then((n) => {
        this.streakCount = n;
      });
    },
    onDayCompleted: function () {
      this.streakCelebrate = true;
      clearTimeout(this.streakCelebrateTimeout);
      this.streakCelebrateTimeout = setTimeout(() => {
        this.streakCelebrate = false;
      }, 1600);
    },
    exportAllMarkdown: async function () {
      let lists = this.$store.getters.cTodoListIds.filter((l) => !l.archived);
      let sections = [];
      for (let list of lists) {
        let tasks = this.$store.getters.todoLists[list.listId];
        if (!tasks) {
          await this.$store.dispatch("loadTodoLists", list.listId);
          tasks = this.$store.getters.todoLists[list.listId];
        }
        let lines = [`## ${list.listName || "Lista"}`, ""];
        if (list.notes) lines.push(list.notes, "");
        (tasks || []).forEach((t) => {
          let box = t.checked ? "[x]" : "[ ]";
          let line = `- ${box} ${t.text}`;
          if (t.deadline) line += ` (${moment(t.deadline).format("DD/MM/YYYY")})`;
          if (t.tags && t.tags.length) line += ` #${t.tags.join(" #")}`;
          lines.push(line);
        });
        sections.push(lines.join("\n"));
      }
      let title = `# ${this.$t("ui.exportAllProjectsTitle")} — ${moment().format("DD/MM/YYYY")}`;
      let full = [title, "", sections.join("\n\n")].join("\n");
      let blob = new Blob([full], { type: "text/markdown" });
      let url = URL.createObjectURL(blob);
      let a = document.createElement("a");
      a.href = url;
      a.download = `latticetodo-resumen-${moment().format("YYYY-MM-DD")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  },
  watch: {
    pickedDate: function (val) {
      if (this.datepickerEnabled) {
        document.getElementById("side-bar-date-picker-input").removeEventListener("focusout", this.resetDatePicker);
        this.datepickerEnabled = false;
        this.$emit("changeDate", moment(val).format("YYYYMMDD"));
        this.pickedDate = new Date();
      }
    },
  },
  computed: {
    showCustomList: function () {
      return this.$store.getters.config.customList;
    },
    showCalendar: function () {
      return this.$store.getters.config.calendar;
    },
    overviewOpen: function () {
      return this.$store.getters.overviewOpen;
    },
    weekStartOnMonday: function () {
      return this.$store.getters.config.weekStartOnMonday ? 1 : 0;
    },
    language: function () {
      let lang = this.$store.getters.config.language;
      return languageHelper.getLanguagePack(lang);
    },
    accentColor: function () {
      return this.$store.getters.config.accentColor || "#5e6ef2";
    },
    todayItemName: function () {
      let cfg = this.$store.getters.config;
      let item = themesHelper.getTodayItem(cfg);
      return item ? item.fullName : "";
    },
    daysUntilTalk: function () {
      let d = this.$store.getters.config.nextTalkDate;
      if (!d) return null;
      let days = moment(d).startOf("day").diff(moment().startOf("day"), "days");
      if (days < 0) return null;
      return days;
    },
    // Friday-only sidebar entry for the weekly wrap-up; hidden the rest of
    // the week so the rail stays uncluttered.
    isFriday: function () {
      return moment().isoWeekday() === 5;
    },
    talkCountdownTitle: function () {
      let title = this.$store.getters.config.nextTalkTitle || this.$t("ui.templateConference");
      if (this.daysUntilTalk === 0) return title + ": " + this.$t("ui.talkCountdownToday");
      return this.$t("ui.talkCountdownDays", [title, this.daysUntilTalk]);
    },
    // Count of open tasks whose dueDate falls within the current ISO week
    // (today through next Sunday). Scans every loaded list once per change.
    scheduledThisWeek: function () {
      let today = moment().startOf("day");
      let endOfWeek = moment().endOf("isoWeek").startOf("day");
      let count = 0;
      let lists = this.$store.getters.todoLists || {};
      // Archived projects may be loaded in the store (search, Friday review,
      // archived this session) but must not count toward the week.
      let archivedIds = new Set(
        (this.$store.getters.cTodoListIds || []).filter((l) => l && l.archived).map((l) => String(l.listId))
      );
      Object.keys(lists).forEach((lid) => {
        if (archivedIds.has(lid)) return;
        (lists[lid] || []).forEach((t) => {
          if (!t || !t.dueDate || t.checked) return;
          if (!/^\d{8}$/.test(t.dueDate)) return;
          let d = moment(t.dueDate, "YYYYMMDD");
          if (d.isSameOrAfter(today) && d.isSameOrBefore(endOfWeek)) count++;
        });
      });
      return count;
    },
  },
};
</script>

<style scoped lang="scss">
/* ============================================================
   SIDEBAR RAIL
   ------------------------------------------------------------
   Outer `.side-bar` reserves the gutter in the layout (3.6rem).
   Inner `.side-bar-rail` is absolutely positioned on top of it;
   on hover it grows to 14rem and overlays the main column,
   revealing the text labels alongside each icon. The main
   content never shifts, so nothing jumps when the pointer
   grazes the edge of the window.
   ============================================================ */
.side-bar {
  width: 3.6rem;
  height: 100%;
  float: left;
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

.side-bar-rail {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3.6rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0 8px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.88);
  border-right: 1px solid rgba(0, 0, 0, 0.045);
  transition:
    width 0.26s cubic-bezier(0.2, 1, 0.1, 1),
    box-shadow 0.26s ease,
    background-color 0.26s ease;
}

.side-bar-rail::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--accent-color, #5e6ef2);
  opacity: 0.045;
  pointer-events: none;
  z-index: -1;
}

.dark-theme .side-bar-rail::before {
  opacity: 0.14;
}

.side-bar-rail.is-expanded {
  width: 14rem;
  box-shadow:
    8px 0 24px -8px rgba(0, 0, 0, 0.12),
    1px 0 0 rgba(0, 0, 0, 0.04);
}

.dark-theme .side-bar-rail.is-expanded {
  box-shadow:
    8px 0 24px -8px rgba(0, 0, 0, 0.5),
    1px 0 0 rgba(94, 110, 242, 0.14);
}

/* ---------- Item row (icon + label) ---------- */
.sb-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 10px;
  margin-bottom: 2px;
  border-radius: 8px;
  cursor: pointer;
  color: inherit;
  position: relative;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.4s var(--spring-ease, cubic-bezier(0.34, 1.56, 0.64, 1));
}

.sb-item.sb-active {
  color: var(--accent-color, #5e6ef2);
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 12%, transparent);
}

.sb-item:hover {
  background-color: #eaecef;
  color: var(--accent-color, #5e6ef2);
}

.dark-theme .sb-item:hover {
  background-color: rgba(94, 110, 242, 0.14);
  color: #c8cfe8;
}

.sb-item:active {
  background-color: #dddfe2;
}

.dark-theme .sb-item:active {
  background-color: rgba(94, 110, 242, 0.22);
}

.sb-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  width: 22px;
  text-align: center;
  line-height: 1;
}

/* The label is reserved an auto flex width so the ellipsis works, but we
   fade+slide it in only when the rail is expanded. Pointer events are off
   while hidden so a stray click on the icon never lands on empty space. */
.sb-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.86rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transform: translateX(-6px);
  pointer-events: none;
  transition:
    opacity 0.18s ease,
    transform 0.22s ease;
}

.side-bar-rail.is-expanded .sb-label {
  opacity: 0.92;
  transform: translateX(0);
  transition-delay: 0.06s;
  pointer-events: auto;
}

.sb-label-small {
  font-size: 0.78rem;
  opacity: 0;
  font-weight: 400;
}

.side-bar-rail.is-expanded .sb-label-small {
  opacity: 0.78;
}

@media (prefers-reduced-motion: reduce) {
  .side-bar-rail,
  .sb-label,
  .sb-item {
    transition: none;
  }
}

/* ---------- Logo + brand ---------- */
.sb-logo-item {
  padding: 10px 6px;
  margin-bottom: 10px;
  gap: 12px;
}

.sb-logo-item:hover {
  background-color: transparent;
}

.logo-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background:
    radial-gradient(circle at 30% 25%,
      color-mix(in srgb, var(--accent-color, #5e6ef2) 55%, white) 0%,
      color-mix(in srgb, var(--accent-color, #5e6ef2) 85%, black) 100%);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.12),
    0 4px 10px -2px color-mix(in srgb, var(--accent-color, #5e6ef2) 35%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
  flex-shrink: 0;
  cursor: pointer;
  transition:
    transform 0.3s var(--spring-ease, cubic-bezier(0.34, 1.56, 0.64, 1)),
    box-shadow 0.25s ease;
}

.sb-logo-item:hover .logo-badge {
  transform: translateY(-1px) scale(1.04);
  box-shadow:
    0 2px 3px rgba(0, 0, 0, 0.14),
    0 6px 14px -2px color-mix(in srgb, var(--accent-color, #5e6ef2) 48%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.sb-logo-item:active .logo-badge {
  transform: translateY(0) scale(0.98);
}

.logo-badge .logo {
  display: none;
}

.logo-badge .logo-white {
  display: block;
  width: 30px;
  height: 30px;
  cursor: pointer;
  opacity: 0.98;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.18));
}

.sb-brand-label {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: 1.1rem;
  font-variation-settings: "opsz" 48, "wght" 460;
  letter-spacing: -0.01em;
  opacity: 0;
}

.side-bar-rail.is-expanded .sb-brand-label {
  opacity: 1;
}

/* ---------- Groups and dividers ---------- */
.sidebar-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.sb-spacer {
  flex: 1 1 auto;
}

.sidebar-divider {
  height: 1px;
  background-color: rgba(0, 0, 0, 0.08);
  margin: 6px 10px 10px 10px;
}

/* Friday wrap-up item is only visible on Fridays. Tint the icon warm so it
   reads as a special moment of the week. */
.sb-item.sb-item-friday .sb-icon {
  color: #f59e0b;
  filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.4));
}

.sb-item.sb-item-friday:hover { color: #f59e0b; }

.dark-theme .sidebar-divider {
  background-color: rgba(94, 110, 242, 0.16);
}

/* ---------- Status badges ---------- */
.sidebar-group-status {
  gap: 2px;
  padding-bottom: 4px;
}

.sb-badge {
  padding: 6px 10px;
  gap: 12px;
  cursor: default;
}

.sb-badge .sb-icon {
  font-size: 0.95rem;
}

.sb-count {
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 20px;
  text-align: center;
  color: var(--accent-color, #5e6ef2);
}

.streak-badge {
  color: var(--accent-color, #5e6ef2);
}

/* The streak icon is now the growing crystal component. Hover/pulse the
   container; the component owns the per-cell animation. */
.streak-icon {
  flex-shrink: 0;
}

.streak-badge.streak-celebrate {
  animation: streakCelebrateBounce 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.streak-badge.streak-celebrate :deep(.streak-crystal) {
  color: #f59e0b;
  filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.75));
}

@keyframes streakCelebrateBounce {
  0% { transform: scale(1); }
  25% { transform: scale(1.15); }
  50% { transform: scale(0.98); }
  70% { transform: scale(1.06); }
  100% { transform: scale(1); }
}

.scheduled-week-badge .sb-count {
  color: #0891b2;
}

.dark-theme .scheduled-week-badge .sb-count {
  color: #22d3ee;
}

.talk-countdown-badge .sb-count {
  color: #e11d48;
}

.dark-theme .talk-countdown-badge .sb-count {
  color: #fb7185;
}

.zeolite-badge .sb-icon {
  opacity: 0.55;
  transition: opacity 0.25s ease, transform 0.4s var(--spring-ease, cubic-bezier(0.34, 1.56, 0.64, 1));
}

.zeolite-badge:hover .sb-icon {
  opacity: 0.9;
  transform: scale(1.1) rotate(10deg);
}

@media (prefers-reduced-motion: reduce) {
  .streak-badge.streak-celebrate { animation: none; }
}

/* ---------- Accent / saved markers ---------- */
.accent-item {
  cursor: pointer;
}

.accent-quick-picker {
  position: relative;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  margin-left: 2px;
}

.dark-theme .accent-quick-picker {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15);
}

.accent-quick-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.saved-item {
  cursor: default;
}

.saved-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: #2dbd6e;
  display: block;
  flex-shrink: 0;
  margin-left: 6px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.saved-item.pulse .saved-dot {
  transform: scale(1.7);
  box-shadow: 0 0 0 4px rgba(45, 189, 110, 0.22);
}

/* ---------- Dropdown (more menu) ---------- */
.sidebar-extra-menu {
  position: relative;
}

.sb-dropdown-trigger {
  width: 100%;
}

.dropdown-menu {
  font-size: 0.865rem;
  min-width: unset;
  border-radius: 8px;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.2);
  border: none;
  color: #3c3c3c;

  .dropdown-item {
    padding: 0.4rem 1.9rem 0.4rem 0.65rem;
  }

  .dropdown-divider {
    margin: 0.3rem;
  }

  i {
    font-size: 0.99rem;
    margin-right: 11px;
    display: inline-block;
  }
}

.about-menu-logo {
  margin-right: 11px;
  vertical-align: middle;
}

.about-menu-logo-white {
  display: none;
}

.dark-theme {
  .about-menu-logo-color {
    display: none;
  }
  .about-menu-logo-white {
    display: inline-block;
  }
}

.dropdown-toggle-split {
  padding: 0px;
}

/* ---------- Dark theme (deep navy, not inverted) ---------- */
.dark-theme .side-bar-rail {
  background-color: rgba(13, 19, 38, 0.92);
  border-right: 1px solid rgba(94, 110, 242, 0.14);
  color: #c8cfe8;
}
</style>
