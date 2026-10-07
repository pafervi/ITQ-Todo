import dbRepository from "../repositories/dbRepository";

// Reads every list straight from IndexedDB, so callers do not depend on which
// lists happen to be loaded in the Vuex store at the moment.
// Resolves { listId: tasks[] }; never rejects (an unreadable DB gives {}).
export default {
  scanAll() {
    return new Promise((resolve) => {
      let lists = {};
      let db_req = dbRepository.open();
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let request = dbRepository.selectAll(db, "todo_lists");
        request.onsuccess = function () {
          let cursor = request.result;
          if (cursor) {
            if (Array.isArray(cursor.value)) lists[cursor.key] = cursor.value;
            cursor.continue();
          } else {
            resolve(lists);
          }
        };
        request.onerror = function () {
          resolve(lists);
        };
      };
      db_req.onerror = function () {
        resolve(lists);
      };
    });
  },
};
