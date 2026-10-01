<template>
  <div
    class="header-menu-icons"
    type="button"
    data-bs-toggle="dropdown"
    data-bs-auto-close="outside"
    :title="$t('todoDetails.deadline')"
  >
    <i
      id="btnTaskDeadlinePicker"
      :class="{ 'bi-calendar-check': !hasDeadline, 'bi-calendar-check-fill': hasDeadline }"
    ></i>
  </div>

  <ul
    class="dropdown-menu deadline-picker-dropdown"
    aria-labelledby="btnTaskDeadlinePicker"
  >
    <div class="d-flex align-items-center mx-3">
      <input
        type="date"
        v-model="selectedDate"
        @change="selectDeadline(selectedDate)"
      />
      <i
        class="header-menu-icons bi-trash"
        type="button"
        @click="clearDeadline"
      ></i>
    </div>
  </ul>
</template>

<script>
import moment from "moment";

export default {
  name: "deadlinePicker",
  emits: ["deadlineSelected"],
  data() {
    return {
      selectedDate: "",
    };
  },
  props: {
    deadline: { required: true, type: [String, null] },
  },
  methods: {
    selectDeadline(value) {
      if (!value) {
        this.$emit("deadlineSelected", null);
        return;
      }
      this.$emit("deadlineSelected", moment(value, "YYYY-MM-DD").format("YYYYMMDD"));
    },
    clearDeadline() {
      this.selectedDate = "";
      this.selectDeadline(null);
    },
  },
  watch: {
    deadline: {
      immediate: true,
      handler(newVal) {
        this.selectedDate = newVal ? moment(newVal, "YYYYMMDD").format("YYYY-MM-DD") : "";
      },
    },
  },
  computed: {
    hasDeadline() {
      return !!this.deadline;
    },
  },
};
</script>

<style scoped lang="scss">
@import "/src/assets/style/globalVars.scss";

.header-menu-icons {
  margin-left: 6px;
  @include btn-icon;
}

.bi-trash {
  margin: 0px;
}

input[type="date"] {
  background-color: transparent;
  border: none;
  font-size: 15px;
  outline: unset;
  height: 40px;
  color: #494949;

  .dark-theme & {
    color: #bfbfbf;
    color-scheme: dark;
  }
}
</style>
