<template>
  <div v-if="tags.length" class="tag-filter-bar">
    <span
      v-for="tag in tags"
      :key="tag"
      class="tag-filter-chip"
      :class="{ active: activeTag === tag }"
      :style="activeTag === tag ? { backgroundColor: tagColor(tag), color: 'white' } : {}"
      @click="toggle(tag)"
    >{{ tag }}</span>
    <span v-if="activeTag" class="tag-filter-clear" @click="toggle(activeTag)">
      <i class="bi-x-circle"></i> {{ $t("ui.showAll") }}
    </span>
  </div>
</template>

<script>
import tagHelper from "../helpers/tagHelper";

export default {
  name: "tagFilterBar",
  methods: {
    tagColor: function (tag) {
      return tagHelper.colorForTag(tag);
    },
    toggle: function (tag) {
      this.$store.commit("setActiveTagFilter", this.activeTag === tag ? null : tag);
    },
  },
  computed: {
    activeTag: function () {
      return this.$store.getters.activeTagFilter;
    },
    tags: function () {
      let set = new Set();
      let lists = this.$store.getters.todoLists;
      Object.values(lists).forEach((list) => {
        (list || []).forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
      });
      return Array.from(set).sort();
    },
  },
};
</script>

<style scoped lang="scss">
.tag-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 2px 20px 16px 20px;
  margin-top: 0px;
  margin-bottom: 0px;
}

.tag-filter-chip {
  font-size: var(--fs-badge, 0.72rem);
  padding: 2px 10px;
  border-radius: 12px;
  cursor: pointer;
  background-color: #eaecef;
  color: #3c3c3c;

  .dark-theme & {
    background-color: #121a33;
    color: #c8cfe8;
    border: 1px solid rgba(94, 110, 242, 0.14);
  }
}

.tag-filter-chip.active {
  font-weight: 600;
}

.tag-filter-clear {
  font-size: var(--fs-badge, 0.72rem);
  color: grey;
  cursor: pointer;
  margin-left: 4px;

  &:hover {
    color: black;
  }

  .dark-theme &:hover {
    color: white;
  }
}
</style>
