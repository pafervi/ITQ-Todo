import dbRepository from "../repositories/dbRepository";
import moment from "moment";

function isDateKey(key) {
  return /^\d{8}$/.test(key);
}

export default {
  // Counts consecutive days (walking back from today) where every task in
  // that day's list was completed. A day with no tasks scheduled doesn't
  // break the streak, it's simply skipped. Stops at the first day that had
  // tasks and wasn't fully completed.
  computeStreak() {
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let request = dbRepository.selectAll(db, "todo_lists");
        let byDate = {};
        request.onsuccess = function () {
          let cursor = request.result;
          if (cursor) {
            if (isDateKey(cursor.key) && Array.isArray(cursor.value)) {
              byDate[cursor.key] = cursor.value;
            }
            cursor.continue();
          } else {
            let streak = 0;
            let day = moment();
            for (let i = 0; i < 730; i++) {
              let key = day.format("YYYYMMDD");
              let tasks = byDate[key];
              if (tasks && tasks.length) {
                if (tasks.every((t) => t.checked)) {
                  streak++;
                } else {
                  break;
                }
              }
              day = day.subtract(1, "day");
            }
            resolve(streak);
          }
        };
        request.onerror = function () {
          resolve(0);
        };
      };
      db_req.onerror = function () {
        resolve(0);
      };
    });
  },
};
