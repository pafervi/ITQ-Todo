import dbRepository from "../repositories/dbRepository";

export default {
  // Scans every list stored in IndexedDB (daily lists and custom/project
  // lists) and returns every task, regardless of whether its list is
  // currently loaded in the Vuex store. Used to search/filter across
  // projects instead of navigating into each list one by one.
  getAllTasks() {
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let request = dbRepository.selectAll(db, "todo_lists");
        let tasks = [];
        request.onsuccess = function () {
          let cursor = request.result;
          if (cursor) {
            let list = cursor.value;
            if (Array.isArray(list)) {
              list.forEach((task, index) => {
                if (task) {
                  tasks.push({
                    listId: cursor.key,
                    index: index,
                    text: task.text,
                    checked: !!task.checked,
                    tags: task.tags || [],
                    priority: task.priority || 0,
                    deadline: task.deadline || null,
                  });
                }
              });
            }
            cursor.continue();
          } else {
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
