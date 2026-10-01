<template>
  <div class="app-toolbar" :class="{ scrolled: isScrolled }">
    <div class="toolbar-row">
      <div class="toolbar-title-compact" :class="{ visible: !todayOnlyMode || isScrolled }">
        {{ compactTitle }}
      </div>

      <div class="toolbar-segmented" role="tablist" :aria-label="$t('settings.todayOnlyMode')">
        <button
          type="button"
          class="segmented-option"
          :class="{ active: todayOnlyMode }"
          role="tab"
          @click="setMode(true)"
        >{{ $t('ui.today') }}</button>
        <button
          type="button"
          class="segmented-option"
          :class="{ active: !todayOnlyMode }"
          role="tab"
          @click="setMode(false)"
        >{{ $t('ui.week') }}</button>
        <span class="segmented-pill" :class="{ right: !todayOnlyMode }"></span>
      </div>

      <div class="toolbar-actions">
        <button
          type="button"
          class="toolbar-search-field"
          data-bs-toggle="modal"
          data-bs-target="#searchModal"
          :title="$t('ui.search')"
        >
          <i class="ph ph-magnifying-glass"></i>
          <span>{{ $t('ui.toolbarSearchHint') }}</span>
          <kbd>⌘K</kbd>
        </button>
        <i
          class="ph ph-gauge toolbar-icon-btn"
          data-bs-toggle="modal"
          data-bs-target="#missionControlModal"
          :title="$t('ui.missionControl')"
        ></i>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import configRepository from "../../repositories/configRepository";

export default {
  name: "appToolbar",
  props: {
    scrollProgress: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    todayOnlyMode: function () {
      return this.$store.getters.config.todayOnlyMode !== false;
    },
    isScrolled: function () {
      return this.todayOnlyMode && this.scrollProgress > 0.5;
    },
    language: function () {
      return this.$store.getters.config.language;
    },
    compactTitle: function () {
      if (!this.todayOnlyMode) return this.$t("ui.week");
      return moment().locale(this.language).format("dddd, D MMM");
    },
  },
  methods: {
    setMode: function (isToday) {
      if (this.todayOnlyMode === isToday) return;
      this.$store.commit("updateConfig", { val: isToday, key: "todayOnlyMode" });
      configRepository.update(this.$store.getters.config);
    },
  },
};
</script>

<style scoped lang="scss">
.app-toolbar {
  position: sticky;
  top: 0;
  z-index: 3;
  /* "Medium" material: less opaque and less blurred than the sidebar
     (thick), more than the project cards (thin) - the middle step of the
     app's depth hierarchy. */
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s ease, background-color 0.3s ease;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .app-toolbar {
    background-color: #f7f8f9;
  }
}

.app-toolbar.scrolled {
  border-bottom-color: rgba(0, 0, 0, 0.07);
}

.dark-theme .app-toolbar {
  background-color: rgba(13, 17, 23, 0.52);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .dark-theme .app-toolbar {
    background-color: #12161c;
  }
}

.dark-theme .app-toolbar.scrolled {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.toolbar-row {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 10px;
}

.toolbar-title-compact {
  font-size: 0.92rem;
  font-weight: 600;
  text-transform: capitalize;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 0 1 auto;
  min-width: 0;
}

.toolbar-title-compact.visible {
  opacity: 1;
  transform: translateY(0);
}

.toolbar-segmented {
  position: relative;
  display: flex;
  margin: 0 auto;
  background-color: rgba(0, 0, 0, 0.055);
  border-radius: 8px;
  padding: 2px;
  flex-shrink: 0;
}

.dark-theme .toolbar-segmented {
  background-color: rgba(255, 255, 255, 0.07);
}

.segmented-option {
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  padding: 4px 16px;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  color: inherit;
  opacity: 0.65;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.segmented-option.active {
  opacity: 1;
  font-weight: 600;
  color: var(--accent-color, #5e6ef2);
}

.segmented-pill {
  position: absolute;
  top: 2px;
  left: 2px;
  bottom: 2px;
  width: calc(50% - 2px);
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dark-theme .segmented-pill {
  background-color: #343b43;
}

.segmented-pill.right {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .segmented-pill {
    transition: none;
  }
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.toolbar-search-field {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background-color: rgba(0, 0, 0, 0.05);
  color: inherit;
  padding: 5px 9px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background-color 0.2s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

  i {
    font-size: 0.95rem;
    opacity: 0.7;
  }

  span {
    opacity: 0.6;
  }

  kbd {
    font-size: 0.66rem;
    opacity: 0.45;
    background: none;
    padding: 0;
    margin-left: 2px;
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.08);
    transform: scale(1.03);
  }
}

.dark-theme .toolbar-search-field {
  background-color: rgba(255, 255, 255, 0.07);

  &:hover {
    background-color: rgba(255, 255, 255, 0.11);
  }
}

.toolbar-icon-btn {
  font-size: 1.05rem;
  padding: 7px;
  cursor: pointer;
  border-radius: 7px;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    background-color: rgba(0, 0, 0, 0.08);
    color: var(--accent-color, #5e6ef2);
    transform: scale(1.1);
  }
}

.dark-theme .toolbar-icon-btn:hover {
  background-color: rgba(255, 255, 255, 0.11);
}
</style>
