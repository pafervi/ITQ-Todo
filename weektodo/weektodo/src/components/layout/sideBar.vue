<template>
  <div class="side-bar">
    <div class="logo-badge" data-bs-toggle="modal" data-bs-target="#aboutModal" :title="$t('about.about')">
      <img class="logo" src="/img/logo-color.svg" width="26" height="26" alt="ITQ Todo Logo" />
      <img class="logo logo-white" src="/img/logo-white.svg" width="26" height="26" alt="ITQ Todo Logo" />
    </div>

    <div class="sidebar-group sidebar-group-nav">
      <i v-if="showCalendar" class="ph ph-house" @click="setTodayDate" :title="$t('ui.today')"></i>
      <datepicker
        v-if="datepickerEnabled"
        id="side-bar-date-picker-input"
        v-model="pickedDate"
        :locale="language"
        :weekStartsOn="weekStartOnMonday"
      />
      <i v-if="showCalendar" class="ph ph-calendar-blank" @click="changeDate" :title="$t('ui.calendar')"> </i>
    </div>

    <div class="sidebar-divider"></div>

    <div class="sidebar-group sidebar-group-create">
      <i class="ph ph-magnifying-glass" :title="$t('ui.search')" data-bs-toggle="modal" data-bs-target="#searchModal"></i>
      <i
        v-if="showCalendar"
        class="ph ph-arrows-clockwise"
        :title="$t('ui.recurringTasks')"
        data-bs-toggle="modal"
        data-bs-target="#RecurrentEventsModal"
      >
      </i>
      <i
        class="ph ph-calendar-check"
        :title="$t('ui.deadlines')"
        data-bs-toggle="modal"
        data-bs-target="#deadlinesModal"
      >
      </i>
      <i
        v-if="showCustomList"
        class="ph ph-list-plus"
        data-bs-toggle="modal"
        data-bs-target="#newListTemplateModal"
        :title="$t('ui.newCustomList')"
      ></i>
      <i
        v-if="showCustomList"
        class="ph ph-arrows-left-right"
        data-bs-target="#ReorderCustomListsModal"
        data-bs-toggle="modal"
        :title="$t('ui.reorderCustomLists')"
      ></i>
      <i
        class="ph ph-gauge"
        data-bs-toggle="modal"
        data-bs-target="#missionControlModal"
        :title="$t('ui.missionControl')"
      ></i>
    </div>

    <span style="flex-grow: 1"></span>

    <div class="sidebar-group sidebar-group-status">
      <span v-if="streakCount > 0" class="streak-badge" :title="$t('ui.streakTitle', [streakCount])">
        <i class="ph-fill ph-hexagon streak-icon"></i>{{ streakCount }}
      </span>
      <span class="zeolite-badge" :title="$t('ui.zeoliteOfDay', [todayLatticeName])">
        <i class="ph ph-hexagon"></i>
      </span>
      <span v-if="daysUntilTalk !== null" class="talk-countdown-badge" :title="talkCountdownTitle">
        <i class="ph ph-microphone-stage"></i>{{ daysUntilTalk }}
      </span>
      <span class="accent-quick-picker" :style="{ backgroundColor: accentColor }" :title="$t('settings.accentColor')"
        @click="$refs.accentInput.click()">
        <input ref="accentInput" type="color" class="accent-quick-input" v-model="accentColorModel"
          @change="setAccentColor" />
      </span>
      <span class="saved-indicator" :class="{ pulse: savedPulse }" :title="$t('ui.savedIndicator')">
        <span class="saved-dot"></span>
      </span>
    </div>

    <div class="dropend d-flex justify-content-center sidebar-extra-menu">
      <i class="ph ph-dots-three sidebar-icon align-self-center" type="button" data-bs-toggle="dropdown"></i>
      <ul class="dropdown-menu mx-3" aria-labelledby="btnTaskOptionMenu">
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
        <li>
          <hr class="dropdown-divider" />
        </li>
        <li>
          <a href="https://weektodo.me/support-us" target="_blank" class="dropdown-item" type="button">
            <i class="ph ph-gift"></i> <span>{{ $t("donate.supportUs") }}</span>
          </a>
        </li>
        <li>
          <button class="dropdown-item" type="button" data-bs-toggle="modal" data-bs-target="#aboutModal">
            <img class="about-menu-logo about-menu-logo-color" src="/img/logo-color.svg" alt="" width="14" height="14" />
            <img class="about-menu-logo about-menu-logo-white" src="/img/logo-white.svg" alt="" width="14" height="14" />
            <span>{{ $t("about.about") }}</span>
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
      <i class="ph ph-info" data-bs-toggle="modal" data-bs-target="#tipsModal" :title="$t('tips.tips')"></i>
      <i
        class="ph ph-gear"
        data-bs-toggle="modal"
        data-bs-target="#configModal"
        :title="$t('settings.settings')"
        @click="openConfigModal"
      ></i>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import Datepicker from "vue3-datepicker";
import languageHelper from "../../helpers/languageHelper.js";
import configRepository from "../../repositories/configRepository";
import streakHelper from "../../helpers/streakHelper";
import zeoliteHelper from "../../helpers/zeoliteHelper";

export default {
  name: "sideBar",
  emits: ["changeDate"],
  components: {
    Datepicker,
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

    window.addEventListener("wtd-saved", this.onSaved);
  },
  unmounted() {
    window.removeEventListener("wtd-saved", this.onSaved);
    clearTimeout(this.streakRefreshTimeout);
  },
  methods: {
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
    openDonateModal: function () {
      window.open("https://weektodo.me/support-us", "_blank");
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
      a.download = `weektodo-resumen-${moment().format("YYYY-MM-DD")}.md`;
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
    todayLatticeName: function () {
      return zeoliteHelper.getTodayLattice().fullName;
    },
    daysUntilTalk: function () {
      let d = this.$store.getters.config.nextTalkDate;
      if (!d) return null;
      let days = moment(d).startOf("day").diff(moment().startOf("day"), "days");
      if (days < 0) return null;
      return days;
    },
    talkCountdownTitle: function () {
      let title = this.$store.getters.config.nextTalkTitle || this.$t("ui.templateConference");
      if (this.daysUntilTalk === 0) return title + ": " + this.$t("ui.talkCountdownToday");
      return this.$t("ui.talkCountdownDays", [title, this.daysUntilTalk]);
    },
  },
};
</script>

<style scoped lang="scss">
.side-bar {
  width: 3.6rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  float: left;
  /* "Thick" material: the most opaque, most blurred layer in the app's
     depth hierarchy (sidebar > toolbar > cards), so the mesh background
     reads through faintly instead of a flat fill. */
  background-color: rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border-right: 1px solid rgba(0, 0, 0, 0.045);
  position: relative;
  z-index: 2;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .side-bar {
    background-color: #fcfcfc;
  }
}

.side-bar::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--accent-color, #5e6ef2);
  opacity: 0.045;
  pointer-events: none;
  z-index: -1;
}

.dark-theme .side-bar::before {
  opacity: 0.1;
}

.logo-badge {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 14%, transparent);
  margin: 10px auto 12px auto;
  cursor: pointer;
  flex-shrink: 0;
}

.side-bar .logo {
  cursor: pointer;
}

.side-bar .logo-white {
  display: none;
}

.dark-theme {
  .side-bar .logo {
    display: none;
  }
  .side-bar .logo-white {
    display: block;
    opacity: 0.95;
  }
}

.sidebar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sidebar-divider {
  width: 22px;
  height: 1px;
  background-color: rgba(0, 0, 0, 0.08);
  align-self: center;
  margin: 2px 0px 9px 0px;
}

.dark-theme .sidebar-divider {
  background-color: rgba(255, 255, 255, 0.08);
}

.side-bar > i,
.sidebar-icon,
.sidebar-group i {
  font-size: 1.25rem;
  padding: 10px;
  margin-bottom: 9px;
  align-self: center;
  cursor: pointer;
  transition: background-color 0.25s ease, color 0.25s ease, transform 0.4s var(--spring-ease, cubic-bezier(0.34, 1.56, 0.64, 1));
}

.side-bar i:hover,
.sidebar-icon:hover {
  border-radius: 6px;
  background-color: #eaecef;
  color: var(--accent-color, #5e6ef2);
  transform: scale(1.1);
}

.side-bar i:active,
.sidebar-icon:active {
  background-color: #dddfe2;
}

.sidebar-group-status {
  gap: 2px;
  margin-bottom: 6px;
}

.streak-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-color, #5e6ef2);
  margin-bottom: 8px;
  cursor: default;

  i {
    font-size: 0.85rem;
  }
}

.streak-icon {
  animation: streakPulse 2.4s ease-in-out infinite;
}

.talk-countdown-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #e11d48;
  margin-bottom: 8px;
  cursor: default;

  i {
    font-size: 0.85rem;
  }
}

.zeolite-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  cursor: default;
  opacity: 0.45;
  transition: opacity 0.25s ease, transform 0.4s var(--spring-ease, cubic-bezier(0.34, 1.56, 0.64, 1));

  i {
    font-size: 0.85rem;
  }

  &:hover {
    opacity: 0.85;
    transform: scale(1.15) rotate(15deg);
  }
}

@keyframes streakPulse {
  0%,
  100% {
    opacity: 0.75;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .streak-icon {
    animation: none;
  }
}

.accent-quick-picker {
  position: relative;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08);
  margin-bottom: 10px;
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

.saved-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  cursor: default;
}

.saved-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #2dbd6e;
  display: block;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.saved-indicator.pulse .saved-dot {
  transform: scale(1.7);
  box-shadow: 0 0 0 4px rgba(45, 189, 110, 0.22);
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

/*------------------------Dark Theme*------------------*/

.dark-theme .side-bar {
  background-color: rgba(18, 22, 28, 0.62);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  color: #ababab;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .dark-theme .side-bar {
    background-color: #12161c;
  }
}

.dark-theme .side-bar i:hover {
  border-radius: 6px;
  background-color: #21262d;
  color: var(--accent-color, #5e6ef2);
}

.dark-theme .side-bar i:active {
  background-color: #2e353d;
}
</style>
