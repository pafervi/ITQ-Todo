<template>
  <div class="modal fade" id="zeoliteInfoModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="ph ph-hexagon"></i> {{ $t("ui.zeoliteInfoTitle") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div class="zi-hero">
            <div class="zi-lattice" :style="latticeStyle"></div>
            <div class="zi-code">{{ z.code }}</div>
          </div>

          <div class="zi-name">{{ z.fullName }}</div>

          <div class="zi-facts">
            <span class="zi-chip"><i class="ph ph-hexagon"></i> {{ z.ring }}</span>
            <span class="zi-chip zi-chip-itq" v-if="z.itq">
              {{ $t("ui.zeoliteFromItq") }}<template v-if="z.year"> ({{ z.year }})</template>
            </span>
          </div>

          <p class="zi-note">{{ z.note }}</p>

          <p class="zi-foot">{{ $t("ui.zeoliteInfoFoot") }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import zeoliteHelper from "../helpers/zeoliteHelper";

export default {
  name: "zeoliteInfoModal",
  computed: {
    z: function () {
      return zeoliteHelper.getTodayLattice();
    },
    latticeStyle: function () {
      // Reuse the same mask that paints the app background, tinted with the
      // accent, so the card shows exactly today's pore silhouette.
      return {
        "-webkit-mask-image": this.z.mask,
        "mask-image": this.z.mask,
        "-webkit-mask-size": this.z.size,
        "mask-size": this.z.size,
        "-webkit-mask-repeat": "repeat",
        "mask-repeat": "repeat",
      };
    },
  },
};
</script>

<style scoped lang="scss">
.modal-dialog {
  max-width: 400px;
}

.modal.fade .modal-dialog {
  transition: transform 0.28s cubic-bezier(0.2, 1, 0.1, 1), opacity 0.22s ease-out;
  transform: scale(0.96);
  opacity: 0;
}

.modal.show .modal-dialog {
  transform: scale(1);
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .modal.fade .modal-dialog {
    transition: none;
    transform: none;
    opacity: 1;
  }
}

.zi-hero {
  position: relative;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 8%, transparent);
  margin-bottom: 14px;
}

.zi-lattice {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  background-color: var(--accent-color, #5e6ef2);
}

.zi-code {
  position: relative;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--accent-color, #5e6ef2);
}

.zi-name {
  text-align: center;
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.zi-facts {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.zi-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  padding: 4px 11px;
  border-radius: 999px;
  background-color: #eef0f4;
  color: #3c3c3c;

  .dark-theme & {
    background-color: #21262d;
    color: #c9d1d9;
  }
}

.zi-chip-itq {
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 16%, transparent);
  color: var(--accent-color, #5e6ef2);
  font-weight: 600;
}

.zi-note {
  text-align: center;
  font-size: 0.85rem;
  color: #4b5158;
  margin-bottom: 14px;
  line-height: 1.45;

  .dark-theme & {
    color: #b0b3b8;
  }
}

.zi-foot {
  text-align: center;
  font-size: 0.7rem;
  color: grey;
  margin: 0;

  .dark-theme & {
    color: #8b949e;
  }
}
</style>
