import dbRepository from "../repositories/dbRepository";
import moment from "moment";

function isDateKey(key) {
  return /^\d{8}$/.test(key);
}

export default {
  // Scans every list in IndexedDB once and returns a summary of the
  // current ISO week (Monday-Sunday): a done/total pair per day for the
  // dated "today" lists, plus the current done/total snapshot of every
  // active custom/project list (not week-scoped, since individual tasks
  // don't carry a completion timestamp — this is "where things stand",
  // not "completed this week").
  getWeekSummary(cTodoListIds) {
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
              let total = cursor.value.length;
              let done = cursor.value.filter((t) => t.checked).length;
              if (isDateKey(cursor.key)) {
                byDate[cursor.key] = { total: total, done: done };
              } else {
                byList[cursor.key] = { total: total, done: done };
              }
            }
            cursor.continue();
          } else {
            let weekStart = moment().startOf("isoWeek");
            let days = [];
            let weekDone = 0;
            let weekTotal = 0;
            for (let i = 0; i < 7; i++) {
              let d = moment(weekStart).add(i, "days");
              let key = d.format("YYYYMMDD");
              let entry = byDate[key] || { total: 0, done: 0 };
              days.push({ key: key, weekday: d.isoWeekday(), done: entry.done, total: entry.total, isToday: key === moment().format("YYYYMMDD") });
              weekDone += entry.done;
              weekTotal += entry.total;
            }

            let lists = (cTodoListIds || [])
              .filter((l) => !l.archived)
              .map((l) => {
                let entry = byList[l.listId] || { total: 0, done: 0 };
                return { listId: l.listId, listName: l.listName, color: l.color || "", done: entry.done, total: entry.total };
              })
              .filter((l) => l.total > 0)
              .sort((a, b) => b.done - a.done);

            resolve({ days: days, weekDone: weekDone, weekTotal: weekTotal, lists: lists });
          }
        };
        request.onerror = function () {
          resolve({ days: [], weekDone: 0, weekTotal: 0, lists: [] });
        };
      };
      db_req.onerror = function () {
        resolve({ days: [], weekDone: 0, weekTotal: 0, lists: [] });
      };
    });
  },
};
