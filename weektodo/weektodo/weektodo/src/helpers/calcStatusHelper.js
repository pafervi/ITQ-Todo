const STATUSES = [
  { key: "queued", icon: "ph-fill ph-hourglass", color: "#f9d54a", labelKey: "todoDetails.calcQueued" },
  { key: "running", icon: "ph-fill ph-arrows-clockwise", color: "#5e6ef2", labelKey: "todoDetails.calcRunning" },
  { key: "done", icon: "ph-fill ph-check-circle", color: "#10b981", labelKey: "todoDetails.calcDone" },
  { key: "failed", icon: "ph-fill ph-x-circle", color: "#ed544b", labelKey: "todoDetails.calcFailed" },
  { key: "review", icon: "ph-fill ph-eye", color: "#8b5cf6", labelKey: "todoDetails.calcReview" },
];

export default {
  list: STATUSES,
  find(key) {
    return STATUSES.find((s) => s.key === key);
  },
  colorFor(key) {
    let s = this.find(key);
    return s ? s.color : "#9ca3af";
  },
  iconFor(key) {
    let s = this.find(key);
    return s ? s.icon : "ph ph-question";
  },
  labelKeyFor(key) {
    let s = this.find(key);
    return s ? s.labelKey : "";
  },
};
