import dbRepository from "../../repositories/dbRepository";

// Log entries live per phased project. state.logEntries is a dict keyed by
// projectId. Each entry is an array of LogEntry objects:
//   { id, projectId, phaseId, date, kind, text, blockEndDate, snapshotKind }
// Kind: 'note' | 'milestone' | 'decision' | 'block'.
// snapshotKind (optional): 'monday' | 'friday' when the entry came from an
// automated weekly snapshot prompt.
const state = {
  logEntries: {},
};

const getters = {
  logEntries(state) {
    return state.logEntries;
  },
};

const mutations = {
  loadLogEntries(state, obj) {
    state.logEntries[obj.projectId] = obj.entries || [];
  },
  addLogEntry(state, entry) {
    if (!state.logEntries[entry.projectId]) state.logEntries[entry.projectId] = [];
    state.logEntries[entry.projectId].push(entry);
  },
  updateLogEntry(state, obj) {
    // obj: { projectId, entryId, patch }
    let list = state.logEntries[obj.projectId];
    if (!list) return;
    let idx = list.findIndex((e) => e.id === obj.entryId);
    if (idx < 0) return;
    list[idx] = { ...list[idx], ...obj.patch };
  },
  removeLogEntry(state, obj) {
    // obj: { projectId, entryId }
    let list = state.logEntries[obj.projectId];
    if (!list) return;
    state.logEntries[obj.projectId] = list.filter((e) => e.id !== obj.entryId);
  },
};

const actions = {
  loadLogEntries({ commit }, projectId) {
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let get_req = dbRepository.get(db, "project_log_entries", projectId);
        get_req.onsuccess = function (event) {
          let entries = event.target.result;
          if (entries) {
            commit("loadLogEntries", { projectId: projectId, entries: entries });
          } else {
            commit("loadLogEntries", { projectId: projectId, entries: [] });
            dbRepository.add(db, "project_log_entries", projectId, []);
          }
          resolve();
        };
        get_req.onerror = function () {
          commit("loadLogEntries", { projectId: projectId, entries: [] });
          resolve();
        };
      };
      db_req.onerror = function () {
        commit("loadLogEntries", { projectId: projectId, entries: [] });
        resolve();
      };
    });
  },
};

export default {
  namespaced: false,
  state,
  getters,
  mutations,
  actions,
};
