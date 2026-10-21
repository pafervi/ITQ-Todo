import dbRepository from "../../repositories/dbRepository";

// Phases live per phased project. state.phases is a dict keyed by projectId.
// Each entry is an ordered array of Phase objects:
//   { id, projectId, name, startDate, endDate, status, order, color }
// Dates are ISO strings (YYYY-MM-DD). Status: 'pending'|'active'|'done'|'blocked'.
const state = {
  phases: {},
};

const getters = {
  phases(state) {
    return state.phases;
  },
};

const mutations = {
  loadPhases(state, obj) {
    state.phases[obj.projectId] = obj.phases || [];
  },
  addPhase(state, phase) {
    if (!state.phases[phase.projectId]) state.phases[phase.projectId] = [];
    state.phases[phase.projectId].push(phase);
  },
  updatePhase(state, obj) {
    // obj: { projectId, phaseId, patch }
    let list = state.phases[obj.projectId];
    if (!list) return;
    let idx = list.findIndex((p) => p.id === obj.phaseId);
    if (idx < 0) return;
    list[idx] = { ...list[idx], ...obj.patch };
  },
  removePhase(state, obj) {
    // obj: { projectId, phaseId }
    let list = state.phases[obj.projectId];
    if (!list) return;
    state.phases[obj.projectId] = list.filter((p) => p.id !== obj.phaseId);
  },
  reorderPhases(state, obj) {
    // obj: { projectId, orderedIds }
    let list = state.phases[obj.projectId];
    if (!list) return;
    let map = Object.fromEntries(list.map((p) => [p.id, p]));
    state.phases[obj.projectId] = obj.orderedIds.map((id, i) => ({ ...map[id], order: i })).filter(Boolean);
  },
};

const actions = {
  loadPhases({ commit }, projectId) {
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let get_req = dbRepository.get(db, "project_phases", projectId);
        get_req.onsuccess = function (event) {
          let phases = event.target.result;
          if (phases) {
            commit("loadPhases", { projectId: projectId, phases: phases });
          } else {
            commit("loadPhases", { projectId: projectId, phases: [] });
            dbRepository.add(db, "project_phases", projectId, []);
          }
          resolve();
        };
        get_req.onerror = function () {
          commit("loadPhases", { projectId: projectId, phases: [] });
          resolve();
        };
      };
      db_req.onerror = function () {
        commit("loadPhases", { projectId: projectId, phases: [] });
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
