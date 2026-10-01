<template>
  <div class="dropdown-center">
    <i id="btnCalcStatusPicker" class="header-menu-icons" :class="icon" type="button" data-bs-toggle="dropdown"
      :style="calcStatus ? 'color: ' + color : ''" :title="$t('todoDetails.calcStatus')"></i>

    <ul class="dropdown-menu calc-status-dropdown px-2" aria-labelledby="btnCalcStatusPicker">
      <li v-for="s in statuses" :key="s.key">
        <button class="dropdown-item" type="button" @click="selectStatus(s.key)">
          <i :class="s.icon" :style="'color: ' + s.color"></i> <span>{{ $t(s.labelKey) }}</span>
        </button>
      </li>
      <li>
        <hr class="dropdown-divider" />
      </li>
      <li>
        <button class="dropdown-item" type="button" @click="selectStatus(null)">
          <i class="ph ph-x-circle"></i> <span>{{ $t("todoDetails.calcNone") }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
import calcStatusHelper from "../../helpers/calcStatusHelper";

export default {
  name: "calcStatusPicker",
  emits: ["calcStatusSelected"],
  props: {
    calcStatus: { required: false, type: String, default: null },
  },
  data() {
    return {
      statuses: calcStatusHelper.list,
    };
  },
  methods: {
    selectStatus(key) {
      this.$emit("calcStatusSelected", key);
    },
  },
  computed: {
    icon: function () {
      return this.calcStatus ? calcStatusHelper.iconFor(this.calcStatus) : "ph ph-cpu";
    },
    color: function () {
      return calcStatusHelper.colorFor(this.calcStatus);
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

.calc-status-dropdown {
  min-width: 11rem;

  .dropdown-item i {
    margin-right: 8px;
  }
}
</style>
