<template>
  <input class="hidden-input-for-focus" type="text" />
  <div v-show="compatible" id="app-container" class="app-container"
    :class="{ 'dark-theme': darkTheme, 'density-compact': uiDensity === 'compact', 'perf-mode': performanceMode, 'typing-active': typingActive }"
    :style="{ '--accent-color': accentColor, '--app-font-family': fontFamilyCss }">
    <div
      v-if="meshBackgroundEnabled"
      class="mesh-bg"
      :class="'time-' + timeTint"
      :style="{ '--lattice-mask': todayLattice.mask, '--lattice-size': todayLattice.size }"
      aria-hidden="true"
    >
      <span class="mesh-blob blob-1"></span>
      <span class="mesh-blob blob-2"></span>
      <span class="mesh-blob blob-3"></span>
    </div>
    <div class="hidden-mobile app-body" :style="{ zoom: `${zoom}%` }">
      <splash-screen ref="splash"></splash-screen>
      <side-bar @change-date="setSelectedDate"></side-bar>

      <div class="app-main-column">
        <app-toolbar :scroll-progress="scrollProgress"></app-toolbar>
        <day-greeting v-if="todayOnlyMode && showCalendar" :scroll-progress="scrollProgress"></day-greeting>
        <week-strip v-if="todayOnlyMode && showCalendar" :selected-date="selected_date" @select-date="setSelectedDate"></week-strip>
        <tag-filter-bar v-if="todayOnlyMode && showCustomList"></tag-filter-bar>
        <div class="h-100 d-flex"
          ref="mainScrollArea"
          @scroll="onMainScroll"
          :class="{ 'flex-column': !todayOnlyMode, 'today-only-layout': todayOnlyMode, 'compact-cards': todayOnlyMode && compactProjectCards }"
          :style="{ '--card-width': projectCardWidth + 'px' }">
        <div
          v-show="showCalendar"
          class="todo-lists-container"
          :style="resizableStyle"
          ref="calendarContainer"
          :class="{
            'full-screen': !showCustomList,
            'hidden-lists-container': hideTopListContainer,
            'full-screen-divider': hideBottomListContainer,
            'today-only': todayOnlyMode,
          }"
        >
          <i v-show="!todayOnlyMode" class="ph ph-caret-left slider-btn" ref="weekLeft" @click="weekMoveLeft"></i>
          <div class="todo-slider weekdays" ref="weekListContainer">
            <to-do-list
              v-for="date in visibleDates"
              :key="date"
              :id="date"
              :showCustomList="showCustomList"
              :forceFullWidth="todayOnlyMode"
              @todo-list-mounted="todoListMounted"
            >
            </to-do-list>
          </div>
          <i v-show="!todayOnlyMode" class="ph ph-caret-right slider-btn" ref="weekRight" @click="weekMoveRight"></i>
        </div>

        <div
          v-show="showCustomList && showCalendar && !todayOnlyMode"
          class="main-horizontal-divider"
          id="resizer"
          :class="mainDividerPositionClass"
          @mousedown="resizerMouseDownHandler"
          @dblclick="resizerDblClick"
        >
          <div class="inner-main-horizontal-divider"></div>
          <div class="divider-icons-container">
            <i
              class="ph ph-caret-up move-to-center-up divider-icons"
              @click="setDividerPosition(1)"
              :title="$t('ui.restorePanel')"
            ></i>
            <i
              class="ph ph-caret-up move-to-corner-up divider-icons"
              @click="setDividerPosition(2)"
              :title="$t('ui.maximizeListPanel')"
            ></i>
            <i
              class="ph ph-caret-down move-to-center-down divider-icons"
              @click="setDividerPosition(1)"
              :title="$t('ui.restorePanel')"
            ></i>
            <i
              class="ph ph-caret-down move-to-corner-down divider-icons"
              @click="setDividerPosition(0)"
              :title="$t('ui.maximizeCalendarPanel')"
            ></i>
          </div>
        </div>

        <div
          v-show="showCustomList"
          class="todo-lists-container"
          :class="{
            'full-screen': !showCalendar,
            'flex-grow-1': showCalendar,
            'hidden-lists-container': hideBottomListContainer,
          }"
        >
          <i
            v-show="!todayOnlyMode"
            class="ph ph-caret-left slider-btn"
            @click="customMoveLeft"
            :style="{
              visibility: cTodoList.length > customColumns ? 'visible' : 'hidden',
            }"
          ></i>
          <div class="todo-slider slides" ref="customListContainer">
            <to-do-list
              v-for="entry in visibleCTodoList"
              :key="entry.list.listId"
              :id="entry.list.listId"
              :customTodoList="true"
              :cTodoListIndex="entry.index"
              :showCustomList="showCustomList"
              @todo-list-mounted="todoListMounted"
            ></to-do-list>
          </div>
          <i
            v-show="!todayOnlyMode"
            class="ph ph-caret-right slider-btn"
            @click="customMoveRight"
            :style="{
              visibility: cTodoList.length > customColumns ? 'visible' : 'hidden',
            }"
          ></i>
        </div>

        <div v-if="todayOnlyMode && archivedCount" class="archived-toggle-link" @click="showArchived = !showArchived">
          <i :class="showArchived ? 'ph ph-eye-slash' : 'ph ph-archive'"></i>
          {{ showArchived ? $t('ui.hideArchived') : $t('ui.showArchived', [archivedCount]) }}
        </div>

        <div v-show="!showCustomList && !showCalendar" class="all-hidden-placeholder">
          <i class="ph ph-eye-slash"></i>
          <strong>{{ $t('ui.allViewsHidden') }}</strong>
          <span>{{ $t('ui.allViewsHiddenHint') }}</span>
        </div>
        </div>
      </div>

      <remove-custom-list></remove-custom-list>
      <config-modal @change-columns="weekResetScroll" :configProp="$store.getters.config"></config-modal>
      <clear-data-modal></clear-data-modal>
      <clear-list-modal></clear-list-modal>
      <about-modal></about-modal>
      <welcome-modal></welcome-modal>
      <tips-modal></tips-modal>
      <to-do-modal :selectedTodo="selectedTodo"></to-do-modal>
      <active-to-do :activeTodo="activeTodo"> </active-to-do>
      <recurrent-events-modal></recurrent-events-modal>
      <importing-modal :id="'importingModal'" :text="$t('settings.importing')"></importing-modal>
      <importing-modal :id="'exportingModal'" :text="$t('settings.exporting')"></importing-modal>

      <reorder-custom-lists-modal @reset-custom-list="resetCustomList"></reorder-custom-lists-modal>
      <deadlines-modal></deadlines-modal>
      <search-modal></search-modal>
      <shortcuts-modal></shortcuts-modal>
      <new-list-template-modal></new-list-template-modal>
      <edit-templates-modal></edit-templates-modal>
      <zeolite-info-modal></zeolite-info-modal>
      <deadline-radar-modal></deadline-radar-modal>
      <focus-mode></focus-mode>
      <paste-queue-modal :target-list-id="$store.getters.pasteQueueTarget"></paste-queue-modal>
      <mission-control-modal></mission-control-modal>
      <weekly-summary-modal></weekly-summary-modal>
      <daily-summary-modal></daily-summary-modal>
    </div>
    <div class="mobile d-flex flex-column justify-content-center align-items-center">
      <i class="bi-exclamation-diamond mb-4" style="font-size: 100px"></i>
      <h3 style="text-align: center">{{ $t("ui.mobileWarning") }}</h3>
    </div>

    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 1056">
      <toast-message
        id="deadlinesSoonToast"
        :text="deadlinesSoonText"
        :sub-text="'(' + $t('ui.deadlines') + ')'"
        @subTextClick="openDeadlinesModal"
      ></toast-message>
    </div>
  </div>
  <div v-if="!compatible" class="compatible d-flex flex-column justify-content-center align-items-center p-5">
    <i class="bi-exclamation-diamond mb-4" style="font-size: 100px"></i>
    <h3 style="text-align: center">{{ $t("ui.compatible") }}</h3>
  </div>
</template>

<script>
import toDoList from "./components/toDoList";
import moment from "moment";
import sideBar from "./components/layout/sideBar";
import customToDoListIdsRepository from "./repositories/customToDoListIdsRepository";
import removeCustomList from "./components/comfirmModals/removeCustomList";
import configModal from "./views/configModal";
import splashScreen from "./components/splashScreen";
import configRepository from "./repositories/configRepository";
import aboutModal from "./views/aboutModal";
import welcomeModal from "./views/welcomeModal";
import toDoModal from "./views/toDoModal/toDoModal";
import tipsModal from "./views/tipsModal";
import { Modal, Toast } from "bootstrap";
import migrations from "./migrations/migrations";
import version_json from "../public/version.json";
import isElectron from "is-electron";
import taskHelper from "./helpers/tasksHelper";
import notifications from "./helpers/notifications";
import clearDataModal from "./components/comfirmModals/clearDataModal.vue";
import clearListModal from "./components/comfirmModals/clearListModal.vue";
import importingModal from "./views/importingModal.vue";
import RecurrentEventsModal from "./views/RecurrentEventsModal.vue";
import repeatingEventRepository from "./repositories/repeatingEventRepository";
import toDoListRepository from "./repositories/toDoListRepository";
import ReorderCustomListsModal from "./views/ReorderCustomListsModal.vue";
import toastMessage from "./components/toastMessage";
import activeToDo from "./components/activeToDo.vue";
import deadlinesModal from "./views/deadlinesModal.vue";
import searchModal from "./views/searchModal.vue";
import shortcutsModal from "./views/shortcutsModal.vue";
import newListTemplateModal from "./views/newListTemplateModal.vue";
import editTemplatesModal from "./views/editTemplatesModal.vue";
import zeoliteInfoModal from "./views/zeoliteInfoModal.vue";
import deadlineRadarModal from "./views/deadlineRadarModal.vue";
import tagFilterBar from "./components/tagFilterBar.vue";
import weekStrip from "./components/weekStrip.vue";
import tasksHelper from "./helpers/tasksHelper";
import deadlinesHelper from "./helpers/deadlinesHelper";
import exportTool from "./helpers/exportTool";
import fontHelper from "./helpers/fontHelper";
import faviconHelper from "./helpers/faviconHelper";
import focusMode from "./components/focusMode.vue";
import dayGreeting from "./components/dayGreeting.vue";
import pasteQueueModal from "./views/pasteQueueModal.vue";
import missionControlModal from "./components/missionControlModal.vue";
import weeklySummaryModal from "./components/weeklySummaryModal.vue";
import dailySummaryModal from "./components/dailySummaryModal.vue";
import appToolbar from "./components/layout/appToolbar.vue";
import zeoliteHelper from "./helpers/zeoliteHelper";

export default {
  name: "App",
  components: {
    configModal,
    toDoList,
    sideBar,
    appToolbar,
    removeCustomList,
    splashScreen,
    aboutModal,
    welcomeModal,
    tipsModal,
    toDoModal,
    clearDataModal,
    RecurrentEventsModal,
    importingModal,
    ReorderCustomListsModal,
    clearListModal,
    toastMessage,
    activeToDo,
    deadlinesModal,
    searchModal,
    shortcutsModal,
    newListTemplateModal,
    editTemplatesModal,
    zeoliteInfoModal,
    deadlineRadarModal,
    tagFilterBar,
    weekStrip,
    focusMode,
    dayGreeting,
    pasteQueueModal,
    missionControlModal,
    weeklySummaryModal,
    dailySummaryModal,
  },
  data() {
    return {
      selected_date: null,
      cTodoList: this.$store.getters.cTodoListIds,
      calendarHeight: "calc(50% - 50px)",
      ipcRenderer: null,
      initialLoadCompleted: false,
      initialListToLoad: 0,
      initialListLoaded: 0,
      showArchived: false,
      deadlinesSoonText: "",
      backupCheckInterval: null,
      nowHour: moment().hour(),
      timeTintInterval: null,
      scrollProgress: 0,
      typingActive: false,
      typingIdleTimer: null,
    };
  },
  beforeCreate() {
    let config = configRepository.load();
    if (version_json.version != config.version) {
      migrations.migrate();
    }

    if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
    this.$store.commit("loadCustomTodoListsIds", customToDoListIdsRepository.load());
    this.$store.commit("loadConfig", configRepository.load());
    this.$i18n.locale = this.$store.getters.config.language;

    this.$store.dispatch("loadAllRepeatingEvent").then(
      function () {
        let totalDaysCount = parseInt(this.$store.getters.config.columns) + 2;
        let totalCustomListCount = this.$store.getters.cTodoListIds.length;
        this.initialListToLoad = totalDaysCount + totalCustomListCount;
        this.deleteOldRepeatingEvents();
        this.selected_date = moment().format("YYYYMMDD");
        this.$nextTick(() => {
          this.weekResetScroll();
        });
        this.$store.commit("loadRepeatingEventDateCache", this.$store.getters.repeatingEventList);
      }.bind(this)
    );
  },
  mounted() {
    this.$refs.weekListContainer.scrollLeft = this.todoListWidth();
    this.calendarHeight = this.$store.getters.config.calendarHeight;
    window.addEventListener("resize", this.weekResetScroll);
    window.addEventListener("keydown", this.handleGlobalKeydown);
    // Perf: pause the mesh-blob drift while the user is actively typing
    // anywhere in the app, so the compositor isn't re-blending 3 blurred
    // layers on top of every keystroke's repaint. Resumes after a short
    // idle window. Capture-phase "input" catches every text/textarea field
    // without wiring each component individually.
    document.addEventListener("input", this.markTypingActive, true);
    document.onreadystatechange = () => {
      if (document.readyState == "complete") {
        setTimeout(this.hideSplash, 4500);
      }
    };

    if (isElectron()) {
      const { ipcRenderer } = require("electron");
      this.ipcRenderer = ipcRenderer;
      if (this.$store.getters.config.firstTimeOpen) this.ipcRenderer.send("show-current-window");
      this.ipcRenderer.send("match-open-on-startup", this.$store.getters.config.openOnStartup);
    }

    if (this.$store.getters.config.importing) {
      this.$store.commit("updateConfig", { val: false, key: "importing" });
      configRepository.update(this.$store.getters.config);
      if (isElectron()) {
        this.syncElectronConfig();
      }
    }

    this.resetAppOnDayChange();
    this.maybeAutoLoadBackup();
    this.initBackupScheduler();
    this.maybeShowWeeklySummary();
    this.maybeShowDailySummary();
    this.maybeClearPastTalk();
    this.timeTintInterval = setInterval(() => {
      this.nowHour = moment().hour();
    }, 10 * 60 * 1000);
  },
  unmounted() {
    clearInterval(this.timeTintInterval);
    clearTimeout(this.typingIdleTimer);
    document.removeEventListener("input", this.markTypingActive, true);
  },
  methods: {
    // See mounted(): pauses the mesh-blob animation while typing, resumes
    // ~450ms after the last keystroke anywhere in the app.
    markTypingActive: function () {
      if (!this.typingActive) this.typingActive = true;
      clearTimeout(this.typingIdleTimer);
      this.typingIdleTimer = setTimeout(() => {
        this.typingActive = false;
      }, 450);
    },
    // Drives the collapsing "large title" (day greeting) and the toolbar's
    // compact-title crossfade. Only meaningful in todayOnlyMode, where this
    // element is the app's real scroll container; in the classic week-grid
    // layout each column scrolls independently and this stays untouched.
    onMainScroll: function (e) {
      if (!this.todayOnlyMode) return;
      this.scrollProgress = Math.min(1, e.target.scrollTop / 70);
    },
    maybeAutoLoadBackup: function () {
      if (!isElectron()) return;
      if (!this.$store.getters.config.autoLoadLatestBackup) return;
      if (!this.$store.getters.config.backupFolderPath) return;
      if (sessionStorage.getItem("wtd-autoloaded")) return;
      sessionStorage.setItem("wtd-autoloaded", "1");
      exportTool.importLatestFromPath(this.$store.getters.config.backupFolderPath);
    },
    initBackupScheduler: function () {
      if (!isElectron()) return;
      this.backupCheckInterval = setInterval(this.maybeRunDailyBackup, 60 * 1000);
      this.maybeRunDailyBackup();
    },
    maybeRunDailyBackup: function () {
      if (!this.$store.getters.config.backupEnabled) return;
      if (!this.$store.getters.config.backupFolderPath) return;
      let today = moment().format("YYYY-MM-DD");
      if (this.$store.getters.config.lastBackupDate === today) return;
      if (moment().hour() < 14) return;
      exportTool.exportToPath(this.$store.getters.config.backupFolderPath);
      this.$store.commit("updateConfig", { val: today, key: "lastBackupDate" });
      configRepository.update(this.$store.getters.config);
    },
    maybeShowWeeklySummary: function () {
      // Friday only, once per day, and only once the welcome wizard is done.
      if (this.$store.getters.config.firstTimeOpen) return;
      if (moment().isoWeekday() !== 5) return;
      let today = moment().format("YYYY-MM-DD");
      if (this.$store.getters.config.lastWeeklySummaryShownDate === today) return;
      this.$store.commit("updateConfig", { val: today, key: "lastWeeklySummaryShownDate" });
      configRepository.update(this.$store.getters.config);
      setTimeout(() => {
        if (document.querySelector(".modal.show")) return;
        new Modal(document.getElementById("weeklySummaryModal")).show();
      }, 5200);
    },
    maybeClearPastTalk: function () {
      // The sidebar countdown badge auto-clears once the talk date has
      // passed, so a stale conference doesn't linger in the sidebar.
      let d = this.$store.getters.config.nextTalkDate;
      if (!d) return;
      if (moment(d).startOf("day").isBefore(moment().startOf("day"))) {
        this.$store.commit("updateConfig", { val: "", key: "nextTalkTitle" });
        this.$store.commit("updateConfig", { val: "", key: "nextTalkDate" });
        configRepository.update(this.$store.getters.config);
      }
    },
    maybeShowDailySummary: function () {
      // "Al cerrar el dia": once per day, only from late afternoon onwards
      // (not on morning opens, which wouldn't have a day to summarize yet),
      // and only once the welcome wizard is done.
      if (this.$store.getters.config.firstTimeOpen) return;
      if (moment().hour() < 17) return;
      let today = moment().format("YYYY-MM-DD");
      if (this.$store.getters.config.lastDailySummaryShownDate === today) return;
      this.$store.commit("updateConfig", { val: today, key: "lastDailySummaryShownDate" });
      configRepository.update(this.$store.getters.config);
      setTimeout(() => {
        if (document.querySelector(".modal.show")) return;
        new Modal(document.getElementById("dailySummaryModal")).show();
      }, 5200);
    },
    weekMoveLeft: function () {
      this.selected_date = moment(this.selected_date).subtract(1, "d").format("YYYYMMDD");
      this.$refs.weekListContainer.scrollLeft = this.todoListWidth() * 2;
      this.$refs.weekListContainer.scroll({
        left: this.$refs.weekListContainer.scrollLeft - this.todoListWidth(),
        top: 0,
        behavior: "smooth",
      });
    },
    weekMoveRight: function () {
      this.selected_date = moment(this.selected_date).add(1, "d").format("YYYYMMDD");
      this.$refs.weekListContainer.scrollLeft = 0;
      this.$refs.weekListContainer.scroll({
        left: this.$refs.weekListContainer.scrollLeft + this.todoListWidth(),
        top: 0,
        behavior: "smooth",
      });
    },
    deleteOldRepeatingEvents: function () {
      for (const event of Object.entries(this.$store.getters.repeatingEventList)) {
        if (moment(event[1].end_date).isBefore(moment())) {
          repeatingEventRepository.remove(event[0]);
          this.$store.commit("removeRepeatingEvent", event[0]);
        }
      }
    },
    weekResetScroll: function () {
      this.$refs.weekListContainer.scrollLeft = this.todoListWidth();
    },
    customMoveRight: function () {
      this.$refs.customListContainer.scrollLeft =
        this.$refs.customListContainer.scrollLeft + this.customTodoListWidth() - 13;
    },
    customMoveLeft: function () {
      this.$refs.customListContainer.scrollLeft = this.$refs.customListContainer.scrollLeft - this.customTodoListWidth();
    },
    resetCustomList: function () {
      this.$nextTick(function () {
        this.$refs.customListContainer.scrollLeft = 0;
      });
    },
    todoListWidth: function () {
      return this.$refs.weekListContainer.clientWidth / this.columns;
    },
    customTodoListWidth: function () {
      return this.$refs.customListContainer.clientWidth / this.customColumns;
    },
    handleGlobalKeydown: function (event) {
      let target = event.target;
      let typing =
        target &&
        (target.tagName == "INPUT" ||
          target.tagName == "TEXTAREA" ||
          target.tagName == "SELECT" ||
          target.isContentEditable);

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && (event.key == "k" || event.key == "K")) {
        if (document.querySelector(".modal.show")) return;
        event.preventDefault();
        new Modal(document.getElementById("searchModal")).show();
        return;
      }

      if (typing) return;
      if (document.querySelector(".modal.show")) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      switch (event.key) {
        case "n":
        case "N":
          event.preventDefault();
          this.setSelectedDate(this.selected_date);
          break;
        case "t":
        case "T":
          event.preventDefault();
          this.selected_date = moment().format("YYYYMMDD");
          this.$nextTick(() => {
            this.weekResetScroll();
          });
          break;
        case "ArrowLeft":
          event.preventDefault();
          this.weekMoveLeft();
          break;
        case "ArrowRight":
          event.preventDefault();
          this.weekMoveRight();
          break;
        case "/":
          event.preventDefault();
          new Modal(document.getElementById("searchModal")).show();
          break;
        case "d":
        case "D":
          event.preventDefault();
          new Modal(document.getElementById("deadlinesModal")).show();
          break;
        case "?":
          event.preventDefault();
          new Modal(document.getElementById("shortcutsModal")).show();
          break;
      }
    },
    setSelectedDate: function (date) {
      this.selected_date = date;
      this.$nextTick(function () {
        document
          .getElementById("list" + date)
          .getElementsByClassName("new-todo-input")[0]
          .focus();
      });
    },
    isElectron: function () {
      let isElectron = require("is-electron");
      return isElectron();
    },
    hideSplash: function () {
      if (this.isElectron()) {
        if (this.ipcRenderer.sendSync("is-windows-visible")) {
          this.$refs.splash.hideSplash();
        }
      } else {
        this.$refs.splash.hideSplash();
      }
      this.checksOnLoadApp();
      if (this.$store.getters.config.firstTimeOpen) {
        this.showWelcomeModal();
      }
    },
    showWelcomeModal: function () {
      let modal = new Modal(document.getElementById("welcomeModal"), {
        backdrop: "static",
      });
      modal.show();
      this.$store.commit("updateConfig", { val: false, key: "firstTimeOpen" });
      configRepository.update(this.$store.getters.config);
    },
    compatible: function () {
      return window.IndexedDB;
    },
    resizerDblClick: function () {
      if (this.$store.getters.config.mainDividerPosition != 1) return;

      this.calendarHeight = "calc(50% - 50px)";
      this.$store.commit("updateConfig", {
        val: this.calendarHeight,
        key: "calendarHeight",
      });
      configRepository.update(this.$store.getters.config);
    },
    resizerMouseDownHandler: function (e) {
      if (this.$store.getters.config.mainDividerPosition != 1) return;

      this.resizerY = e.clientY - 50;
      document.addEventListener("mousemove", this.resizerMouseMoveHandler);
      document.addEventListener("mouseup", this.resizerMouseUpHandler);
    },
    resizerMouseMoveHandler: function (e) {
      this.calendarHeight = `${((e.clientY - 50) * 100) / this.zoom}px`;
    },
    resizerMouseUpHandler: function () {
      document.removeEventListener("mousemove", this.resizerMouseMoveHandler);
      document.removeEventListener("mouseup", this.resizerMouseUpHandler);
      this.$store.commit("updateConfig", {
        val: this.calendarHeight,
        key: "calendarHeight",
      });
      configRepository.update(this.$store.getters.config);
    },
    refreshTodayNotifications: function () {
      notifications.refreshDayNotifications(this, moment().format("YYYYMMDD"));
    },
    checkDeadlinesSoon: function () {
      deadlinesHelper.getTasksWithDeadline().then((tasks) => {
        let soonLimit = moment().add(2, "d").format("YYYYMMDD");
        let count = tasks.filter((t) => t.deadline <= soonLimit).length;
        if (count > 0) {
          this.deadlinesSoonText = this.$t("ui.deadlinesSoonToast", [count]);
          this.$nextTick(() => {
            new Toast(document.getElementById("deadlinesSoonToast")).show();
          });
        }
      });
    },
    openDeadlinesModal: function () {
      new Modal(document.getElementById("deadlinesModal")).show();
    },
    todoListMounted: function () {
      this.methodsAfterInitialLoad();
    },
    methodsAfterInitialLoad: function () {
      if (!this.initialLoadCompleted) {
        this.initialListLoaded++;
        if (this.initialListLoaded == this.initialListToLoad) {
          this.initialLoadCompleted = true;
          if (this.$store.getters.config.moveOldTasks) {
            this.moveOldTasksToToday().then(() => {
              this.refreshTodayNotifications();
              this.$store.commit("updateConfig", { val: moment().format("YYYYMMDD"), key: "lastDayOpened" });
              configRepository.update(this.$store.getters.config);
              if (isElectron()) this.showInitialNotification();
              this.checkDeadlinesSoon();
            });
          } else {
            this.refreshTodayNotifications();
            if (isElectron()) this.showInitialNotification();
            this.$store.commit("updateConfig", { val: moment().format("YYYYMMDD"), key: "lastDayOpened" });
            configRepository.update(this.$store.getters.config);
            this.checkDeadlinesSoon();
          }
        }
      }
    },
    showInitialNotification: function () {
      if (!(this.$store.getters.config.notificationOnStartup && !this.$store.getters.config.firstTimeOpen)) return;
      setTimeout(
        function () {
          new Notification("ITQ Todo", {
            body: this.initialNotificationText(),
            icon: "/favicon.ico",
            silent: true,
          }).onclick = () => {
            this.ipcRenderer.send("show-current-window");
            setTimeout(() => {
              if (document.getElementById("splashScreen")) {
                document.getElementById("splashScreen").classList.add("hiddenSplashScreen");
              }
            }, 3000);
          };
          notifications.playNotificationSound(this.$store.getters.config.notificationSound);
        }.bind(this),
        2000
      );
    },
    initialNotificationText: function () {
      let yesterdayTasks = this.$store.getters.todoLists[moment().subtract(1, "d").format("YYYYMMDD")];
      let todayTasks = this.$store.getters.todoLists[moment().format("YYYYMMDD")];

      let yesterayPendingTasksCount = taskHelper.pendingTasksCount(yesterdayTasks);
      let todayPendingTasksCount = taskHelper.pendingTasksCount(todayTasks);

      if (yesterayPendingTasksCount == 0 && todayPendingTasksCount == 0) {
        return this.$t("notifications.noPendingTasksToday");
      } else if (yesterayPendingTasksCount == 0) {
        return this.$t("notifications.pendingTasksToday", [todayPendingTasksCount]);
      } else if (todayPendingTasksCount == 0) {
        return this.$t("notifications.pendingTasksYesterday", [yesterayPendingTasksCount]);
      } else {
        return this.$t("notifications.pendingTasksYesterdayAndToday", [yesterayPendingTasksCount, todayPendingTasksCount]);
      }
    },
    resetAppOnDayChange: function () {
      var x = new moment();
      var y = new moment().add(1, "d").startOf("date");
      var duration = moment.duration(y.diff(x)).asMilliseconds();

      setTimeout(
        function () {
          if (isElectron() && !this.ipcRenderer.sendSync("is-windows-visible")) {
            window.location.reload();
          }
          this.refreshTodayNotifications();
          this.resetAppOnDayChange();
        }.bind(this),
        duration
      );
    },
    moveOldTasksToToday: async function () {
      var promise = new Promise((resolve) => {
        var todayListId = moment().format("YYYYMMDD");
        let daysBefore = moment().diff(moment(this.$store.getters.config.lastDayOpened), "days");
        if (daysBefore == 0) daysBefore = 7;
        for (let i = 1; i <= daysBefore; i++) {
          let listId = moment().subtract(i, "d").format("YYYYMMDD");
          this.$store.dispatch("loadTodoLists", listId).then(() => {
            this.$store.commit("moveUndoneItems", { origenId: listId, destinyId: todayListId });
            toDoListRepository.update(listId, this.$store.getters.todoLists[listId]);
            if (this.$store.getters.config.autoReorderTasks) {
              toDoListRepository.update(
                todayListId,
                tasksHelper.reorderTasksList(this.$store.getters.todoLists[todayListId])
              );
            } else {
              toDoListRepository.update(todayListId, this.$store.getters.todoLists[todayListId]);
            }
            if (i == daysBefore) {
              resolve("done!");
            }
          });
        }
      });
      return promise;
    },
    setDividerPosition: function (position) {
      this.$nextTick(function () {
        document.getElementById("app-container").classList.add("scrolling");
        setTimeout(() => {
          document.getElementById("app-container").classList.remove("scrolling");
        }, 400);
        this.$store.commit("updateConfig", { val: position, key: "mainDividerPosition" });
        configRepository.update(this.$store.getters.config);
      });
    },
    checkVersion: function () {
      if (version_json.version != this.$store.getters.config.version) {
        this.$store.commit("updateConfig", { val: version_json.version, key: "version" });
        configRepository.update(this.$store.getters.config);
      }
    },
    checksOnLoadApp: function () {
      if (this.isElectron()) {
        require("electron").ipcRenderer.on("initial-checks", () => {
          this.checkVersion();
        });
      } else {
        this.checkVersion();
      }
    },
    syncElectronConfig: function () {
      const { ipcRenderer } = require("electron");
      ipcRenderer.send("set-tray-context-menu-label", { open: this.$t("ui.open"), quit: this.$t("ui.quit") });
      ipcRenderer.send("set-open-on-startup", this.$store.getters.config.openOnStartup);
      ipcRenderer.send("set-run-in-background", this.$store.getters.config.runInBackground);
      ipcRenderer.send("set-dark-tray-icon", this.$store.getters.config.darkTrayIcon);
    },
  },
  watch: {
    fontFamilyKey: {
      immediate: true,
      handler: function (val) {
        fontHelper.applyLink(val);
      },
    },
    accentColor: {
      immediate: true,
      handler: function (val) {
        faviconHelper.apply(val);
      },
    },
  },
  computed: {
    dates_array: function () {
      if (!this.selected_date) return [];
      var dates_array = [moment(this.selected_date).subtract(1, "d").format("YYYYMMDD"), this.selected_date];

      for (let i = 1; i < this.columns; i++) {
        dates_array.push(moment(this.selected_date).add(i, "d").format("YYYYMMDD"));
      }

      if (this.$store.getters.config.startCalendarYesterday) {
        dates_array.unshift(moment(this.selected_date).subtract(2, "d").format("YYYYMMDD"));
      } else {
        dates_array.push(moment(this.selected_date).add(this.columns, "d").format("YYYYMMDD"));
      }

      this.$store.commit("updateSelectedDates", dates_array);
      return dates_array;
    },
    todayOnlyMode: function () {
      // Missing key (older/legacy config) defaults to true, matching the
      // new compact-by-default layout without needing a fresh migration.
      return this.$store.getters.config.todayOnlyMode !== false;
    },
    visibleDates: function () {
      if (this.todayOnlyMode) return this.selected_date ? [this.selected_date] : [];
      return this.dates_array;
    },
    visibleCTodoList: function () {
      return this.cTodoList
        .map((list, index) => ({ list: list, index: index }))
        .filter((entry) => this.showArchived || !entry.list.archived);
    },
    archivedCount: function () {
      return this.cTodoList.filter((l) => l.archived).length;
    },
    compactProjectCards: function () {
      return !!this.$store.getters.config.compactProjectCards;
    },
    projectCardWidth: function () {
      return this.$store.getters.config.projectCardWidth || 320;
    },
    accentColor: function () {
      return this.$store.getters.config.accentColor || "#5e6ef2";
    },
    fontFamilyKey: function () {
      return this.$store.getters.config.fontFamily || "";
    },
    fontFamilyCss: function () {
      return fontHelper.cssFor(this.fontFamilyKey);
    },
    uiDensity: function () {
      return this.$store.getters.config.uiDensity || "comfortable";
    },
    meshBackgroundEnabled: function () {
      // Missing key (older config) defaults to true, matching the existing
      // animated background without needing a fresh migration. Performance
      // mode force-disables it (it's the heaviest thing to composite).
      return this.$store.getters.config.meshBackgroundEnabled !== false && !this.performanceMode;
    },
    performanceMode: function () {
      return this.$store.getters.config.performanceMode === true;
    },
    todayLattice: function () {
      return zeoliteHelper.getTodayLattice();
    },
    timeTint: function () {
      let h = this.nowHour;
      if (h >= 6 && h < 11) return "morning";
      if (h >= 11 && h < 18) return "day";
      if (h >= 18 && h < 22) return "evening";
      return "night";
    },
    showCustomList: function () {
      return this.$store.getters.config.customList;
    },
    showCalendar: function () {
      return this.$store.getters.config.calendar;
    },
    columns: function () {
      return this.$store.getters.config.columns;
    },
    customColumns: function () {
      return this.$store.getters.config.customColumns;
    },
    zoom: function () {
      return this.$store.getters.config.zoom;
    },
    darkTheme: function () {
      return this.$store.getters.config.darkTheme;
    },
    resizableStyle: function () {
      if (this.showCalendar && this.showCustomList) {
        return { height: this.calendarHeight };
      } else {
        return {};
      }
    },
    selectedTodo: function () {
      if (this.$store.getters.actions.selectedTodo) {
        return this.$store.getters.actions.selectedTodo;
      }
      return null;
    },
    activeTodo: function () {
      if (this.$store.getters.activeTodo) {
        return this.$store.getters.activeTodo;
      }
      return null;
    },
    mainDividerPositionClass: function () {
      if (this.$store.getters.config.mainDividerPosition == 0) {
        return "on-bottom";
      } else if (this.$store.getters.config.mainDividerPosition == 1) {
        return "on-center";
      } else {
        return "on-top";
      }
    },
    hideTopListContainer: function () {
      if (!this.$store.getters.config.customList || !this.$store.getters.config.calendar) return false;

      return this.$store.getters.config.mainDividerPosition == 2 ? true : false;
    },
    hideBottomListContainer: function () {
      if (!this.$store.getters.config.customList || !this.$store.getters.config.calendar) return false;

      return this.$store.getters.config.mainDividerPosition == 0 ? true : false;
    },
  },
};
</script>

<style lang="scss">
@import "/src/assets/style/globalVars.scss";

body {
  line-height: unset !important;
}

:root {
  --fs-title: 21px;
  --fs-subtitle: 12px;
  --fs-body: 0.865rem;
  --fs-badge: 0.72rem;
  --fw-title: 600;
  /* Spring-flavoured easing for discrete, physical-feeling transitions
     (toggles, pills, hover pops) - has real overshoot, unlike the
     ease-out curve used for entrances/fades elsewhere in the app. */
  --spring-ease: cubic-bezier(0.34, 1.56, 0.64, 1);
}

.app-main-column {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.app-main-column > .h-100.d-flex {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}

#app-container {
  font-family: var(--app-font-family, inherit);
}

#app-container:not(.dark-theme) {
  background-color: #f4f5f7;
}

.dark-theme#app-container,
#app-container.dark-theme {
  background-color: #0d1117;
}

/* ---- Mesh gradient background (ambient, time-of-day tinted) ---- */

.mesh-bg {
  position: fixed;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
  /* Isolates this layer from the rest of the page's layout/paint so typing
     or scrolling in the todo list can't force the browser to reconsider
     the blurred blobs on every keystroke. */
  contain: layout paint;
  isolation: isolate;
}

/* Faint hexagonal lattice, a nod to the zeolite crystal structures behind
   the research this app is built for - sits under the mesh blobs. A real
   hexagon-outline tile masked and tinted with the accent color, so it reads
   as an actual honeycomb instead of a busy dot pattern. */
.mesh-bg::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background-color: var(--accent-color, #5e6ef2);
  /* Zeolita del dia: the lattice mask/size come from CSS custom properties
     set per-day (see todayLattice in App.vue), falling back to the MFI
     honeycomb tile if the variables aren't set for any reason. */
  -webkit-mask-image: var(
    --lattice-mask,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.1'%3E%3Cpath d='M13.99 0L27 7.5v15l-13.01 7.5L1 22.5v-15z'/%3E%3Cpath d='M13.99 49L27 41.5v-15l-13.01-7.5L1 26.5v15z'/%3E%3C/g%3E%3C/svg%3E")
  );
  mask-image: var(
    --lattice-mask,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.1'%3E%3Cpath d='M13.99 0L27 7.5v15l-13.01 7.5L1 22.5v-15z'/%3E%3Cpath d='M13.99 49L27 41.5v-15l-13.01-7.5L1 26.5v15z'/%3E%3C/g%3E%3C/svg%3E")
  );
  -webkit-mask-size: var(--lattice-size, 28px 49px);
  mask-size: var(--lattice-size, 28px 49px);
  -webkit-mask-repeat: repeat;
  mask-repeat: repeat;
  transition: opacity 0.4s ease;
}

.dark-theme .mesh-bg::before {
  opacity: 0.16;
}

.mesh-blob {
  position: absolute;
  border-radius: 50%;
  /* Radial falloff bakes the soft edge into the gradient itself instead of
     relying purely on a heavy blur radius to fake it - looks about as soft
     at a third of the blur cost. */
  background: radial-gradient(circle at 50% 50%, var(--accent-color, #5e6ef2) 0%, transparent 72%);
  opacity: 0.26;
  will-change: transform;
  contain: strict;
}

.blob-1 {
  width: 48vw;
  height: 48vw;
  top: -14vw;
  left: -10vw;
  filter: blur(34px);
  animation: meshDrift1 48s ease-in-out infinite alternate;
}

.blob-2 {
  width: 40vw;
  height: 40vw;
  bottom: -12vw;
  right: -8vw;
  filter: blur(36px) hue-rotate(46deg);
  animation: meshDrift2 60s ease-in-out infinite alternate;
}

.blob-3 {
  width: 30vw;
  height: 30vw;
  top: 32vh;
  right: 16vw;
  filter: blur(30px) hue-rotate(-42deg);
  opacity: 0.18;
  animation: meshDrift3 68s ease-in-out infinite alternate;
}

.typing-active .mesh-blob {
  animation-play-state: paused;
}

.dark-theme .mesh-blob {
  opacity: 0.15;
}

.dark-theme .blob-3 {
  opacity: 0.1;
}

/* Translate-only: a pure compositor transform on an already-blurred layer
   is nearly free on any GPU. The previous scale() forced the blurred
   texture to be re-rasterized at a new size on every frame, which is the
   expensive part - dropped here, with a bit more travel distance to keep
   the same sense of drift. */
@keyframes meshDrift1 {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(7vw, 9vh);
  }
}

@keyframes meshDrift2 {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(-9vw, -6vh);
  }
}

@keyframes meshDrift3 {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(-6vw, 7vh);
  }
}

.mesh-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  mix-blend-mode: soft-light;
  opacity: 0.45;
  transition: background 1.2s ease;
}

.mesh-bg.time-morning::after {
  background: radial-gradient(circle at 20% 10%, #ffb37a, transparent 60%);
}

.mesh-bg.time-day::after {
  background: radial-gradient(circle at 50% 0%, #ffffff, transparent 65%);
  opacity: 0.2;
}

.mesh-bg.time-evening::after {
  background: radial-gradient(circle at 80% 20%, #ff8fb1, transparent 60%);
}

.mesh-bg.time-night::after {
  background: radial-gradient(circle at 50% 80%, #2b3a67, transparent 65%);
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  .mesh-blob {
    animation: none !important;
  }
}

/* Shown only when both the calendar and the project lists are switched off
   in Settings: same quiet empty-state language as the list placeholders. */
.all-hidden-placeholder {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #9aa0a8;
  text-align: center;
}

.all-hidden-placeholder i {
  font-size: 2.2rem;
  opacity: 0.7;
}

.all-hidden-placeholder strong {
  font-weight: 600;
  font-size: 0.95rem;
}

.all-hidden-placeholder span {
  font-size: 0.8rem;
}

.dark-theme .all-hidden-placeholder {
  color: #5d646d;
}

.todo-lists-container {
  display: flex;
  overflow: auto;
  min-height: 5px;
  height: 5px;
  transition: height 0.15s ease-out 0s;
  margin-top: 20px;
  margin-bottom: 25px;
  // margin-bottom: 5px;
}

.slider-btn {
  padding: 3px;
  font-size: 2rem;
  align-self: center;
  flex-grow: 0;
  margin-left: 6px;
  margin-right: 6px;
  cursor: pointer;
  transition: 0.4s cubic-bezier(0.2, 1, 0.1, 1);
}

.slider-btn:hover {
  border-radius: 6px;
  background-color: #eaecef;
}

.slider-btn:active {
  background-color: #dddfe2;
}

.v3dp__popout {
  border-radius: 7px !important;
}

.side-bar .v3dp__popout {
  margin-left: 72px;
  margin-top: 0px;
}

.todo-slider {
  flex-grow: 1;
  display: flex;
  overflow-x: hidden;
  min-height: -webkit-fill-available;
  min-height: -moz-available;
  height: fit-content;
}

@-moz-document url-prefix() {
  .todo-slider {
    min-height: -moz-available;
    height: unset;
  }
}

.slides {
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
}

/* ---- Custom scrollbar, tinted with the accent color ---- */

* {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 45%, transparent) transparent;
}

*::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent-color, #5e6ef2) 35%, #c7cad1 65%);
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: content-box;
}

*::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent-color, #5e6ef2) 55%, #c7cad1 45%);
  background-clip: content-box;
}

*::-webkit-scrollbar-thumb:active {
  background: var(--accent-color, #5e6ef2);
  background-clip: content-box;
}

.dark-theme {
  scrollbar-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 55%, transparent) transparent;
}

.dark-theme *::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent-color, #5e6ef2) 40%, #333940 60%);
  background-clip: content-box;
}

.dark-theme *::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent-color, #5e6ef2) 60%, #39484f 40%);
  background-clip: content-box;
}

.dark-theme *::-webkit-scrollbar-thumb:active {
  background: var(--accent-color, #5e6ef2);
  background-clip: content-box;
}

.full-screen {
  height: 100%;
  resize: unset;
}

.today-only-layout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  overflow-y: auto;
  overflow-x: hidden;
  margin-top: 6px;
}

.today-only-layout > .todo-lists-container {
  display: contents;
}

.today-only-layout .todo-slider {
  display: contents;
}

.today-only-layout .to-do-list-container {
  flex: 0 0 var(--card-width, 320px) !important;
  max-width: var(--card-width, 320px);
  margin-top: 0 !important;
  margin-bottom: 20px !important;
  background-color: white;
  /* "Thin" material: previously a live backdrop-filter blur, one per
     visible card. What sits behind a card is only the ambient (fixed,
     slow-drifting) mesh background, never fast-moving foreground content,
     so a live blur bought nothing here beyond cost - this many cards
     blurred at once was the single biggest backdrop-filter cost in the
     app. A flat translucent tint reads the same at a glance and is free. */
  background-color: rgba(255, 255, 255, 0.92);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.today-only-layout .to-do-list-container:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0px);
  }
}

.today-only-layout .to-do-list-container {
  animation: cardEnter 0.38s cubic-bezier(0.2, 1, 0.1, 1) both;
}

@for $i from 1 through 14 {
  .today-only-layout .to-do-list-container:nth-child(#{$i}) {
    animation-delay: #{$i * 0.035}s;
  }
}

.dark-theme .today-only-layout .to-do-list-container {
  background-color: #191d24;
  background-color: rgba(25, 29, 36, 0.9);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark-theme .today-only-layout .to-do-list-container:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
}

.today-only-layout.compact-cards .to-do-list-container {
  padding-left: 10px;
  padding-right: 10px;
}

.today-only-layout.compact-cards .weekly-to-do-header {
  margin-bottom: 12px;
  margin-top: 4px;
}

.today-only-layout.compact-cards .weekly-to-do-header h4 {
  font-size: 16px;
  min-height: unset;
}

.today-only-layout.compact-cards .todo-input,
.today-only-layout.compact-cards .item-text {
  font-size: 0.8rem;
}

.full-screen .todo-slider {
  margin-top: 20px;
}

.archived-toggle-link {
  flex: 0 0 100%;
  text-align: center;
  color: grey;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 6px 0px 20px 0px;
}

.archived-toggle-link:hover {
  color: black;
}

.dark-theme .archived-toggle-link:hover {
  color: white;
}

/*----------------Dark Theme------------------*/
.dark-theme {
  background-color: #0d1117;
  color: #c9d1d9;
}

.dark-theme input {
  background-color: #13171d;
  color: #c9d1d9;
}

.dark-theme input.form-range {
  background-color: unset;
}

.dark-theme .slider-btn:hover {
  border-radius: 6px;
  background-color: #21262d;
}

.dark-theme .slider-btn:active {
  background-color: #2a2e36;
}

.mobile {
  width: 100%;
  height: 100%;
  z-index: 999;
  position: absolute;
  padding: 20%;
}

.dark-theme .mobile {
  background-color: #0d1117;
}

.compatible {
  width: 100%;
  height: 100%;
  z-index: 999;
  /*position: absolute;*/
}

.hidden-input-for-focus {
  position: absolute;
  top: -100px;
}

.main-horizontal-divider {
  z-index: 5;

  &.on-top {
    cursor: unset;

    .inner-main-horizontal-divider {
      display: none;
    }

    .divider-icons-container {
      margin-top: 5px;
      visibility: visible;
      opacity: 0.3;
    }

    .move-to-corner-down,
    .move-to-corner-up,
    .move-to-center-up {
      display: none;
    }
  }

  &.on-bottom {
    cursor: unset;

    .inner-main-horizontal-divider {
      display: none;
    }

    .divider-icons-container {
      margin-top: -25px;
      visibility: visible;
      opacity: 0.3;
    }

    .move-to-corner-up,
    .move-to-corner-down,
    .move-to-center-down {
      display: none;
    }
  }

  &.on-center {
    .move-to-center-down,
    .move-to-center-up {
      display: none;
    }
  }

  &:hover {
    .divider-icons-container {
      visibility: visible;
      opacity: 1;
    }
  }
}

.divider-icons-container {
  visibility: hidden;
  opacity: 0;
  transition: 0.4s cubic-bezier(0.2, 1, 0.1, 1);
  z-index: 6;
  position: absolute;
  right: 70px;
  margin-top: -8px;
}

.divider-icons {
  @include btn-icon;
  padding: 6px;
  background-color: white;

  &:hover {
    opacity: 1;
  }

  .dark-theme & {
    background-color: #13171d;
  }
}

.hidden-lists-container {
  height: 0px !important;
  margin: 0px;
  min-height: 0px;
}

.full-screen-divider {
  height: 100% !important;
}

/*----------------Density mode------------------*/
.density-compact .weekly-to-do-header {
  margin-bottom: 12px;
  margin-top: 4px;
}

.density-compact .weekly-to-do-header h4 {
  font-size: 17px;
  min-height: unset;
}

.density-compact .todo-input,
.density-compact .item-text {
  font-size: 0.8rem;
}

.density-compact .today-only-layout .to-do-list-container {
  margin-bottom: 14px !important;
}

.density-compact .week-strip-day {
  width: 36px;
  padding: 3px 0px;
}

.density-compact .to-do-list-container {
  padding-left: 10px;
  padding-right: 10px;
}
</style>
