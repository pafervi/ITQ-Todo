import configRepository from "../repositories/configRepository";
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";
import moment from "moment";
import platformHelper from "../helpers/platformHelper";

export default {
  migrate() {
    configCalendarZoomColumnsCalendarHeight();
    configNotifications();
    runInBackground();
    mainDividerPosition();
    trayIcon();
    telemetric();
    v2_1_0();
    v2_2_0();
    v2_3_0();
    v2_4_0();
    v2_5_0();
    v2_6_0();
    v2_7_0();
    v2_8_0();
    v2_8_1();
    v2_9_0();
  },
};

// Science theme selector: default every existing install to the original
// zeolites motif so nothing visible changes until the user opts into
// organic / oxides / photochem from Settings.
function v2_9_0() {
  let config = configRepository.load();
  if (!("activeTheme" in config)) {
    config["activeTheme"] = "zeolites";
    configRepository.update(config);
  }
}

function configCalendarZoomColumnsCalendarHeight() {
  let config = configRepository.load();
  if (!("calendar" in config)) {
    config["calendar"] = true;
    config["zoom"] = 100;
    config["columns"] = 5;
    config["calendarHeight"] = "calc(50% - 50px)";
    configRepository.update(config);
  }
}

function configNotifications() {
  let config = configRepository.load();
  if (!("startupNotification" in config)) {
    config["notificationOnStartup"] = true;
    config["notificationSound"] = "pop";
    config["openOnStartup"] = true;
    configRepository.update(config);
  }
}

function runInBackground() {
  let config = configRepository.load();
  if (!("runInBackground" in config)) {
    config["runInBackground"] = !platformHelper.isLinux();
    config["moveOldTasks"] = true;
    configRepository.update(config);
  }
}

function mainDividerPosition() {
  let config = configRepository.load();
  if (!("mainDividerPosition" in config)) {
    config["mainDividerPosition"] = 1;
    configRepository.update(config);
  }
}

function trayIcon() {
  let config = configRepository.load();
  if (!("darkTrayIcon" in config)) {
    config["darkTrayIcon"] = false;
    config["importing"] = false;
    configRepository.update(config);
  }
}

function telemetric() {
  let config = configRepository.load();
  if (!("customColumns" in config)) {
    config["customColumns"] = config["columns"];
    config["compactView"] = true;
    config["startCalendarYesterday"] = true;
    config["notificationIndicator"] = true;
    config["autoReorderTasks"] = false;
    config["moveCompletedTaskToBottom"] = true;
    configRepository.update(config);
  }
}

function v2_1_0() {
  let config = configRepository.load();
  if (!("fullscreenToDoModal" in config)) {
    config["fullscreenToDoModal"] = false;
    config["moveCompletedSubTaskToBottom"] = true;
    config["weekStartOnMonday"] = true;
    configRepository.update(config);
  }
}

function v2_2_0() {
  let config = configRepository.load();
  if (!("lastDayOpened" in config)) {
    config["lastDayOpened"] = moment().format("YYYY-MM-DD");
    configRepository.update(config);
  }
}

function v2_3_0() {
  let config = configRepository.load();
  if (!("todayOnlyMode" in config)) {
    config["todayOnlyMode"] = true;
    // Only shrink the calendar strip automatically if it is still at the
    // factory default height, never override a height the user dragged
    // to their own liking.
    if (config["calendarHeight"] == "calc(50% - 50px)") {
      config["calendarHeight"] = "280px";
    }
    configRepository.update(config);
  }
}

function v2_4_0() {
  let config = configRepository.load();
  if (!("projectCardWidth" in config)) {
    config["projectCardWidth"] = 320;
    config["compactProjectCards"] = false;
    configRepository.update(config);
  }
}

function v2_5_0() {
  let config = configRepository.load();
  if (!("accentColor" in config)) {
    config["accentColor"] = "#5e6ef2";
    configRepository.update(config);
  }
}

function v2_6_0() {
  let config = configRepository.load();
  if (!("fontFamily" in config)) {
    config["fontFamily"] = "";
    config["uiDensity"] = "comfortable";
    // Prefilled with Pau's own OneDrive path (this fork is personalized for
    // him); on Linux he'll just point this at the mirrored folder instead.
    // Windows-only default: on other systems the folder is chosen in Settings.
    let onWindows = platformHelper.isWindows();
    config["backupEnabled"] = onWindows;
    config["backupFolderPath"] = onWindows ? "C:\\Users\\pafervi2\\OneDrive - UPV\\WeekToDoBackup" : "";
    config["autoLoadLatestBackup"] = false;
    config["lastBackupDate"] = "";
    configRepository.update(config);
  }
}

// Legacy WeekToDo configs sometimes carry `moveOldTasks: false`. The ITQ Todo
// fork wants undone tasks from older days to roll over to today by default,
// so force it on once for anyone upgrading from such a config.
function v2_7_0() {
  let config = configRepository.load();
  if (config["moveOldTasks"] !== true) {
    config["moveOldTasks"] = true;
    configRepository.update(config);
  }
}

// Phased projects migration: every existing custom project is a classic
// checklist, tag them explicitly so new code that branches on
// cList.type === 'phased' leaves them alone. Idempotent, keyed by a config
// flag so we do not re-tag anything the user may have changed later.
function v2_8_0() {
  let config = configRepository.load();
  if (!("phasedProjectsIntroduced" in config)) {
    let cTodoListIds = customToDoListIdsRepository.load();
    let changed = false;
    cTodoListIds.forEach(function (cList) {
      if (!cList.type) {
        cList.type = "checklist";
        changed = true;
      }
    });
    if (changed) customToDoListIdsRepository.update(cTodoListIds);
    config["phasedProjectsIntroduced"] = true;
    configRepository.update(config);
  }
}

// Weekly snapshot config seeds. The two keys hold the ISO date (YYYY-MM-DD)
// of the last monday/friday the snapshot modal was answered or dismissed,
// so a running app does not re-trigger the same prompt within the same day.
function v2_8_1() {
  let config = configRepository.load();
  if (!("lastMondaySnapshot" in config)) {
    config["lastMondaySnapshot"] = "";
    config["lastFridaySnapshot"] = "";
    config["phasedSnapshotsEnabled"] = true;
    configRepository.update(config);
  }
}
