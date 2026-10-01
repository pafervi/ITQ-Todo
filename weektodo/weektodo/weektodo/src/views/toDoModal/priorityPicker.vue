<template>
  <div class="dropdown-center">
    <i id="btnTaskPriorityPicker" class="header-menu-icons" :class="priorityIconClass" type="button"
      data-bs-toggle="dropdown" :style="priorityIconStyle" :title="$t('todoDetails.priority')"></i>

    <ul class="dropdown-menu priority-picker-dropdown" aria-labelledby="btnTaskPriorityPicker">
      <li>
        <button class="dropdown-item" type="button" @click="selectPriority(0)">
          <i class="bi-flag"></i> <span>{{ $t('todoDetails.priorityNone') }}</span>
        </button>
      </li>
      <li>
        <button class="dropdown-item" type="button" @click="selectPriority(1)">
          <i class="bi-flag-fill priority-low-icon"></i> <span>{{ $t('todoDetails.priorityLow') }}</span>
        </button>
      </li>
      <li>
        <button class="dropdown-item" type="button" @click="selectPriority(2)">
          <i class="bi-flag-fill priority-medium-icon"></i> <span>{{ $t('todoDetails.priorityMedium') }}</span>
        </button>
      </li>
      <li>
        <button class="dropdown-item" type="button" @click="selectPriority(3)">
          <i class="bi-flag-fill priority-high-icon"></i> <span>{{ $t('todoDetails.priorityHigh') }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "priorityPicker",
  emits: ['prioritySelected'],
  props: {
    priority: { required: true, type: Number },
  },
  methods: {
    selectPriority(priority) {
      this.$emit('prioritySelected', priority);
    },
  },
  computed: {
    priorityIconClass() {
      return this.priority ? 'bi-flag-fill' : 'bi-flag';
    },
    priorityIconStyle() {
      const colors = { 1: '#5e6ef2', 2: '#f97316', 3: '#ed544b' };
      return this.priority ? `color: ${colors[this.priority]}` : '';
    },
  },
}
</script>

<style scoped lang="scss">
@import "/src/assets/style/globalVars.scss";

.header-menu-icons {
  margin-left: 6px;
  @include btn-icon;
}

.priority-picker-dropdown {
  min-width: 10rem;

  i {
    margin-right: 8px;
  }
}

.priority-low-icon {
  color: #5e6ef2;
}

.priority-medium-icon {
  color: #f97316;
}

.priority-high-icon {
  color: #ed544b;
}
</style>
