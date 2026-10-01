<template>
  <div class="modal fade" id="shortcutsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ $t("ui.shortcuts") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <table class="table">
            <tbody>
              <tr v-for="s in shortcuts" :key="s.key">
                <td class="shortcut-key"><kbd>{{ s.key }}</kbd></td>
                <td class="shortcut-desc">{{ s.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "shortcutsModal",
  computed: {
    shortcuts: function () {
      return [
        { key: "N", desc: this.$t("ui.shortcutNewTask") },
        { key: "T", desc: this.$t("ui.shortcutToday") },
        { key: "← / →", desc: this.$t("ui.shortcutMoveDay") },
        { key: "/", desc: this.$t("ui.shortcutSearch") },
        { key: "Ctrl/Cmd + K", desc: this.$t("ui.shortcutPalette") },
        { key: "D", desc: this.$t("ui.shortcutDeadlines") },
        { key: "?", desc: this.$t("ui.shortcutHelp") },
        { key: "Esc", desc: this.$t("ui.shortcutClose") },
      ];
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 450px;
}

.table {
  color: #212529;
  margin-bottom: 0px;
}

.dark-theme .table {
  color: #fff;
  border-color: #373b3e;
}

.shortcut-key {
  width: 90px;
}

kbd {
  background-color: #eaecef;
  color: #3c3c3c;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.8rem;

  .dark-theme & {
    background-color: #21262d;
    color: #c9d1d9;
  }
}

.shortcut-desc {
  .dark-theme & {
    color: #babbbe;
  }
}
</style>
