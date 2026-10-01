<template>
  <transition name="fade">
    <div v-if="show" id="splashScreen" class="splash-screen" ref="splashScreen" :style="latticeStyle">
      <div class="splash-lattice"></div>
      <div class="splash-content">
        <img v-if="darkTheme" class="logo" src="/img/itq-todo-logo-white.svg" alt="ITQ Todo" />
        <img v-else class="logo" src="/img/itq-todo-logo-color.svg" alt="ITQ Todo" />
        <div class="splash-stamp">ITQ · UPV-CSIC</div>
        <div class="splash-lattice-name">
          <i class="ph ph-hexagon"></i>
          {{ $t("about.zeoliteToday", [latticeName]) }}
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import zeoliteHelper from "../helpers/zeoliteHelper";

export default {
  name: "splashScreen",
  data() {
    return {
      show: true,
      darkTheme: this.$store.getters.config.darkTheme,
      lattice: zeoliteHelper.getTodayLattice(),
    };
  },
  computed: {
    latticeName: function () {
      return this.lattice.fullName;
    },
    // Same per-day pore silhouette the app background uses, so the splash
    // flows into the app instead of cutting from a flat colour.
    latticeStyle: function () {
      return {
        "--splash-lattice-mask": this.lattice.mask,
        "--splash-lattice-size": this.lattice.size,
      };
    },
  },
  methods: {
    hideSplash: function () {
      this.show = false;
    },
  },
};
</script>

<style scoped>
.splash-screen {
  width: 100%;
  height: 100%;
  z-index: 1060;
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-color: #fcfcfc;
  background-image: radial-gradient(ellipse at 50% 42%, rgba(94, 110, 242, 0.09) 0%, rgba(94, 110, 242, 0) 62%);
}

.dark-theme .splash-screen {
  background-color: #13171d;
  background-image: radial-gradient(ellipse at 50% 42%, rgba(94, 110, 242, 0.16) 0%, rgba(94, 110, 242, 0) 62%);
}

/* Static (no animation, no blur) lattice layer, faded out towards the edges
   so the logo stays the focus. */
.splash-lattice {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background-color: var(--accent-color, #5e6ef2);
  -webkit-mask-image: var(--splash-lattice-mask);
  mask-image: var(--splash-lattice-mask);
  -webkit-mask-size: var(--splash-lattice-size, 40px 40px);
  mask-size: var(--splash-lattice-size, 40px 40px);
  -webkit-mask-repeat: repeat;
  mask-repeat: repeat;
  pointer-events: none;
}

.dark-theme .splash-lattice {
  opacity: 0.16;
}

.splash-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
}

.logo {
  width: 15rem;
  max-width: 70vw;
  animation: splashLogoIn 0.8s cubic-bezier(0.2, 1, 0.1, 1) both;
}

.splash-stamp {
  font-size: 0.72rem;
  letter-spacing: 0.14rem;
  text-transform: uppercase;
  color: #b7b7b7;
  animation: splashFadeUp 0.7s ease 0.35s both;
}

.dark-theme .splash-stamp {
  color: #5d646d;
}

.splash-lattice-name {
  font-size: 0.76rem;
  color: #8c93a0;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: splashFadeUp 0.7s ease 0.55s both;
}

.dark-theme .splash-lattice-name {
  color: #7d8590;
}

@keyframes splashLogoIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes splashFadeUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .logo,
  .splash-stamp,
  .splash-lattice-name {
    animation: none;
  }
}

.fade-leave-active {
  transition: opacity 1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
