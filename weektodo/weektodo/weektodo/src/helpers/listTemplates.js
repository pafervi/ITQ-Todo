const defaultTemplates = [
    {
      id: "blank",
      labelKey: "ui.templateBlank",
      icon: "bi-file-earmark",
      color: "",
      tasks: [],
    },
    {
      id: "research",
      labelKey: "ui.templateResearch",
      icon: "bi-flask",
      color: "#8b5cf6",
      tasks: [
        "Definir objetivos y alcance",
        "Revision bibliografica",
        "Preparar calculos / modelos",
        "Analizar resultados",
        "Redactar informe / paper",
      ],
    },
    {
      id: "intern",
      labelKey: "ui.templateIntern",
      icon: "bi-person-badge",
      color: "#10b981",
      tasks: [
        "Onboarding y accesos",
        "Introduccion al proyecto",
        "Primeras tareas asignadas",
        "Reunion de seguimiento semanal",
      ],
    },
    {
      id: "trip",
      labelKey: "ui.templateTrip",
      icon: "bi-airplane",
      color: "#5e6ef2",
      tasks: [
        "Reservar vuelos",
        "Reservar alojamiento",
        "Preparar presentacion / poster",
        "Gestionar visado / dietas",
      ],
    },
    {
      id: "activelearning",
      labelKey: "ui.templateActiveLearning",
      icon: "bi-cpu",
      color: "#06b6d4",
      kind: "activelearning",
      tasks: [
        "Seleccionar frames de la trayectoria",
        "Generar inputs VASP (singlepoints)",
        "Lanzar calculos en el cluster",
        "Parsear OUTCARs a extxyz",
        "Reentrenar modelo MACE",
        "Validar y comparar con el modelo anterior",
      ],
    },
    {
      id: "paper",
      labelKey: "ui.templatePaper",
      icon: "bi-file-earmark-text",
      color: "#f97316",
      tasks: [
        "Definir estructura y mensaje principal",
        "Generar figuras y tablas",
        "Redactar primer borrador",
        "Revision interna (coautores)",
        "Responder comentarios / revision",
        "Enviar a la revista",
      ],
    },
    {
      id: "meeting",
      labelKey: "ui.templateMeeting",
      icon: "bi-people",
      color: "#ed56a1",
      promptForName: true,
      kind: "meeting",
      tasks: ["Temas a comentar", "Seguimiento de la ultima reunion"],
    },
    {
      id: "conference",
      labelKey: "ui.templateConference",
      icon: "bi-mic-fill",
      color: "#e11d48",
      promptForDate: true,
      kind: "conference",
      tasks: [
        "Preparar diapositivas",
        "Seleccionar resultados clave a mostrar",
        "Ensayar la charla",
        "Preparar portatil / clicker de repuesto",
        "Subir diapositivas al portal del congreso",
      ],
    },
  ];

export default {
  // Pristine, code-defined defaults. Never mutated at runtime.
  defaultTemplates: defaultTemplates,

  // Back-compat: components that read `.templates` keep working. This is the
  // plain default list; use resolve(config) when you need the user's edits.
  templates: defaultTemplates,

  // The task list a template actually creates with, honouring the user's
  // per-template edits saved in config.customTemplates (see editTemplatesModal).
  // Only the `tasks` array is overridable; identity/behaviour (icon, kind,
  // promptForName/Date) always come from the code default.
  tasksFor(tpl, config) {
    let custom = config && config.customTemplates && config.customTemplates[tpl.id];
    if (custom && Array.isArray(custom.tasks)) return custom.tasks.slice();
    return tpl.tasks.slice();
  },

  // Whether this template's tasks have been customised by the user.
  isCustomized(tplId, config) {
    return !!(config && config.customTemplates && config.customTemplates[tplId] && Array.isArray(config.customTemplates[tplId].tasks));
  },

  // Templates a user can edit the checklist of: everything except the empty
  // "blank" one (which is meant to stay empty).
  editableTemplates() {
    return defaultTemplates.filter((t) => t.id !== "blank");
  },
};
