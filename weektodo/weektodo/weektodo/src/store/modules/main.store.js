const state = {
    clicks: 0,
    clicksTimer: null,
    undoElement: null,
    listToClearId: null,
    activeTagFilter: null,
    focusTask: null,
    pasteQueueTarget: null,
}

const getters = {
    clicks(state) {
        return state.clicks;
    },
    clicksTimer(state) {
        return state.clicksTimer;
    },
    undoElement(state) {
        return state.undoElement;
    },
    listToClearId(state) {
        return state.listToClearId;
    },
    activeTagFilter(state) {
        return state.activeTagFilter;
    },
    focusTask(state) {
        return state.focusTask;
    },
    pasteQueueTarget(state) {
        return state.pasteQueueTarget;
    }
}

const mutations = {
    setClicks(state, obj) {
        state.clicks = obj;
    },
    setClicksTimer(state, obj) {
        state.clicksTimer = obj;
    },
    setUndoElement(state, obj) {
        state.undoElement = obj;
    },
    setListToClear(state, obj) {
        state.listToClearId = obj;
    },
    setActiveTagFilter(state, obj) {
        state.activeTagFilter = obj;
    },
    setFocusTask(state, obj) {
        state.focusTask = obj;
    },
    setPasteQueueTarget(state, obj) {
        state.pasteQueueTarget = obj;
    }
}

export default {
    namespaced: false,
    state,
    getters,
    mutations
}
