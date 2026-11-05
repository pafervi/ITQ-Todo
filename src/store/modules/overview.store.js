import dbRepository from "../../repositories/dbRepository";

// Long-term overview (academic year board). Items and lanes are stored as ONE
// document under a reserved key of the existing "project_phases" table, so the
// .wtdb backup/restore and "clear all data" already cover it without a DB
// migration. Project ids are never "__overview__", so there is no collision.
//
//   { items: [ { id, laneId, kind, title, startDate, endDate, color, notes } ],
//     lanes: [ { id, name, color } ] }
//
// `open` controls whether the overview replaces the main area; it is UI state
// and is not persisted.
const TABLE = "project_phases";
const KEY = "__overview__";

const state = {
  items: [],
  lanes: [],
  loaded: false,
  failed: false,
  fresh: false,
  open: false,
};

const getters = {
  overviewItems: (state) => state.items,
  overviewLanes: (state) => state.lanes,
  overviewLoaded: (state) => state.loaded,
  // True while no overview document has ever been saved, so the view can
  // seed the default lanes exactly once.
  overviewFresh: (state) => state.fresh,
  overviewOpen: (state) => state.open,
};

const mutations = {
  setOverview(state, doc) {
    state.items = (doc && doc.items) || [];
    state.lanes = (doc && doc.lanes) || [];
    state.loaded = true;
    state.fresh = !doc;
  },
  // The stored document could not be read: show an empty board but never
  // seed defaults or write, so a transient error cannot overwrite real data.
  setOverviewFailed(state) {
    state.items = [];
    state.lanes = [];
    state.loaded = true;
    state.failed = true;
    state.fresh = false;
  },
  setOverviewOpen(state, value) {
    state.open = !!value;
  },
  upsertOverviewItem(state, item) {
    let idx = state.items.findIndex((x) => x.id === item.id);
    if (idx < 0) state.items.push(item);
    else state.items[idx] = item;
    state.fresh = false;
  },
  removeOverviewItem(state, id) {
    state.items = state.items.filter((x) => x.id !== id);
  },
  setOverviewLanes(state, lanes) {
    state.lanes = lanes;
    state.fresh = false;
  },
};

function persist(state) {
  return new Promise((resolve) => {
    if (state.failed) return resolve(false);
    let doc = { items: state.items, lanes: state.lanes };
    let db_req = dbRepository.open();
    db_req.onerror = () => resolve(false);
    db_req.onsuccess = function (event) {
      let db = event.target.result;
      let req = dbRepository.update(db, TABLE, KEY, doc);
      req.onerror = () => resolve(false);
      req.transaction.oncomplete = () => {
        window.dispatchEvent(new CustomEvent("wtd-saved"));
        resolve(true);
      };
      req.transaction.onerror = () => resolve(false);
    };
  });
}

const actions = {
  loadOverview({ commit, state }) {
    if (state.loaded) return Promise.resolve();
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onerror = () => {
        commit("setOverviewFailed");
        resolve();
      };
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let get_req = dbRepository.get(db, TABLE, KEY);
        get_req.onsuccess = function (ev) {
          commit("setOverview", ev.target.result || null);
          resolve();
        };
        get_req.onerror = function () {
          commit("setOverviewFailed");
          resolve();
        };
      };
    });
  },
  saveOverviewItem({ commit, state }, item) {
    commit("upsertOverviewItem", item);
    return persist(state);
  },
  deleteOverviewItem({ commit, state }, id) {
    commit("removeOverviewItem", id);
    return persist(state);
  },
  saveOverviewLanes({ commit, state }, lanes) {
    commit("setOverviewLanes", lanes);
    return persist(state);
  },
};

export default {
  namespaced: false,
  state,
  getters,
  mutations,
  actions,
};
