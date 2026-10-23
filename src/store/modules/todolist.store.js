import dbRepository from "../../repositories/dbRepository";

const state = {
  todoLists: {},
  cTodoListIds: [],
  selectedDates: [],
};

const getters = {
  todoLists(state) {
    return state.todoLists;
  },
  cTodoListIds(state) {
    return state.cTodoListIds;
  },
  selectedDates(state) {
    return state.selectedDates;
  },
};

const mutations = {
  loadTodoLists(state, obj) {
    state.todoLists[obj.todoListId] = obj.todoList;
  },
  clearTodoList(state, obj) {
    state.todoLists[obj] = [];
  },
  checkTodo(state, obj) {
    state.todoLists[obj.toDoListId][obj.index].checked = !state.todoLists[obj.toDoListId][obj.index].checked;
  },
  moveTodoToEnd(state, obj) {
      state.todoLists[obj.toDoListId].push(state.todoLists[obj.toDoListId].splice(obj.index, 1)[0]);
  },
  addTodo(state, toDo) {
    // Defensive: a brand-new list's entry in state.todoLists is normally
    // created by toDoList.vue's own loadTodoLists dispatch on mount, which
    // is async. Committing tasks for a list right after creating it (demo
    // seeding, "new list from template" with pre-filled tasks) can race
    // ahead of that mount, so make sure the array exists instead of
    // crashing the whole commit on the first task.
    if (!state.todoLists[toDo.listId]) state.todoLists[toDo.listId] = [];
    const list = state.todoLists[toDo.listId];
    // New open tasks land right after the last open task, i.e. ahead of the
    // block of completed (struck-through) tasks that sits at the bottom.
    // Completed tasks being moved in still go to the very end.
    if (toDo.checked) {
      list.push(toDo);
      return;
    }
    let insertAt = list.length;
    while (insertAt > 0 && list[insertAt - 1] && list[insertAt - 1].checked) insertAt--;
    list.splice(insertAt, 0, toDo);
  },
  updateTodo(state, obj) {
    state.todoLists[obj.toDoListId][obj.index].repeatingEvent = null;
    state.todoLists[obj.toDoListId][obj.index].text = obj.text;
  },
  removeTodo(state, obj) {
    state.todoLists[obj.toDoListId].splice(obj.index, 1);
  },
  insertTodo(state, obj) {
    state.todoLists[obj.toDoListId].splice(obj.index, 0, obj.toDo);
  },
  checkAllItems(state, toDoListId) {
    state.todoLists[toDoListId].forEach((toDo) => {
      toDo.checked = true;
    });
  },
  moveUndoneItems(state, obj) {
    for (let i = state.todoLists[obj.origenId].length - 1; i >= 0; i--) {
      if (!state.todoLists[obj.origenId][i].checked) {
        state.todoLists[obj.origenId][i].repeatingEvent = null;
        state.todoLists[obj.origenId][i].listId = obj.destinyId;
        state.todoLists[obj.destinyId].unshift(state.todoLists[obj.origenId][i]);
        state.todoLists[obj.origenId].splice(i, 1);
      }
    }
  },
  loadCustomTodoListsIds(state, obj) {
    state.cTodoListIds = obj;
  },
  newCustomTodoList(state, obj) {
    state.cTodoListIds.push(obj);
    this.commit("loadTodoLists", { todoListId: obj.listId, todoList: [] });
  },
  removeCustomTodoList(state, obj) {
    delete state.todoLists[obj.id];
    state.cTodoListIds.splice(obj.index, 1);
  },
  updateCustomTodoList(state, obj) {
    state.cTodoListIds[obj.index].listName = obj.name;
  },
  setListArchived(state, obj) {
    state.cTodoListIds[obj.index].archived = obj.archived;
  },
  updateCustomListField(state, obj) {
    state.cTodoListIds[obj.index][obj.field] = obj.value;
  },
  // Drag-based reorder of custom projects. Takes { from, to } indices into
  // state.cTodoListIds, pulls the item out and reinserts at the target. The
  // sidebar, the project grid and any computed that reads cTodoListIds
  // react immediately because the array is replaced with a fresh one (Vue
  // picks up the whole-array assignment reliably).
  reorderCustomTodoLists(state, obj) {
    let list = state.cTodoListIds || [];
    let from = obj && typeof obj.from === "number" ? obj.from : -1;
    let to = obj && typeof obj.to === "number" ? obj.to : -1;
    if (from < 0 || to < 0) return;
    if (from >= list.length || to >= list.length) return;
    if (from === to) return;
    let next = list.slice();
    let moved = next.splice(from, 1)[0];
    next.splice(to, 0, moved);
    state.cTodoListIds = next;
  },
  updateSelectedDates(state, selectedDates) {
    state.selectedDates = selectedDates;
  },
};

const actions = {
  loadTodoLists({ commit }, todoListId) {
    return new Promise((resolve) => {
      let db_req = dbRepository.open();
      db_req.onsuccess = function (event) {
        let db = event.target.result;
        var get_req = dbRepository.get(db, "todo_lists", todoListId);
        get_req.onsuccess = function (event) {
          let todoList = event.target.result;
          if (todoList) {
            commit("loadTodoLists", { todoListId: todoListId, todoList: todoList });
          } else {
            commit("loadTodoLists", { todoListId: todoListId, todoList: [] });
            dbRepository.add(db, "todo_lists", todoListId, []);
          }
          resolve();
        };
      };
    });
  },
};

export default {
  namespaced: false,
  state,
  getters,
  actions,
  mutations,
};
