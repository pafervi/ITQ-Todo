import moment from "moment";
import toDoListRepository from "../repositories/toDoListRepository";
import customToDoListIdsRepository from "../repositories/customToDoListIdsRepository";

function taskFactory(listId, overrides) {
  return Object.assign(
    {
      text: "",
      checked: false,
      listId: listId,
      desc: "",
      subTaskList: [],
      color: "none",
      priority: 0,
      tags: [],
      deadline: null,
      time: null,
      alarm: false,
      repeatingEvent: null,
    },
    overrides
  );
}

function d(offsetDays) {
  return moment().add(offsetDays, "d").format("YYYYMMDD");
}

function newListId(salt) {
  return moment().format("YYYYMMDDTHHmmssS") + salt;
}

export default {
  // Seeds a realistic set of ITQ-flavoured lists and tasks that exercises
  // every feature added on top of upstream WeekToDo:
  // kind-tagged lists (meeting / active learning watermarks), a linked
  // results folder, custom accent colors, a short back-dated streak, and a
  // list that's one click away from completion so the confetti/"Convergido"
  // celebration is trivial to trigger. See claude/pending-ideas.md in the
  // project for the full feature list this is meant to demonstrate.
  seed(store) {
    const lists = [
      {
        listName: "MFI Defect Engineering",
        archived: false,
        color: "#5e6ef2",
        folderPath: "./calculations/MFI_defects",
        tasks: [
          { text: "Generate defects with MACE-MP on a 3x3x3 cell", priority: 3, tags: ["MACE", "DFT"], deadline: d(-2) },
          { text: "Launch Al vacancy sweep in VASP", priority: 2, tags: ["VASP"], deadline: d(0), time: "10:00" },
          { text: "Review TS convergence with PoTS", priority: 2, tags: ["PoTS"], deadline: d(1) },
          { text: "Compare DFT vs MLIP energies", priority: 1, tags: ["MACE", "DFT"], deadline: d(5) },
          { text: "Update analysis notebook", priority: 0, tags: ["writing"], checked: true },
          { text: "Weekly meeting with the group", priority: 1, tags: ["meeting"], deadline: d(2), time: "09:30" },
        ],
      },
      {
        listName: "MACE Potentials",
        archived: false,
        color: "#06b6d4",
        kind: "activelearning",
        tasks: [
          { text: "Retrain potential with new frames", priority: 3, tags: ["MACE", "training"], deadline: d(-1) },
          { text: "Validate forces against test set", priority: 2, tags: ["MACE"], deadline: d(3) },
          { text: "Document hyperparameters used", priority: 0, tags: ["writing"], checked: true },
          { text: "Upload checkpoint to internal DB", priority: 1, tags: ["db"] },
        ],
      },
      {
        listName: "PoTS Automation",
        archived: false,
        tasks: [
          { text: "Fix bug in automated TS search", priority: 3, tags: ["PoTS", "bug"], deadline: d(0) },
          { text: "Add support for custom MFI geometries", priority: 2, tags: ["PoTS"], deadline: d(7) },
          { text: "Write unit tests", priority: 1, tags: ["testing"] },
          { text: "Code review with teammate", priority: 1, tags: ["meeting"], deadline: d(4), time: "16:00" },
        ],
      },
      {
        listName: "CeO2 Polaron Study",
        archived: false,
        color: "#f97316",
        folderPath: "./calculations/CeO2_polarons",
        tasks: [
          { text: "Compute O vacancy formation energies", priority: 2, tags: ["VASP", "DFT"], deadline: d(-5) },
          { text: "Map Ce3+ polaron localization sites", priority: 2, tags: ["DFT"], deadline: d(10) },
          { text: "Compare with recent literature", priority: 0, tags: ["reading"], checked: true },
        ],
      },
      {
        listName: "Student onboarding",
        archived: false,
        color: "#10b981",
        tasks: [
          { text: "Cluster access and onboarding", priority: 1, tags: ["onboarding"], checked: true },
          { text: "Project introduction session", priority: 1, tags: ["onboarding"], checked: true },
          { text: "First tasks: run VASP examples", priority: 2, tags: ["VASP"], deadline: d(1) },
          { text: "Weekly follow-up meeting", priority: 1, tags: ["meeting"], deadline: d(3), time: "12:00" },
        ],
      },
      {
        listName: "Group meeting - Friday",
        archived: false,
        kind: "meeting",
        color: "#ed56a1",
        tasks: [
          { text: "Round of status updates", priority: 1, tags: ["meeting"] },
          { text: "Review available cluster time", priority: 1, tags: ["meeting"] },
          { text: "Pick date for next internal seminar", priority: 0, tags: ["meeting"], checked: true },
        ],
      },
      {
        listName: "Ideas / Backlog",
        archived: false,
        tasks: [
          { text: "Explore transfer learning between zeolite frameworks", priority: 0, tags: ["idea"] },
          { text: "Try active learning in the PoTS pipeline", priority: 0, tags: ["idea", "PoTS"] },
          { text: "Read new MACE off-equilibrium paper", priority: 0, tags: ["reading"] },
        ],
      },
      {
        listName: "Trip: conference",
        archived: true,
        tasks: [
          { text: "Book flights", priority: 1, tags: ["travel"], checked: true },
          { text: "Book accommodation", priority: 1, tags: ["travel"], checked: true },
          { text: "Prepare poster", priority: 2, tags: ["writing", "travel"], checked: true },
          { text: "Expense report", priority: 0, tags: ["travel"], checked: true },
        ],
      },
      {
        // One task left on purpose: check it off to see the "Converged, all
        // done" banner and the confetti burst fire immediately.
        listName: "Demo: tick the last task",
        archived: false,
        color: "#2dbd6e",
        tasks: [
          { text: "This one is already done", priority: 0, tags: [], checked: true },
          { text: "Tick this one and watch what happens", priority: 0, tags: [] },
        ],
      },
    ];

    lists.forEach((listDef, i) => {
      const listId = newListId(i);
      store.commit("newCustomTodoList", {
        listId: listId,
        listName: listDef.listName,
        archived: listDef.archived,
        color: listDef.color || "",
        kind: listDef.kind || "",
        folderPath: listDef.folderPath || "",
      });
      listDef.tasks.forEach((t) => {
        store.commit("addTodo", taskFactory(listId, t));
      });
      toDoListRepository.update(listId, store.getters.todoLists[listId]);
    });

    customToDoListIdsRepository.update(store.getters.cTodoListIds);

    const todayId = moment().format("YYYYMMDD");
    const todayTasks = [
      { text: "Answer pending emails", priority: 0, tags: [] },
      { text: "Review last night's calculation", priority: 2, tags: ["VASP"], time: "09:00" },
      { text: "Lunch with the group", priority: 0, tags: [], time: "14:00" },
      { text: "Prepare slides for tomorrow's meeting", priority: 1, tags: ["writing"], deadline: todayId },
    ];
    if (store.getters.todoLists[todayId]) {
      todayTasks.forEach((t) => {
        store.commit("addTodo", taskFactory(todayId, t));
      });
      toDoListRepository.update(todayId, store.getters.todoLists[todayId]);
    }

    // Back-date 4 fully-completed days so the sidebar streak counter shows
    // something real right away instead of starting at zero.
    for (let i = 1; i <= 4; i++) {
      const pastId = moment().subtract(i, "d").format("YYYYMMDD");
      const pastTasks = [
        taskFactory(pastId, { text: "Completed task", checked: true }),
        taskFactory(pastId, { text: "Another completed task", checked: true }),
      ];
      toDoListRepository.update(pastId, pastTasks);
    }
  },
};
