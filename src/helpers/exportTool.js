import platformHelper from "./platformHelper";
import storageRepository from "../repositories/storageRepository";
import dbRepository from "../repositories/dbRepository";
import { Toast, Modal } from "bootstrap";
import migrations from "../migrations/migrations";
import isElectron from "is-electron";
import moment from "moment";

export default {
  export() {
    var filename = "WeekToDoBackup.wtdb";
    buildFullData(function (data) {
      let string_data = JSON.stringify(data);
      createExportLink(filename, string_data);
    });
  },
  import(event) {
    let fr = readFile(event.target.files);
    fr.onload = function () {
      var toast = new Toast(document.getElementById("invalidFile"));
      try {
        var data = JSON.parse(fr.result);
        if ("config" in data) {
          importData(data);
          migrations.migrate();
        } else {
          toast.show();
        }
      } catch (e) {
        toast.show();
      }
    };
  },
  clear() {
    if (isElectron()) {
      const { ipcRenderer } = require("electron");
      ipcRenderer.send("clear-config");
    }

    storageRepository.clean();
    let db_req = dbRepository.open();
    db_req.onsuccess = function (event) {
      var db = event.target.result;
      let request = dbRepository.clear(db, "todo_lists");
      request.onsuccess = function () {
        let request2 = dbRepository.clear(db, "repeating_events");
        request2.onsuccess = function () {
          let request3 = dbRepository.clear(db, "repeating_events_by_date");
          request3.onsuccess = function () {
            if (db.objectStoreNames.contains("project_phases")) {
              let request4 = dbRepository.clear(db, "project_phases");
              request4.onsuccess = function () {
                if (db.objectStoreNames.contains("project_log_entries")) {
                  let request5 = dbRepository.clear(db, "project_log_entries");
                  request5.onsuccess = function () { location.reload(); };
                } else { location.reload(); }
              };
            } else if (db.objectStoreNames.contains("project_log_entries")) {
              let request4 = dbRepository.clear(db, "project_log_entries");
              request4.onsuccess = function () { location.reload(); };
            } else { location.reload(); }
          };
        };
      };
    };
  },
  // Writes a full snapshot (same content as a manual export) directly to disk.
  // Electron-only. Returns a Promise<{ok, filename?, folder?, bytes?, error?}>
  // so the caller can show a toast with the actual result instead of blindly
  // trusting a fire-and-forget write.
  exportToPath(folderPath) {
    return new Promise((resolve) => {
      if (!isElectron()) return resolve({ ok: false, error: "not-electron" });
      if (!folderPath) return resolve({ ok: false, error: "empty-path" });
      if (platformHelper.isForeignPath(folderPath)) return resolve({ ok: false, error: "foreign-path" });

      // Resolve ~ and $HOME so paths like "~/Documents/backups" or
      // "$HOME/..." Just Work instead of literally creating a "~" folder.
      let resolved = folderPath;
      try {
        const os = require("os");
        const path = require("path");
        if (resolved.startsWith("~")) {
          resolved = path.join(os.homedir(), resolved.slice(1));
        } else if (resolved.startsWith("$HOME")) {
          resolved = path.join(os.homedir(), resolved.slice(5));
        }
      } catch (e) { /* no os / path - treat as literal */ }

      buildFullData(function (data) {
        try {
          const fs = require("fs");
          const path = require("path");
          if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
          let filename = `WeekToDoBackup-${moment().format("YYYY-MM-DD")}.wtdb`;
          let fullPath = path.join(resolved, filename);
          let json = JSON.stringify(data);
          fs.writeFileSync(fullPath, json, "utf-8");
          resolve({ ok: true, filename: filename, folder: resolved, bytes: json.length });
        } catch (e) {
          console.log("[backup] " + e.message);
          resolve({ ok: false, error: e.message || String(e) });
        }
      });
    });
  },
  // Looks for the most recently modified .wtdb file in folderPath and imports
  // it, the same way a manual "Import data" would. Electron-only. Resolves
  // true/false depending on whether a backup was actually found and loaded.
  importLatestFromPath(folderPath) {
    if (!isElectron() || !folderPath || platformHelper.isForeignPath(folderPath)) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        const fs = require("fs");
        const path = require("path");
        if (!fs.existsSync(folderPath)) return resolve(false);
        let files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".wtdb"));
        if (!files.length) return resolve(false);
        files.sort(
          (a, b) =>
            fs.statSync(path.join(folderPath, b)).mtimeMs - fs.statSync(path.join(folderPath, a)).mtimeMs
        );
        let raw = fs.readFileSync(path.join(folderPath, files[0]), "utf-8");
        let data = JSON.parse(raw);
        if ("config" in data) {
          importData(data);
          migrations.migrate();
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (e) {
        console.log("[backup] " + e.message);
        resolve(false);
      }
    });
  },
};

function buildFullData(onComplete) {
  var data = storageRepository.as_json();
  data.todoLists = {};
  data.repeating_events = {};
  data.repeating_events_by_date = {};
  let db_req = dbRepository.open();

  db_req.onsuccess = function (event) {
    var db = event.target.result;
    let request = dbRepository.selectAll(db, "todo_lists");
    request.onsuccess = function () {
      let cursor = request.result;
      if (cursor) {
        data.todoLists[cursor.key] = cursor.value;
        cursor.continue();
      } else {
        getRepeatinEventData(data, event, onComplete);
      }
    };
  };
}

function getRepeatinEventData(data, event, onComplete) {
  var db = event.target.result;
  let request = dbRepository.selectAll(db, "repeating_events");
  request.onsuccess = function () {
    let cursor = request.result;
    if (cursor) {
      data.repeating_events[cursor.key] = cursor.value;
      cursor.continue();
    } else {
      getRepeatinEventByDateData(data, event, onComplete);
    }
  };
}

function getRepeatinEventByDateData(data, event, onComplete) {
  var db = event.target.result;
  let request = dbRepository.selectAll(db, "repeating_events_by_date");
  request.onsuccess = function () {
    let cursor = request.result;
    if (cursor) {
      data.repeating_events_by_date[cursor.key] = cursor.value;
      cursor.continue();
    } else {
      getProjectPhasesData(data, event, onComplete);
    }
  };
}

function getProjectPhasesData(data, event, onComplete) {
  var db = event.target.result;
  if (!db.objectStoreNames.contains("project_phases")) {
    return getProjectLogEntriesData(data, event, onComplete);
  }
  data.project_phases = {};
  let request = dbRepository.selectAll(db, "project_phases");
  request.onsuccess = function () {
    let cursor = request.result;
    if (cursor) {
      data.project_phases[cursor.key] = cursor.value;
      cursor.continue();
    } else {
      getProjectLogEntriesData(data, event, onComplete);
    }
  };
}

function getProjectLogEntriesData(data, event, onComplete) {
  var db = event.target.result;
  if (!db.objectStoreNames.contains("project_log_entries")) {
    return onComplete(data);
  }
  data.project_log_entries = {};
  let request = dbRepository.selectAll(db, "project_log_entries");
  request.onsuccess = function () {
    let cursor = request.result;
    if (cursor) {
      data.project_log_entries[cursor.key] = cursor.value;
      cursor.continue();
    } else {
      onComplete(data);
    }
  };
}

function createExportLink(filename, fileBody) {
  var element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(fileBody));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  setTimeout(function () {
    let exportingModal = Modal.getInstance(document.getElementById("exportingModal"));
    if (exportingModal) exportingModal.hide();
  }, 1000);
}

function readFile(files) {
  const fileList = files;
  var fr = null;
  if (fileList[0]) {
    fr = new FileReader();
    fr.readAsText(fileList[0]);
  }
  return fr;
}

function importData(data) {
  importLocalStorageData(data);
  importIndexedDbData(data, "todo_lists");
}

function importLocalStorageData(data) {
  storageRepository.clean();
  var configData = JSON.parse(data.config);
  configData.importing = true;
  data.config = JSON.stringify(configData)
  storageRepository.load_json(data);
}

function importIndexedDbData(a_data, table) {
  var data = a_data;
  let db_req = dbRepository.open();
  db_req.onsuccess = function (event) {
    let db = event.target.result;
    let request = dbRepository.clear(db, table);
    request.onsuccess = function () {
      importDbRecords(db, data, table);
    };
  };
}

function importDbRecords(db, data_a, table) {
  var keys, data;

  if (table == "todo_lists") {
    keys = Object.keys(data_a.todoLists);
    data = data_a.todoLists;
  } else if (table == "repeating_events") {
    if (!('repeating_events' in data_a)) return nextImportTable(data_a, table); // old data, skip
    keys = Object.keys(data_a.repeating_events);
    data = data_a.repeating_events;
  } else if (table == "repeating_events_by_date") {
    keys = Object.keys(data_a.repeating_events_by_date || {});
    data = data_a.repeating_events_by_date || {};
  } else if (table == "project_phases") {
    keys = Object.keys(data_a.project_phases || {});
    data = data_a.project_phases || {};
  } else if (table == "project_log_entries") {
    keys = Object.keys(data_a.project_log_entries || {});
    data = data_a.project_log_entries || {};
  } else {
    return location.reload();
  }

  var i = keys.length;
  var req;

  if (i == 0) {
    nextImportTable(data_a, table);
  } else {
    while (i--) {
      req = dbRepository.add(db, table, keys[i], data[keys[i]]);
    }
    req.onsuccess = function () {
      nextImportTable(data_a, table);
    };
  }
}

// Chain: todo_lists → repeating_events → repeating_events_by_date
//        → project_phases → project_log_entries → reload
function nextImportTable(data_a, currentTable) {
  if (currentTable == "todo_lists") {
    importIndexedDbData(data_a, "repeating_events");
  } else if (currentTable == "repeating_events") {
    importIndexedDbData(data_a, "repeating_events_by_date");
  } else if (currentTable == "repeating_events_by_date") {
    if (data_a.project_phases) {
      importIndexedDbData(data_a, "project_phases");
    } else if (data_a.project_log_entries) {
      importIndexedDbData(data_a, "project_log_entries");
    } else {
      location.reload();
    }
  } else if (currentTable == "project_phases") {
    if (data_a.project_log_entries) {
      importIndexedDbData(data_a, "project_log_entries");
    } else {
      location.reload();
    }
  } else {
    location.reload();
  }
}
