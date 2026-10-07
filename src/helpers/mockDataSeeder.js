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
        folderPath: "C:\\Users\\pafervi2\\calculos\\MFI_defects",
        tasks: [
          { text: "Generar defectos con MACE-MP en la celda 3x3x3", priority: 3, tags: ["MACE", "DFT"], deadline: d(-2) },
          { text: "Lanzar barrido de vacantes de Al en VASP", priority: 2, tags: ["VASP"], deadline: d(0), time: "10:00" },
          { text: "Revisar convergencia de las TS con PoTS", priority: 2, tags: ["PoTS"], deadline: d(1) },
          { text: "Comparar energias DFT vs MLIP", priority: 1, tags: ["MACE", "DFT"], deadline: d(5) },
          { text: "Actualizar notebook de analisis", priority: 0, tags: ["writing"], checked: true },
          { text: "Reunion semanal con Mercedes", priority: 1, tags: ["meeting"], deadline: d(2), time: "09:30" },
        ],
      },
      {
        listName: "MACE Potentials",
        archived: false,
        color: "#06b6d4",
        kind: "activelearning",
        tasks: [
          { text: "Reentrenar potencial con nuevos frames", priority: 3, tags: ["MACE", "training"], deadline: d(-1) },
          { text: "Validar fuerzas contra test set", priority: 2, tags: ["MACE"], deadline: d(3) },
          { text: "Documentar hiperparametros usados", priority: 0, tags: ["writing"], checked: true },
          { text: "Subir checkpoint a djangochem", priority: 1, tags: ["djangochem"] },
        ],
      },
      {
        listName: "PoTS Automation",
        archived: false,
        tasks: [
          { text: "Arreglar bug en la busqueda de TS automatica", priority: 3, tags: ["PoTS", "bug"], deadline: d(0) },
          { text: "Anadir soporte para geometrias MFI custom", priority: 2, tags: ["PoTS"], deadline: d(7) },
          { text: "Escribir tests unitarios", priority: 1, tags: ["testing"] },
          { text: "Code review con Rafael", priority: 1, tags: ["meeting"], deadline: d(4), time: "16:00" },
        ],
      },
      {
        listName: "CeO2 Polaron Study",
        archived: false,
        color: "#f97316",
        folderPath: "C:\\Users\\pafervi2\\calculos\\CeO2_polarones",
        tasks: [
          { text: "Calcular energias de formacion de vacantes O", priority: 2, tags: ["VASP", "DFT"], deadline: d(-5) },
          { text: "Mapear localizacion de polarones Ce3+", priority: 2, tags: ["DFT"], deadline: d(10) },
          { text: "Comparar con literatura de Van Speybroeck", priority: 0, tags: ["reading"], checked: true },
        ],
      },
      {
        listName: "Becaria: Laura",
        archived: false,
        color: "#10b981",
        tasks: [
          { text: "Onboarding y accesos al cluster", priority: 1, tags: ["onboarding"], checked: true },
          { text: "Introduccion al proyecto MFI", priority: 1, tags: ["onboarding"], checked: true },
          { text: "Primeras tareas: correr ejemplos VASP", priority: 2, tags: ["VASP"], deadline: d(1) },
          { text: "Reunion de seguimiento semanal", priority: 1, tags: ["meeting"], deadline: d(3), time: "12:00" },
        ],
      },
      {
        listName: "Reunion de grupo - viernes",
        archived: false,
        kind: "meeting",
        color: "#ed56a1",
        tasks: [
          { text: "Ronda de estado por persona", priority: 1, tags: ["meeting"] },
          { text: "Revisar tiempo de cluster disponible", priority: 1, tags: ["meeting"] },
          { text: "Fecha del proximo seminario interno", priority: 0, tags: ["meeting"], checked: true },
        ],
      },
      {
        listName: "Ideas / Backlog",
        archived: false,
        tasks: [
          { text: "Explorar transfer learning entre zeolitas", priority: 0, tags: ["idea"] },
          { text: "Probar active learning en el pipeline de PoTS", priority: 0, tags: ["idea", "PoTS"] },
          { text: "Leer paper nuevo de MACE off-equilibrium", priority: 0, tags: ["reading"] },
        ],
      },
      {
        listName: "Viaje: ACS Fall Meeting",
        archived: true,
        tasks: [
          { text: "Reservar vuelos", priority: 1, tags: ["travel"], checked: true },
          { text: "Reservar alojamiento", priority: 1, tags: ["travel"], checked: true },
          { text: "Preparar poster", priority: 2, tags: ["writing", "travel"], checked: true },
          { text: "Gestionar dietas", priority: 0, tags: ["travel"], checked: true },
        ],
      },
      {
        // One task left on purpose: check it off to see the "Convergido,
        // todo hecho" banner and the confetti burst fire immediately.
        listName: "Demo: completa la ultima tarea",
        archived: false,
        color: "#2dbd6e",
        tasks: [
          { text: "Esta ya esta hecha", priority: 0, tags: [], checked: true },
          { text: "Marca esta y mira que pasa", priority: 0, tags: [] },
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
      { text: "Responder emails pendientes", priority: 0, tags: [] },
      { text: "Revisar calculo lanzado anoche", priority: 2, tags: ["VASP"], time: "09:00" },
      { text: "Comer con el grupo", priority: 0, tags: [], time: "14:00" },
      { text: "Preparar slides para la reunion de manana", priority: 1, tags: ["writing"], deadline: todayId },
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
        taskFactory(pastId, { text: "Tarea completada", checked: true }),
        taskFactory(pastId, { text: "Otra tarea completada", checked: true }),
      ];
      toDoListRepository.update(pastId, pastTasks);
    }
  },
};
