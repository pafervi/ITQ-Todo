import dbRepository from "../repositories/dbRepository";
import moment from "moment";

function isDateKey(key) {
  return /^\d{8}$/.test(key);
}

export default {
  // Everything here is computed from the local IndexedDB only - nothing is
  // sent anywhere. Scans every list once and builds a same-day snapshot:
  // today's done/total, the project that saw the most progress (best-effort,
  // since individual tasks don't carry a completion timestamp - same
  // limitation as weeklySummaryHelper), and a preview of tomorrow's plan.
  getDaySummary(cTodoListIds) {
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        let request = dbRepository.selectAll(db, "todo_lists");
        let byDate = {};
        let byList = {};
        request.onsuccess = function () {
          let cursor = request.result;
          if (cursor) {
            if (Array.isArray(cursor.value)) {
              let tasks = cursor.value;
              let total = tasks.length;
              let done = tasks.filter((t) => t.checked).length;
              if (isDateKey(cursor.key)) {
                byDate[cursor.key] = { total: total, done: done, tasks: tasks };
              } else {
                byList[cursor.key] = { total: total, done: done };
              }
            }
            cursor.continue();
          } else {
            let todayKey = moment().format("YYYYMMDD");
            let tomorrowKey = moment().add(1, "day").format("YYYYMMDD");
            let today = byDate[todayKey] || { total: 0, done: 0, tasks: [] };
            let tomorrow = byDate[tomorrowKey] || { total: 0, done: 0, tasks: [] };

            let topList = (cTodoListIds || [])
              .filter((l) => !l.archived)
              .map((l) => {
                let entry = byList[l.listId] || { total: 0, done: 0 };
                return { listId: l.listId, listName: l.listName, done: entry.done, total: entry.total };
              })
              .filter((l) => l.done > 0)
              .sort((a, b) => b.done - a.done)[0];

            let tomorrowPending = (tomorrow.tasks || []).filter((t) => !t.checked);

            resolve({
              todayDone: today.done,
              todayTotal: today.total,
              topList: topList || null,
              tomorrowCount: tomorrowPending.length,
              tomorrowPreview: tomorrowPending.slice(0, 3).map((t) => t.text),
            });
          }
        };
        request.onerror = function () {
          resolve({ todayDone: 0, todayTotal: 0, topList: null, tomorrowCount: 0, tomorrowPreview: [] });
        };
      };
      db_req.onerror = function () {
        resolve({ todayDone: 0, todayTotal: 0, topList: null, tomorrowCount: 0, tomorrowPreview: [] });
      };
    });
  },
};
