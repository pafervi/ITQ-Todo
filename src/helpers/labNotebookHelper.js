import dbRepository from "../repositories/dbRepository";
import moment from "moment";

function isDateKey(key) {
  return /^\d{8}$/.test(key);
}

export default {
  // Gathers the actual completed-task text (not just counts) for the
  // current ISO week, both day-by-day and per-project, so it can be laid
  // out as a dated, printable lab notebook page. Local-only, same IndexedDB
  // scan pattern as weeklySummaryHelper/dailySummaryHelper.
  getNotebookWeek(cTodoListIds) {
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
              if (isDateKey(cursor.key)) {
                byDate[cursor.key] = cursor.value;
              } else {
                byList[cursor.key] = cursor.value;
              }
            }
            cursor.continue();
          } else {
            let weekStart = moment().startOf("isoWeek");
            let days = [];
            for (let i = 0; i < 7; i++) {
              let d = moment(weekStart).add(i, "days");
              let key = d.format("YYYYMMDD");
              let tasks = (byDate[key] || []).filter((t) => t.checked).map((t) => t.text);
              days.push({ key: key, tasks: tasks });
            }

            let lists = (cTodoListIds || [])
              .filter((l) => !l.archived)
              .map((l) => {
                let tasks = (byList[l.listId] || []).filter((t) => t.checked).map((t) => t.text);
                return { listId: l.listId, listName: l.listName, tasks: tasks };
              })
              .filter((l) => l.tasks.length > 0);

            resolve({
              scope: "week",
              weekStartKey: weekStart.format("YYYYMMDD"),
              weekEndKey: moment(weekStart).add(6, "days").format("YYYYMMDD"),
              days: days,
              lists: lists,
            });
          }
        };
        request.onerror = function () {
          resolve({ scope: "week", weekStartKey: "", weekEndKey: "", days: [], lists: [] });
        };
      };
      db_req.onerror = function () {
        resolve({ scope: "week", weekStartKey: "", weekEndKey: "", days: [], lists: [] });
      };
    });
  },

  // Same idea as getNotebookWeek but for the whole current calendar month, and
  // only the days that actually have completed tasks (a month of empty days
  // would be noise on a printed notebook). Used for the monthly export with a
  // cover page.
  getNotebookMonth(cTodoListIds) {
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
              if (isDateKey(cursor.key)) {
                byDate[cursor.key] = cursor.value;
              } else {
                byList[cursor.key] = cursor.value;
              }
            }
            cursor.continue();
          } else {
            let monthStart = moment().startOf("month");
            let daysInMonth = monthStart.daysInMonth();
            let days = [];
            for (let i = 0; i < daysInMonth; i++) {
              let d = moment(monthStart).add(i, "days");
              let key = d.format("YYYYMMDD");
              let tasks = (byDate[key] || []).filter((t) => t.checked).map((t) => t.text);
              if (tasks.length) days.push({ key: key, tasks: tasks });
            }

            let lists = (cTodoListIds || [])
              .filter((l) => !l.archived)
              .map((l) => {
                let tasks = (byList[l.listId] || []).filter((t) => t.checked).map((t) => t.text);
                return { listId: l.listId, listName: l.listName, tasks: tasks };
              })
              .filter((l) => l.tasks.length > 0);

            resolve({
              scope: "month",
              monthKey: monthStart.format("YYYYMM"),
              monthStartKey: monthStart.format("YYYYMMDD"),
              monthEndKey: moment(monthStart).endOf("month").format("YYYYMMDD"),
              days: days,
              lists: lists,
            });
          }
        };
        request.onerror = function () {
          resolve({ scope: "month", monthKey: "", monthStartKey: "", monthEndKey: "", days: [], lists: [] });
        };
      };
      db_req.onerror = function () {
        resolve({ scope: "month", monthKey: "", monthStartKey: "", monthEndKey: "", days: [], lists: [] });
      };
    });
  },
};
