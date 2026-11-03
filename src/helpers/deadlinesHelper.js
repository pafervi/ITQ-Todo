import dbRepository from "../repositories/dbRepository";
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";

export default {
  // Scans every list stored in IndexedDB (daily lists and custom/project lists)
  // and returns the pending tasks that have a deadline set, regardless of
  // whether their list is currently loaded in the Vuex store. Tasks that live
  // in archived projects are skipped: an archived project is out of play, so
  // its deadlines must not show up in the toast, the deadlines modal, the
  // radar or mission control.
  getTasksWithDeadline() {
    return new Promise((resolve) => {
      let archivedIds = new Set();
      try {
        (customToDoListIdsRepository.load() || []).forEach((l) => {
          if (l && l.archived) archivedIds.add(String(l.listId));
        });
      } catch (e) {
        /* best-effort: if the project index cannot be read, skip the filter */
      }
      let db_req = dbRepository.open();
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let request = dbRepository.selectAll(db, "todo_lists");
        let tasks = [];
        request.onsuccess = function () {
          let cursor = request.result;
          if (cursor) {
            let list = cursor.value;
            if (Array.isArray(list) && !archivedIds.has(String(cursor.key))) {
              list.forEach((task, index) => {
                if (task && task.deadline && !task.checked) {
                  tasks.push({
                    listId: cursor.key,
                    index: index,
                    text: task.text,
                    deadline: task.deadline,
                    priority: task.priority || 0,
                    tags: task.tags || [],
                  });
                }
              });
            }
            cursor.continue();
          } else {
            tasks.sort(function (a, b) {
              if (a.deadline < b.deadline) return -1;
              if (a.deadline > b.deadline) return 1;
              return (b.priority || 0) - (a.priority || 0);
            });
            resolve(tasks);
          }
        };
        request.onerror = function () {
          resolve(tasks);
        };
      };
      db_req.onerror = function () {
        resolve([]);
      };
    });
  },
};
