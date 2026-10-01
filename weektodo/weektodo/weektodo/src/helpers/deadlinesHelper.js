import dbRepository from "../repositories/dbRepository";

export default {
  // Scans every list stored in IndexedDB (daily lists and custom/project lists)
  // and returns the pending tasks that have a deadline set, regardless of
  // whether their list is currently loaded in the Vuex store.
  getTasksWithDeadline() {
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
