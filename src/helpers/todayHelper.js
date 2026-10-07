import moment from "moment";
import listScanHelper from "./listScanHelper";

// How many open tasks does a given day really have?
//
// A day list shows its own tasks (minus the ones snoozed to another day, which
// carry a different `dueDate`) plus every task from OTHER lists whose
// `dueDate` points at that day. toDoList.vue renders exactly that, so this
// helper applies the same rule: counting `todoLists[day].length` alone would
// say "nothing scheduled" while the day clearly shows scheduled project tasks.
function openTasksFor(allLists, dayId, isActiveList) {
  let count = 0;
  Object.keys(allLists || {}).forEach((listId) => {
    if (!isActiveList(listId)) return;
    (allLists[listId] || []).forEach((t) => {
      if (!t || t.checked) return;
      if (listId === dayId) {
        if (!t.dueDate || t.dueDate === dayId) count++;
      } else if (t.dueDate === dayId) {
        count++;
      }
    });
  });
  return count;
}

export default {
  openTasksFor: openTasksFor,

  // Resolves { today, yesterday } open-task counts. IndexedDB gives the full
  // picture (including projects that are not loaded yet) and the lists already
  // in the store override it, because they hold the freshest state (for
  // example tasks that were just rolled over from past days).
  summary(storeLists, cTodoListIds) {
    let projects = {};
    (cTodoListIds || []).forEach((l) => {
      projects[l.listId] = l;
    });
    // Day lists always count. Project lists only if they still exist and are
    // not archived (orphan records of deleted projects are ignored).
    let isActiveList = (listId) => /^\d{8}$/.test(listId) || (!!projects[listId] && !projects[listId].archived);
    return listScanHelper.scanAll().then((fromDb) => {
      let merged = Object.assign({}, fromDb, storeLists || {});
      return {
        today: openTasksFor(merged, moment().format("YYYYMMDD"), isActiveList),
        yesterday: openTasksFor(merged, moment().subtract(1, "d").format("YYYYMMDD"), isActiveList),
      };
    });
  },
};
