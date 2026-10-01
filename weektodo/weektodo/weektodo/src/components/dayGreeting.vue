<template>
  <div class="day-greeting" :style="collapseStyle">
    <span class="day-greeting-text" :key="greeting">
      <span
        v-for="(ch, i) in greetingChars"
        :key="i"
        class="kinetic-char"
        :style="{ animationDelay: i * 0.032 + 's' }"
        >{{ ch === " " ? nbsp : ch }}</span
      >
    </span>
    <span class="day-greeting-date">{{ dateLabel }}</span>
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
      nbsp: " ",
    };
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
      let h = moment().hour();
      if (h < 12) return this.$t("ui.greetingMorning");
      if (h < 20) return this.$t("ui.greetingAfternoon");
      return this.$t("ui.greetingEvening");
    },
    greetingChars: function () {
      return this.greeting.split("");
    },
    dateLabel: function () {
      return moment().locale(this.language).format("LL");
    },
  },
};
</script>

<style scoped lang="scss">
.day-greeting {
  padding: 14px 16px 0px 16px;
  display: flex;
  align-items: baseline;
  gap: 9px;
  flex-wrap: wrap;
}

.day-greeting-text {
  font-size: 1.25rem;
  font-weight: 600;
  text-transform: capitalize;
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
  font-size: 0.82rem;
  color: grey;
  text-transform: capitalize;

  .dark-theme & {
    color: #8b949e;
  }
}
</style>
