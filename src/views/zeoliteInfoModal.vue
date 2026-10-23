<template>
  <div class="modal fade" id="zeoliteInfoModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i :class="themeIcon"></i>
            {{ themeLabel }}
          </h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div class="zi-hero">
            <!-- Zeolites keep the historical repeating-mask background; every
                 other theme renders the item's inline SVG shape instead,
                 scaled up to fill the hero so the molecule or unit cell is
                 the actual visual of the card. -->
            <div v-if="useMask" class="zi-lattice" :style="latticeStyle"></div>
            <svg
              v-else
              class="zi-svg"
              :viewBox="z.viewBox || '0 0 100 100'"
              v-html="z.svgShape"
            ></svg>
            <div class="zi-code">{{ z.code }}</div>
          </div>

          <div class="zi-name">{{ z.fullName }}</div>

          <div class="zi-facts">
            <!-- First chip: theme-specific metadata (pore ring for zeolites,
                 formula for organic/oxide, archetype for photochem). -->
            <span v-if="metaChip" class="zi-chip">
              <i :class="themeIcon"></i>
              {{ metaChip }}
            </span>
            <!-- ITQ provenance badge only for zeolites that came from the ITQ. -->
            <span class="zi-chip zi-chip-itq" v-if="z.itq">
              {{ $t("ui.zeoliteFromItq") }}<template v-if="z.year"> ({{ z.year }})</template>
            </span>
            <!-- Year chip for themes where year is interesting (organic). -->
            <span class="zi-chip" v-else-if="z.year">
              <i class="ph ph-calendar"></i>{{ z.year }}
            </span>
          </div>

          <p class="zi-note">{{ z.note }}</p>

          <div class="zi-actions">
            <button type="button" class="zi-action-btn" @click="downloadSvg"
              :title="$t('ui.downloadSvgTitle') || 'Download the shape as an SVG file'">
              <i class="ph ph-download-simple"></i>
              {{ $t('ui.downloadSvg') || 'Download SVG' }}
            </button>
          </div>

          <p class="zi-foot">{{ $t("ui.zeoliteInfoFoot") }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import themesHelper from "../helpers/themesHelper";

export default {
  name: "zeoliteInfoModal",
  methods: {
    // Export the current theme item's SVG shape as a standalone .svg file.
    // Rebuilds a complete <svg> element around the raw svgShape fragment so
    // the download is a valid, viewable file (not a bare content snippet).
    // Colour is baked as the current accent so the saved file renders the
    // same way outside the app, where currentColor would otherwise fall
    // back to black.
    downloadSvg: function () {
      let item = this.z;
      if (!item || !item.svgShape) return;
      let accent = this.$store.getters.config.accentColor || "#5e6ef2";
      let viewBox = item.viewBox || "0 0 100 100";
      // Wrap into a full standalone SVG, pin currentColor to the accent via
      // a wrapping <g color=...> so inner elements that use currentColor
      // render in that colour.
      let svg =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '" width="400" height="400">' +
        '<g color="' + accent + '">' + item.svgShape + '</g>' +
        '</svg>';
      let blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      let url = URL.createObjectURL(blob);
      let a = document.createElement("a");
      a.href = url;
      // Filename: themeItem code sluggified, fall back to "theme-item".
      let slug = (item.code || "theme-item").toString().replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase();
      a.download = slug + ".svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Release the blob url on next tick so the download has a chance to
      // start before the handle is revoked.
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },
  },
  computed: {
    z: function () {
      return themesHelper.getTodayItem(this.$store.getters.config);
    },
    themeActive: function () {
      return themesHelper.getActive(this.$store.getters.config);
    },
    useMask: function () {
      // Only zeolites ship a CSS mask; other themes render their SVG inline.
      return this.themeActive.id === "zeolites" && !!this.z.mask;
    },
    themeIcon: function () {
      switch (this.themeActive.id) {
        case "organic": return "ph ph-atom";
        case "oxides": return "ph ph-cube";
        case "photochem": return "ph ph-sun";
        case "zeolites":
        default: return "ph ph-hexagon";
      }
    },
    themeLabel: function () {
      return this.$t(this.themeActive.todayLabelKey) || this.$t("ui.zeoliteInfoTitle");
    },
    metaChip: function () {
      // Which secondary piece of info to pin as the first chip. Organic
      // leans on its formula; oxides on cell family; photochem on its
      // mechanism family; zeolites on the pore ring size.
      switch (this.themeActive.id) {
        case "organic": return this.z.formula || "";
        case "oxides": return this.z.formula || this.z.meta || "";
        case "photochem": return this.z.meta || "";
        case "zeolites":
        default: return this.z.meta || "";
      }
    },
    latticeStyle: function () {
      // Only used when useMask is true (zeolites). Keeps the historic
      // repeating-mask tint so the splash and the info modal stay visually
      // paired for Pau's default theme.
      return {
        "-webkit-mask-image": this.z.mask,
        "mask-image": this.z.mask,
        "-webkit-mask-size": this.z.maskSize || this.z.size,
        "mask-size": this.z.maskSize || this.z.size,
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
  height: 140px;
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

/* Inline SVG for the non-zeolite themes: the shape owns the hero, tinted
   with the accent via currentColor. */
.zi-svg {
  position: absolute;
  inset: 10px;
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  color: var(--accent-color, #5e6ef2);
  opacity: 0.85;
}

.zi-code {
  position: relative;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--accent-color, #5e6ef2);
  background: rgba(255, 255, 255, 0.75);
  padding: 2px 10px;
  border-radius: 8px;
  backdrop-filter: blur(2px);

  .dark-theme & {
    background: rgba(28, 31, 34, 0.75);
  }
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

.zi-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 10px 0 14px;
}

.zi-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  padding: 6px 12px;
  border-radius: 999px;
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 10%, transparent);
  color: var(--accent-color, #5e6ef2);
  border: 1px solid color-mix(in srgb, var(--accent-color, #5e6ef2) 25%, transparent);
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;

  &:hover {
    background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 18%, transparent);
    transform: translateY(-1px);
  }

  .dark-theme & {
    background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 18%, transparent);
    color: #c7d0ff;
    border-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 40%, transparent);
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
