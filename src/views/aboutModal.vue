<template>
  <div class="modal fade" id="aboutModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ $t("about.about") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div class="d-flex flex-column" style="text-align: center; margin-top: 10px">
            <img
              class="logo align-self-center"
              src="/img/itq-todo-logo-color.svg"
              alt="ITQ Todo"
              title="ITQ Todo Logo"
              width="180"
            />
            <img
              class="logo logo-white align-self-center"
              src="/img/itq-todo-logo-white.svg"
              alt="ITQ Todo"
              title="ITQ Todo Logo"
              width="180"
            />
            <span class="mt-3 mb-2" style="font-size: 0.75rem">{{ $t("about.version") }} {{ version }}</span>
          </div>
          <div class="horizontal-divider mt-2 mb-3"></div>
          <div class="text-center px-2" style="line-height: 1.5">
            <p class="mb-2" style="font-size: 0.85rem">{{ $t("about.identity") }}</p>
            <p class="mb-1" style="font-size: 0.72rem; opacity: 0.6">
              <i class="ph ph-hexagon" style="font-size: 0.8rem"></i> {{ $t("about.zeoliteToday", [zeoliteName]) }}
            </p>
            <p class="mb-0" style="font-size: 0.68rem; opacity: 0.5">{{ $t("about.freeSoftware") }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/* global __APP_VERSION__ */
// __APP_VERSION__ is replaced at build time by Vite from package.json.
// See vite.config.mjs → define.
import zeoliteHelper from "../helpers/zeoliteHelper";

export default {
  name: "aboutModal",
  data() {
    return {
      version: __APP_VERSION__,
    };
  },
  computed: {
    zeoliteName: function () {
      return zeoliteHelper.getTodayLattice().fullName;
    },
  },
};
</script>

<style scoped>
.modal-dialog {
  max-width: 360px;
}

a,
a:hover {
  color: unset;
}

.visit-site {
  cursor: pointer;
}
</style>

<style>
.logo-white {
  display: none;
}

.dark-theme {
  .modal-dialog .logo {
    display: none;
  }
  .modal-dialog .logo-white {
    display: block;
    opacity: 0.95;
  }
}
</style>
