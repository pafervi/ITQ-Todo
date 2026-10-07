import platformHelper from "../helpers/platformHelper";
import storageRepository from "./storageRepository";
import version_json from "../../public/version.json";
import moment from "moment";

export default {
  load() {
    let config = storageRepository.get("config");
    if (config) {
      return config;
    } else {
      let default_config = {
        darkTheme: false,
        customList: true,
        calendar: true,
        firstTimeOpen: true,
        language: "en",
        version: version_json.version,
        columns: 5,
        customColumns: 5,
        zoom: 100,
        calendarHeight: "calc(50% - 50px)",
        notificationOnStartup: true,
        notificationSound: "pop",
        openOnStartup: true,
        // Linux desktops (GNOME) often have no tray, so hiding to tray would
        // leave the app unreachable: there closing the window quits.
        runInBackground: !platformHelper.isLinux(),
        moveOldTasks: true,
        mainDividerPosition: 1,
        darkTrayIcon: false,
        importing: false,
        compactView: true,
        startCalendarYesterday: false,
        notificationIndicator: true,
        autoReorderTasks: false,
        moveCompletedSubTaskToBottom: true,
        fullscreenToDoModal: false,
        weekStartOnMonday: true,
        lastDayOpened: moment().format("YYYY-MM-DD"),
        todayOnlyMode: true,
        compactProjectCards: false,
        projectCardWidth: 320,
        accentColor: "#5e6ef2",
        fontFamily: "",
        uiDensity: "comfortable",
        meshBackgroundEnabled: true,
        performanceMode: false,
        autoTagEnabled: true,
        customTemplates: {},
        lastWeeklySummaryShownDate: null,
        lastDailySummaryShownDate: null,
        nextTalkTitle: "",
        nextTalkDate: "",
        backupEnabled: false,
        backupFolderPath: "",
        autoLoadLatestBackup: false,
        lastBackupDate: "",
        // Friday wrap-up ritual: auto-opens on Fridays once the clock hits
        // `fridayRitualHour` local time, unless already closed this ISO week
        // (tracked by lastFridayRitualDate = YYYY-MM-DD).
        fridayRitualEnabled: true,
        fridayRitualHour: 17,
        lastFridayRitualDate: null,
      };
      storageRepository.set("config", default_config);
      return default_config;
    }
  },
  update(config) {
    storageRepository.set("config", config);
  },
};
