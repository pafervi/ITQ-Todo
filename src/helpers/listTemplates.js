// Catalogue of list templates used by newListTemplateModal and
// editTemplatesModal. Each template defines its icon, color, i18n label and
// its default tasks. Users can override the tasks per-template through
// editTemplatesModal; that override lives in config.customTemplates keyed by
// template id ({ [id]: { tasks: [...] } }), and takes precedence over the
// defaults returned here.

const TEMPLATES = [
  {
    id: "blank",
    labelKey: "ui.templateBlank",
    icon: "ph ph-note",
    color: "",
    kind: "",
    tasks: [],
  },
  {
    id: "active-learning",
    labelKey: "ui.templateActiveLearning",
    icon: "ph ph-atom",
    color: "#5e6ef2",
    kind: "activelearning",
    tasks: [
      "Prepare singlepoint set from NNP trajectories",
      "Launch VASP singlepoints on cluster",
      "Collect OUTCARs and convert to extxyz",
      "Retrain MACE on the updated dataset",
      "Validate against held-out frames",
    ],
  },
  {
    id: "paper",
    labelKey: "ui.templatePaper",
    icon: "ph ph-article",
    color: "#f97316",
    kind: "",
    tasks: [
      "Outline the paper",
      "Draft figures",
      "Write methods",
      "Write results",
      "Write introduction and conclusion",
      "Internal review",
      "Submit",
    ],
  },
  {
    id: "meeting",
    labelKey: "ui.templateMeeting",
    icon: "ph ph-users",
    color: "#10b981",
    kind: "meeting",
    promptForName: true,
    tasks: [
      "Agenda",
      "Topics to discuss",
      "Open questions",
      "Follow-ups",
    ],
  },
  {
    id: "travel",
    labelKey: "ui.templateTravel",
    icon: "ph ph-airplane-takeoff",
    color: "#8b5cf6",
    kind: "",
    tasks: [
      "Book transport",
      "Book accommodation",
      "Register for the event",
      "ITQ travel paperwork",
      "Prepare per diem forms",
      "Keep receipts",
    ],
  },
  {
    id: "conference",
    labelKey: "ui.templateConference",
    icon: "ph ph-microphone-stage",
    color: "#e11d48",
    kind: "",
    promptForDate: true,
    tasks: [
      "Abstract",
      "Outline slides",
      "Build figures",
      "First draft of the talk",
      "Rehearse",
      "Final polish",
    ],
  },
];

function defaultTasksFor(tpl) {
  return Array.isArray(tpl.tasks) ? tpl.tasks.slice() : [];
}

export default {
  // Full catalogue, in UI order.
  templates: TEMPLATES,

  // Templates the user can edit in editTemplatesModal (everything except the
  // "blank" entry, which is intentionally empty).
  editableTemplates() {
    return TEMPLATES.filter((t) => t.id !== "blank");
  },

  // Returns the tasks for a template, honoring the user's override from
  // config.customTemplates if present.
  tasksFor(tpl, config) {
    if (!tpl) return [];
    let custom = config && config.customTemplates ? config.customTemplates[tpl.id] : null;
    if (custom && Array.isArray(custom.tasks)) return custom.tasks.slice();
    return defaultTasksFor(tpl);
  },

  // True when the user has saved a custom task list for this template id.
  isCustomized(id, config) {
    if (!config || !config.customTemplates) return false;
    let entry = config.customTemplates[id];
    return !!(entry && Array.isArray(entry.tasks));
  },
};
