// Catalogue of list templates used by newListTemplateModal and
// editTemplatesModal. The only built-in entry is "blank"; every other template
// is created by the user in editTemplatesModal and lives in
// config.userTemplates as [{ id, name, icon, color, tasks }], merged after
// the built-in one by all().

const TEMPLATES = [
  {
    id: "blank",
    labelKey: "ui.templateBlank",
    icon: "ph ph-note",
    color: "",
    kind: "",
    tasks: [],
  },
];

function defaultTasksFor(tpl) {
  return Array.isArray(tpl.tasks) ? tpl.tasks.slice() : [];
}

// Icons offered for user templates; all of them exist in the bundled
// Phosphor subset (see assets/style/phosphorIcons.scss).
const USER_ICONS = [
  "ph ph-note",
  "ph ph-article",
  "ph ph-file-text",
  "ph ph-target",
  "ph ph-atom",
  "ph ph-cpu",
  "ph ph-users",
  "ph ph-handshake",
  "ph ph-airplane-takeoff",
  "ph ph-microphone-stage",
  "ph ph-chart-bar",
  "ph ph-sparkle",
  "ph ph-stack",
  "ph ph-hexagon",
];

const USER_COLORS = ["", "#77e785", "#06b6d4", "#5e6ef2", "#8b5cf6", "#ed56a1", "#ed544b", "#f97316", "#f9d54a", "#10b981"];

function userTemplatesFrom(config) {
  let list = config && Array.isArray(config.userTemplates) ? config.userTemplates : [];
  return list
    .filter((u) => u && u.id)
    .map((u) => ({
      id: u.id,
      name: String(u.name || ""),
      labelKey: "",
      icon: u.icon || USER_ICONS[0],
      color: u.color || "",
      kind: "",
      tasks: Array.isArray(u.tasks) ? u.tasks.slice() : [],
      isUser: true,
    }));
}

export default {
  // Full catalogue, in UI order.
  templates: TEMPLATES,

  iconChoices: USER_ICONS,
  colorChoices: USER_COLORS,

  // Built-in templates followed by the user's own, in UI order.
  all(config) {
    return TEMPLATES.concat(userTemplatesFrom(config));
  },

  // Templates the user can edit in editTemplatesModal: only their own.
  editableTemplates(config) {
    return userTemplatesFrom(config);
  },

  // Display name: the user's own name, or the translated built-in label.
  labelFor(tpl, translate) {
    if (!tpl) return "";
    if (tpl.isUser) return tpl.name || "";
    return translate ? translate(tpl.labelKey) : tpl.labelKey;
  },

  newUserId() {
    return "user-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  // Returns the tasks for a template.
  tasksFor(tpl) {
    return tpl ? defaultTasksFor(tpl) : [];
  },
};
