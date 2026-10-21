const state = {
    actions: {
        cListCreated: false,
        cListToRmv: null,
        selectedTodo: null,
    },
    // Targets for the phased-project modals. The modal reads its target
    // through the matching getter on show.bs.modal, so a parent can push the
    // payload here right before opening the modal from Bootstrap data
    // attributes or imperatively through the Modal instance.
    phaseEditorTarget: null,
    logEntryEditorTarget: null,
    snapshotPromptTarget: null,
}

const getters = {
    actions(state) {
        return state.actions;
    },
    phaseEditorTarget(state) {
        return state.phaseEditorTarget;
    },
    logEntryEditorTarget(state) {
        return state.logEntryEditorTarget;
    },
    snapshotPromptTarget(state) {
        return state.snapshotPromptTarget;
    },
}

const mutations = {
    actionsCListCreatedUpdate(state, obj) {
        state.actions.cListCreated = obj;
    },
    actionsCListToRmvUpdate(state, obj) {
        state.actions.cListToRmv = obj;
    },
    actionsSelectedTodoIdUpdate(state, obj) {
        state.actions.selectedTodo = obj;
    },
    setPhaseEditorTarget(state, obj) {
        state.phaseEditorTarget = obj;
    },
    setLogEntryEditorTarget(state, obj) {
        state.logEntryEditorTarget = obj;
    },
    setSnapshotPromptTarget(state, obj) {
        state.snapshotPromptTarget = obj;
    },
}

const actions = {}

export default {
    namespaced: false,
    state,
    getters,
    actions,
    mutations
}
