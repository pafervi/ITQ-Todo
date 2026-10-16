import dbRepository from "./dbRepository";

export default {
  update(toDoListId, toDoList) {
    let db_req = dbRepository.open();
    db_req.onsuccess = function (event) {
      let db = event.target.result;
      dbRepository.update(db, "todo_lists", toDoListId, toDoList);
      window.dispatchEvent(new CustomEvent("wtd-saved"));
    };
  },
  // Same as update() but resolves once the write is committed, so callers that
  // move tasks between lists can safely let another component re-read the
  // list from the database right afterwards.
  updateAsync(toDoListId, toDoList) {
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onerror = () => resolve(false);
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let req = dbRepository.update(db, "todo_lists", toDoListId, toDoList);
        req.onerror = () => resolve(false);
        req.transaction.oncomplete = () => {
          window.dispatchEvent(new CustomEvent("wtd-saved"));
          resolve(true);
        };
        req.transaction.onerror = () => resolve(false);
      };
    });
  },
  remove(toDoListId) {
    let db_req = dbRepository.open();
    db_req.onsuccess = function (event) {
      let db = event.target.result;
      dbRepository.delete(db, "todo_lists", toDoListId);
    };
  },
};
