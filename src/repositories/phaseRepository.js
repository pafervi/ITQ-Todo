import dbRepository from "./dbRepository";

// Persistence layer for Phase entities. Phases are stored as an array per
// phased project, keyed by projectId in the "project_phases" IndexedDB table.
// Mirrors the shape of toDoListRepository so the usage pattern stays familiar.
export default {
  update(projectId, phases) {
    let db_req = dbRepository.open();
    db_req.onsuccess = function (event) {
      let db = event.target.result;
      dbRepository.update(db, "project_phases", projectId, phases);
      window.dispatchEvent(new CustomEvent("wtd-saved"));
    };
  },

  updateAsync(projectId, phases) {
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onerror = () => resolve(false);
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let req = dbRepository.update(db, "project_phases", projectId, phases);
        req.onerror = () => resolve(false);
        req.transaction.oncomplete = () => {
          window.dispatchEvent(new CustomEvent("wtd-saved"));
          resolve(true);
        };
        req.transaction.onerror = () => resolve(false);
      };
    });
  },

  remove(projectId) {
    let db_req = dbRepository.open();
    db_req.onsuccess = function (event) {
      let db = event.target.result;
      dbRepository.delete(db, "project_phases", projectId);
    };
  },
};
