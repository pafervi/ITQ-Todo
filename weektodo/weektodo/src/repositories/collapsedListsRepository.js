import storageRepository from "./storageRepository";

export default {
  load() {
    return storageRepository.get("collapsedListIds") || [];
  },
  update(ids) {
    storageRepository.set("collapsedListIds", ids);
  },
  isCollapsed(id) {
    return this.load().includes(id);
  },
  setCollapsed(id, collapsed) {
    let ids = this.load();
    let index = ids.indexOf(id);
    if (collapsed && index === -1) {
      ids.push(id);
    } else if (!collapsed && index !== -1) {
      ids.splice(index, 1);
    }
    this.update(ids);
  },
};
