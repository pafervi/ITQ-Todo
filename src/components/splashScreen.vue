<template>
  <transition name="fade">
    <div v-if="show" id="splashScreen" class="splash-screen" ref="splashScreen" :style="latticeStyle">
      <div class="splash-lattice"></div>
      <div class="splash-content">
        <img v-if="darkTheme" class="logo logo-pulse" src="/img/latticetodo-logo-white.svg" alt="LatticeTodo" />
        <img v-else class="logo logo-pulse" src="/img/latticetodo-logo-color.svg" alt="LatticeTodo" />
        <div class="splash-stamp">LatticeTodo</div>
        <div class="splash-greeting">
          <span class="splash-greeting-text">{{ greeting }}</span>
          <span class="splash-greeting-date">{{ dateLine }}</span>
          <span class="splash-year-info">{{ yearInfo }}</span>
        </div>
        <!-- Streak KPI: a quiet number big enough to notice but small enough to
             not steal the show. Hidden when there's nothing to celebrate. -->
        <div v-if="streakCount > 0" class="splash-streak">
          <span class="splash-streak-value">{{ streakCount }}</span>
          <span class="splash-streak-label">{{ $t('ui.streakSplashLabel') || 'day streak' }}</span>
        </div>
        <div class="splash-lattice-name">
          <i :class="themeIcon"></i>
          {{ themeLabel }}: {{ latticeName }}
        </div>
        <!-- Cross-theme teaser: today's item from a different theme (rotates
             by day-of-year), rendered small so the user keeps the four
             themes in their peripheral awareness without the splash
             becoming busy. -->
        <div v-if="crossThemeItem" class="splash-cross-theme" :title="crossThemeItemTitle">
          <i :class="crossThemeIcon"></i>
          <span>{{ crossThemeLabel }} · {{ crossThemeItem.fullName }}</span>
        </div>
        <div class="splash-flavor">"{{ flavorQuote }}"</div>
        <div v-if="pendingLine" class="splash-pending" :class="{ 'splash-pending-empty': pendingCount === 0 }">
          <i :class="pendingCount === 0 ? 'bi-check2-circle' : 'bi-calendar-check'"></i>
          {{ pendingLine }}
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import moment from "moment";
import themesHelper from "../helpers/themesHelper";
import todayHelper from "../helpers/todayHelper";
import streakHelper from "../helpers/streakHelper";

// Rotating one-liners picked by day of the year, so the splash reads a bit
// different every day without ever repeating too soon. Deliberately kept to
// catalysis / materials-adjacent lines so they land for Pau.
const FLAVOR_QUOTES = [
  "A zeolite is a universe of pores.",
  "Entropy favors disorder, unless templated.",
  "Every TS has a story.",
  "Pores remember their templates.",
  "Confinement is the catalyst.",
  "A good descriptor is worth a thousand DFT points.",
  "MACE learns what VASP computes.",
  "Pores shape selectivity, selectivity shapes industry.",
  "The best catalyst is the one that recovers itself.",
  "Behind every reaction there is a geometry.",
  "Framework density is destiny.",
  "Chirality is the quiet magic of zeolites.",
  "An elegant mechanism beats a brute-force scan.",
  "Catalysis: thermodynamics proposes, kinetics decides.",
  "Si, Al, O, and a lot of patience.",
  "Defects are features, not bugs.",
  "An 18-ring opens a whole new chemistry.",
  "Pau, your fellowship is the paper that writes itself.",
  "Great science is 1% insight, 99% squeue.",
  "A perfect H+ is still a myth.",
];

export default {
  name: "splashScreen",
  data() {
    return {
      show: true,
      darkTheme: this.$store.getters.config.darkTheme,
      streakCount: 0,
      // Open tasks scheduled for today. null until the data is really loaded,
      // so the splash never claims "nothing scheduled" while lists are still
      // being read.
      pendingCount: null,
      pendingFallbackTimer: null,
    };
  },
  mounted() {
    // App.vue announces when the lists are loaded (and old tasks rolled over
    // to today); the timer is only a safety net in case that never fires.
    window.addEventListener("wtd-initial-load-done", this.refreshPending);
    this.pendingFallbackTimer = setTimeout(this.refreshPending, 3500);
    // Streak comes from an async DB query. The splash fades out around the
    // same time (handled by background.js), so we just update if we are
    // still visible when the number lands.
    streakHelper.computeStreak().then((v) => {
      this.streakCount = v || 0;
    });
  },
  unmounted() {
    window.removeEventListener("wtd-initial-load-done", this.refreshPending);
    clearTimeout(this.pendingFallbackTimer);
  },
  computed: {
    // themeItem and themeActive are computed, not data, so that changing
    // config.activeTheme from Settings re-renders the splash on the fly
    // (the previous data() version resolved once at mount and ignored
    // later changes). getTodayItem is cheap: it hits an in-memory list
    // and does one hash-mod lookup.
    themeItem: function () {
      return themesHelper.getTodayItem(this.$store.getters.config);
    },
    themeActive: function () {
      return themesHelper.getActive(this.$store.getters.config);
    },
    latticeName: function () {
      return this.themeItem.fullName;
    },
    themeLabel: function () {
      return this.$t(this.themeActive.todayLabelKey) || this.themeActive.id;
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
    // Today's item from a different theme than the active one. Rotates
    // by day-of-year so the user eventually sees every theme in this
    // slot, even if they stick to one active theme year-round.
    crossThemeItem: function () {
      return themesHelper.getCrossThemeItem(this.$store.getters.config);
    },
    crossThemeLabel: function () {
      if (!this.crossThemeItem) return "";
      return this.$t(this.crossThemeItem.themeTodayLabelKey) || "";
    },
    crossThemeIcon: function () {
      if (!this.crossThemeItem) return "";
      switch (this.crossThemeItem.themeId) {
        case "organic": return "ph ph-atom";
        case "oxides": return "ph ph-cube";
        case "photochem": return "ph ph-sun";
        case "zeolites":
        default: return "ph ph-hexagon";
      }
    },
    crossThemeItemTitle: function () {
      // Full-text tooltip summarising the cross-theme hint, so users can
      // tell at a glance what the "also today" is pointing at without
      // squinting at the small line.
      if (!this.crossThemeItem) return "";
      return (this.$t('ui.alsoToday') || 'Also today') + ": " + this.crossThemeItem.fullName;
    },
    language: function () {
      return this.$store.getters.config.language || "en";
    },
    // Picks a hour-of-day greeting with a small morale-boost rotation on the
    // "evening" variant, so the splash does not read exactly the same every
    // night. Reuses the i18n strings dayGreeting already needs.
    greeting: function () {
      let h = moment().hour();
      if (h < 12) return this.$t("ui.greetingMorning");
      if (h < 20) return this.$t("ui.greetingAfternoon");
      return this.$t("ui.greetingEvening");
    },
    dateLine: function () {
      return moment().locale(this.language).format("dddd, LL");
    },
    yearInfo: function () {
      let now = moment();
      let week = now.isoWeek();
      let doy = now.dayOfYear();
      let total = moment([now.year(), 11, 31]).dayOfYear();
      let wLabel = this.$t("ui.weekLabel") || "Week";
      let dLabel = this.$t("ui.dayLabel") || "Day";
      return `${wLabel} ${week} · ${dLabel} ${doy} / ${total}`;
    },
    flavorQuote: function () {
      return FLAVOR_QUOTES[moment().dayOfYear() % FLAVOR_QUOTES.length];
    },
    // Open tasks scheduled for today, counted with the same rule the Today
    // list uses (own tasks + project tasks scheduled to today). Empty until
    // the real number is known.
    pendingLine: function () {
      if (this.pendingCount === null) return "";
      if (this.pendingCount === 0) return this.$t("notifications.noPendingTasksToday");
      return this.$t("notifications.pendingTasksToday", [this.pendingCount]);
    },
    // Repeating-tile mask behind the splash. Every theme now ships one so
    // the splash background always reads as the active theme at a glance:
    // zeolite pore polygons, organic rings, oxide lattice dots or
    // photochem sine waves. Themes without a mask (none right now, but
    // kept defensive) fall back to the soft radial gradient alone.
    latticeStyle: function () {
      if (this.themeItem && this.themeItem.mask) {
        return {
          "--splash-lattice-mask": this.themeItem.mask,
          "--splash-lattice-size": this.themeItem.maskSize,
        };
      }
      return {};
    },
  },
  methods: {
    refreshPending: function () {
      clearTimeout(this.pendingFallbackTimer);
      todayHelper.summary(this.$store.getters.todoLists, this.$store.getters.cTodoListIds).then((res) => {
        this.pendingCount = res.today;
      });
    },
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

/* Subtle breathing of the lockup after the entry animation finishes, so the
   splash feels alive without being distracting. */
.logo-pulse {
  animation:
    splashLogoIn 0.8s cubic-bezier(0.2, 1, 0.1, 1) both,
    splashLogoPulse 3.2s ease-in-out 1.1s infinite;
}

@keyframes splashLogoPulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(94, 110, 242, 0));
  }
  50% {
    transform: scale(1.025);
    filter: drop-shadow(0 0 12px rgba(94, 110, 242, 0.28));
  }
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

.splash-greeting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 0.6rem;
  animation: splashFadeUp 0.75s ease 0.45s both;
}

.splash-greeting-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2a2f3a;
  text-transform: capitalize;
}

.splash-greeting-date {
  font-size: 0.78rem;
  color: #8c93a0;
  text-transform: capitalize;
  font-variant-caps: all-petite-caps;
  letter-spacing: 0.03rem;
}

.dark-theme .splash-greeting-text {
  color: #e6edf3;
}

.dark-theme .splash-greeting-date {
  color: #7d8590;
}

.splash-lattice-name {
  font-size: 0.76rem;
  color: #8c93a0;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: splashFadeUp 0.7s ease 0.65s both;
}

.dark-theme .splash-lattice-name {
  color: #7d8590;
}

/* Cross-theme teaser: smaller than the active-theme line, so the eye
   lands on it only as a secondary cue. Rotates by day of year across
   the three non-active themes. */
.splash-cross-theme {
  font-size: 0.68rem;
  color: #a5acb6;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: -4px;
  opacity: 0.85;
  animation: splashFadeUp 0.7s ease 0.78s both;
}

.dark-theme .splash-cross-theme {
  color: #6b7280;
}

.splash-year-info {
  font-size: 0.7rem;
  color: #a5acb6;
  letter-spacing: 0.05rem;
  text-transform: lowercase;
}

.dark-theme .splash-year-info {
  color: #6b7280;
}

.splash-streak {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-top: 0.4rem;
  animation: splashFadeUp 0.7s ease 0.7s both;
}

.splash-streak-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--accent-color, #5e6ef2);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.splash-streak-label {
  font-size: 0.72rem;
  color: #8c93a0;
  text-transform: uppercase;
  letter-spacing: 0.1rem;
}

.dark-theme .splash-streak-label {
  color: #7d8590;
}

.splash-flavor {
  margin-top: 0.6rem;
  font-size: 0.78rem;
  font-style: italic;
  color: #8c93a0;
  max-width: 24rem;
  text-align: center;
  line-height: 1.4;
  animation: splashFadeUp 0.7s ease 0.95s both;
}

.dark-theme .splash-flavor {
  color: #7d8590;
}

/* The one line that matters when the app opens: a readable pill instead of
   tiny accent-coloured text, with enough contrast in both themes. */
.splash-pending {
  margin-top: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #3d4bd1;
  background-color: rgba(94, 110, 242, 0.13);
  border: 1px solid rgba(94, 110, 242, 0.3);
  animation: splashFadeUp 0.5s ease both;
}

.splash-pending-empty {
  color: #4b5563;
  background-color: rgba(107, 114, 128, 0.1);
  border-color: rgba(107, 114, 128, 0.25);
}

.dark-theme .splash-pending {
  color: #c7d0ff;
  background-color: rgba(94, 110, 242, 0.22);
  border-color: rgba(125, 140, 255, 0.45);
}

.dark-theme .splash-pending-empty {
  color: #cbd2dc;
  background-color: rgba(148, 163, 184, 0.14);
  border-color: rgba(148, 163, 184, 0.3);
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
  .logo-pulse,
  .splash-stamp,
  .splash-greeting,
  .splash-streak,
  .splash-lattice-name,
  .splash-flavor,
  .splash-pending {
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
