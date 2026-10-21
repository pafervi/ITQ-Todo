import dbRepository from "./dbRepository";

// Persistence layer for LogEntry entities. Entries are stored as an array per
// phased project, keyed by projectId in the "project_log_entries" IndexedDB
// table. Same shape as phaseRepository.
export default {
  update(projectId, entries) {
    let db_req = dbRepository.open();
    db_req.onsuccess = function (event) {
      let db = event.target.result;
      dbRepository.update(db, "project_log_entries", projectId, entries);
      window.dispatchEvent(new CustomEvent("wtd-saved"));
    };
  },

  updateAsync(projectId, entries) {
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onerror = () => resolve(false);
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let req = dbRepository.update(db, "project_log_entries", projectId, entries);
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
      dbRepository.delete(db, "project_log_entries", projectId);
    };
  },
};
