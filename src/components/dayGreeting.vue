<template>
  <div class="day-greeting" :style="collapseStyle">
    <div class="day-greeting-head">
      <span class="day-greeting-weekday">{{ weekdayLabel }}</span>
      <h1 class="day-greeting-text" :key="greeting">
        <span
          v-for="(ch, i) in greetingChars"
          :key="i"
          class="kinetic-char"
          :style="{ animationDelay: i * 0.028 + 's' }"
          >{{ ch === " " ? nbsp : ch }}</span
        >
      </h1>
      <span class="day-greeting-date">{{ dateLabel }}</span>
    </div>
    <span
      v-if="todayTotal > 0"
      class="day-greeting-progress"
      :class="{ 'at-100': progressPercent === 100 }"
      :title="progressTitle"
    >
      <span class="day-progress-bar">
        <span
          class="day-progress-fill"
          :style="{ width: progressPercent + '%', '--progress-color': progressColor }"
        ></span>
      </span>
      <span class="day-progress-label">{{ todayDone }} / {{ todayTotal }}</span>
    </span>
  </div>
</template>

<script>
import moment from "moment";

export default {
  name: "dayGreeting",
  props: {
    scrollProgress: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      // Explicit non-breaking space (U+00A0): the kinetic char spans are
      // inline-block, and a bare ASCII " " inside one collapses visually,
      // which was turning "Good evening" into "Goodevening".
      nbsp: " ",
      // Reactive clock. `moment()` is a plain function call, so a computed
      // that uses it only re-runs when something else it depends on changes.
      // That is why the greeting kept saying "Good morning" past noon:
      // nothing ever told Vue to re-evaluate. Bumping nowTick every minute
      // makes any computed that reads it refresh with the current hour.
      nowTick: Date.now(),
      clockTimer: null,
    };
  },
  mounted() {
    this.clockTimer = setInterval(() => {
      this.nowTick = Date.now();
    }, 60 * 1000);
  },
  beforeUnmount() {
    if (this.clockTimer) clearInterval(this.clockTimer);
  },
  computed: {
    collapseStyle: function () {
      let p = this.scrollProgress;
      return {
        opacity: 1 - p,
        transform: "translateY(" + -p * 10 + "px)",
        marginTop: -p * 34 + "px",
        pointerEvents: p > 0.6 ? "none" : "auto",
      };
    },
    language: function () {
      return this.$store.getters.config.language;
    },
    greeting: function () {
      // Depend on nowTick so Vue re-runs this when the clock advances.
      // eslint-disable-next-line no-unused-vars
      let _tick = this.nowTick;
      let h = moment().hour();
      if (h < 6) return this.$t("ui.greetingNight") || this.$t("ui.greetingEvening");
      if (h < 12) return this.$t("ui.greetingMorning");
      if (h < 20) return this.$t("ui.greetingAfternoon");
      return this.$t("ui.greetingEvening");
    },
    greetingChars: function () {
      return this.greeting.split("");
    },
    weekdayLabel: function () {
      return moment().locale(this.language).format("dddd");
    },
    dateLabel: function () {
      return moment().locale(this.language).format("LL");
    },
    todayList: function () {
      let id = moment().format("YYYYMMDD");
      return this.$store.getters.todoLists[id] || [];
    },
    todayDone: function () {
      return this.todayList.filter((t) => t && t.checked).length;
    },
    todayTotal: function () {
      return this.todayList.length;
    },
    progressPercent: function () {
      if (!this.todayTotal) return 0;
      return Math.round((this.todayDone / this.todayTotal) * 100);
    },
    // Progress bar color ramps grey -> blue -> green -> gold as the day gets
    // closed. The 100% gold also lights up a glow via the .at-100 class.
    progressColor: function () {
      let p = this.progressPercent;
      if (p === 100) return "#f59e0b";
      if (p >= 66) return "#10b981";
      if (p >= 33) return "var(--accent-color, #5e6ef2)";
      return "#9ca3af";
    },
    progressTitle: function () {
      return (
        this.$t("ui.todayProgress", [this.todayDone, this.todayTotal, this.progressPercent]) ||
        `${this.todayDone} / ${this.todayTotal} today (${this.progressPercent}%)`
      );
    },
  },
};
</script>

<style scoped lang="scss">
.day-greeting {
  padding: 18px 20px 2px 20px;
  display: flex;
  align-items: flex-end;
  gap: 18px;
  flex-wrap: wrap;
}

.day-greeting-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}

/* Tiny eyebrow above the title: the weekday in all caps gives the greeting a
   newspaper-dateline rhythm and anchors the oversized serif below. */
.day-greeting-weekday {
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8c8c8c;
  margin-bottom: 2px;

  .dark-theme & {
    color: #8b949e;
  }
}

.day-greeting-text {
  font-family: var(--font-voice, "Fraunces", Georgia, serif);
  font-size: clamp(1.9rem, 2.4vw + 0.6rem, 2.8rem);
  font-weight: 400;
  font-variation-settings: "opsz" 72, "wght" 420;
  line-height: 1.02;
  letter-spacing: -0.015em;
  text-transform: capitalize;
  margin: 0;
  color: #1a1a1a;

  .dark-theme & {
    color: #f0f0f3;
    font-variation-settings: "opsz" 72, "wght" 380;
  }
}

.kinetic-char {
  display: inline-block;
  opacity: 0;
  transform: translateY(10px);
  animation: kineticCharIn 0.5s cubic-bezier(0.2, 1, 0.1, 1) both;
}

@keyframes kineticCharIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .kinetic-char {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

.day-greeting-date {
  margin-top: 6px;
  font-size: 0.82rem;
  color: grey;
  text-transform: capitalize;
  font-variant-numeric: oldstyle-nums;

  .dark-theme & {
    color: #8b949e;
  }
}

.day-greeting-progress {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.72rem;
  color: grey;
  padding-bottom: 6px;
  flex: 0 0 auto;

  .dark-theme & {
    color: #8b949e;
  }
}

.day-progress-bar {
  display: inline-block;
  width: 110px;
  height: 4px;
  border-radius: 3px;
  background-color: rgba(0, 0, 0, 0.08);
  overflow: hidden;

  .dark-theme & {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.day-progress-fill {
  display: block;
  height: 100%;
  background-color: var(--progress-color, var(--accent-color, #5e6ef2));
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
              background-color 0.4s ease;
}

/* Gold glow + label pop when the day is fully closed. */
.day-greeting-progress.at-100 .day-progress-bar {
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}

.day-greeting-progress.at-100 .day-progress-label {
  color: #d97706;
  font-weight: 600;
}

.dark-theme .day-greeting-progress.at-100 .day-progress-label {
  color: #fbbf24;
}

.day-progress-label {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
</style>
