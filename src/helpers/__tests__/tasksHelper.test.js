import { describe, it, expect } from "vitest";
import tasksHelper from "../tasksHelper";

function task(overrides) {
  return Object.assign(
    {
      text: "task",
      checked: false,
      priority: 0,
      time: null,
    },
    overrides
  );
}

describe("tasksHelper.pendingTasksCount", () => {
  it("returns 0 for null or undefined lists", () => {
    expect(tasksHelper.pendingTasksCount(null)).toBe(0);
    expect(tasksHelper.pendingTasksCount(undefined)).toBe(0);
  });

  it("counts only the unchecked tasks", () => {
    let list = [task({ checked: true }), task({ checked: false }), task({ checked: false })];
    expect(tasksHelper.pendingTasksCount(list)).toBe(2);
  });
});

describe("tasksHelper.reorderTasksList", () => {
  it("moves checked tasks to the bottom", () => {
    let list = [task({ text: "done", checked: true }), task({ text: "pending", checked: false })];
    let result = tasksHelper.reorderTasksList(list);
    expect(result.map((t) => t.text)).toEqual(["pending", "done"]);
  });

  it("sorts unchecked tasks by priority, highest first", () => {
    let list = [task({ text: "low", priority: 1 }), task({ text: "high", priority: 3 }), task({ text: "none", priority: 0 })];
    let result = tasksHelper.reorderTasksList(list);
    expect(result.map((t) => t.text)).toEqual(["high", "low", "none"]);
  });

  it("treats a missing priority field as 0, for tasks created before the feature existed", () => {
    let list = [task({ text: "legacy", priority: undefined }), task({ text: "high", priority: 2 })];
    let result = tasksHelper.reorderTasksList(list);
    expect(result.map((t) => t.text)).toEqual(["high", "legacy"]);
  });

  it("breaks priority ties by time, timed tasks before untimed, earliest first", () => {
    let list = [
      task({ text: "no-time", priority: 1, time: null }),
      task({ text: "late", priority: 1, time: "15:00" }),
      task({ text: "early", priority: 1, time: "09:00" }),
    ];
    let result = tasksHelper.reorderTasksList(list);
    expect(result.map((t) => t.text)).toEqual(["early", "late", "no-time"]);
  });

  it("keeps priority ahead of time: a high priority task with no time still beats a low priority timed task", () => {
    let list = [task({ text: "low-timed", priority: 0, time: "08:00" }), task({ text: "high-notime", priority: 3, time: null })];
    let result = tasksHelper.reorderTasksList(list);
    expect(result.map((t) => t.text)).toEqual(["high-notime", "low-timed"]);
  });
});
