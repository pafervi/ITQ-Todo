import dbRepository from "./dbRepository";

// Thin wrapper over the "repeating_events_by_date" object store. Mirrors
// repeatingEventRepository one-to-one, just points at a different table.
// Keyed by listId (daily list = YYYYMMDD, custom list = its id); the value
// is a plain object { [repeatingEventId]: true } marking which repeating
// events have already been instanced on that date.
export default {
  update(listId, byDate) {
    let db_req = dbRepository.open();
    db_req.onsuccess = function (event) {
      let db = event.target.result;
      dbRepository.update(db, "repeating_events_by_date", listId, byDate);
    };
  },
  remove(listId) {
    let db_req = dbRepository.open();
    db_req.onsuccess = function (event) {
      let db = event.target.result;
      dbRepository.delete(db, "repeating_events_by_date", listId);
    };
  },
};
