<template>
  <transition name="focus-fade">
    <div v-if="focusTask" class="focus-mode-overlay" @click.self="close">
      <span class="focus-blob focus-blob-1"></span>
      <span class="focus-blob focus-blob-2"></span>
      <span class="focus-blob focus-blob-3"></span>
      <div class="focus-mode-card">
        <div class="focus-mode-timer">{{ formattedTime }}</div>
        <div class="focus-mode-task">
          <span
            v-if="focusTask.toDo.color && focusTask.toDo.color !== 'none'"
            class="cicle-icon"
            :style="'color: ' + focusTask.toDo.color"
            :class="focusTask.toDo.checked ? 'bi-check-circle-fill' : 'bi-circle-fill'"
          ></span>
          <span
            v-else
            class="cicle-icon"
            :class="focusTask.toDo.checked ? 'bi-check-circle' : 'bi-circle'"
          ></span>
          {{ focusTask.toDo.text }}
        </div>
        <button class="focus-mode-close" type="button" @click="close">
          <i class="bi-x-lg"></i> {{ $t("ui.exitFocusMode") }}
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "focusMode",
  data() {
    return {
      elapsedSeconds: 0,
      timerHandle: null,
    };
  },
  mounted() {
    window.addEventListener("keydown", this.handleKeydown);
  },
  unmounted() {
    window.removeEventListener("keydown", this.handleKeydown);
    this.stopTimer();
  },
  methods: {
    startTimer: function () {
      this.elapsedSeconds = 0;
      this.stopTimer();
      this.timerHandle = setInterval(() => {
        this.elapsedSeconds++;
      }, 1000);
    },
    stopTimer: function () {
      if (this.timerHandle) {
        clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
    },
    close: function () {
      this.$store.commit("setFocusTask", null);
    },
    handleKeydown: function (e) {
      if (e.key === "Escape" && this.focusTask) this.close();
    },
  },
  watch: {
    focusTask: function (newVal) {
      if (newVal) {
        this.startTimer();
      } else {
        this.stopTimer();
      }
    },
  },
  computed: {
    focusTask: function () {
      return this.$store.getters.focusTask;
    },
    formattedTime: function () {
      let m = Math.floor(this.elapsedSeconds / 60).toString().padStart(2, "0");
      let s = (this.elapsedSeconds % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    },
  },
};
</script>

<style scoped lang="scss">
.focus-mode-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 17, 21, 0.72);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  overflow: hidden;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.focus-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  pointer-events: none;
  background: var(--accent-color, #5e6ef2);
}

.focus-blob-1 {
  width: 42vw;
  height: 42vw;
  top: -10vw;
  left: -6vw;
  animation: focusBlobDrift1 22s ease-in-out infinite alternate;
}

.focus-blob-2 {
  width: 34vw;
  height: 34vw;
  bottom: -8vw;
  right: -6vw;
  filter: blur(90px) hue-rotate(50deg);
  opacity: 0.3;
  animation: focusBlobDrift2 26s ease-in-out infinite alternate;
}

.focus-blob-3 {
  width: 26vw;
  height: 26vw;
  bottom: 10vh;
  left: 12vw;
  filter: blur(70px) hue-rotate(-40deg);
  opacity: 0.22;
  animation: focusBlobDrift3 30s ease-in-out infinite alternate;
}

@keyframes focusBlobDrift1 {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(5vw, 6vh) scale(1.15);
  }
}

@keyframes focusBlobDrift2 {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(-6vw, -4vh) scale(0.9);
  }
}

@keyframes focusBlobDrift3 {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(4vw, -5vh) scale(1.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .focus-blob {
    animation: none !important;
  }
}

.focus-mode-card {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-radius: 16px;
  padding: 42px 56px;
  text-align: center;
  box-shadow: 0 12px 44px rgba(0, 0, 0, 0.25);
  min-width: 320px;
  max-width: 480px;

  .dark-theme & {
    background: rgba(25, 29, 36, 0.78);
    color: #c9d1d9;
  }
}

.focus-mode-timer {
  font-size: 2.6rem;
  font-weight: 600;
  margin-bottom: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--accent-color, #5e6ef2);
}

.focus-mode-task {
  font-size: 1.15rem;
  margin-bottom: 26px;
  word-break: break-word;

  .cicle-icon {
    font-size: 0.9rem;
    margin-right: 9px;
  }
}

.focus-mode-close {
  border: none;
  background-color: #eaecef;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.82rem;
  color: inherit;

  &:hover {
    background-color: #dddfe2;
  }

  .dark-theme & {
    background-color: #21262d;
    color: #c9d1d9;

    &:hover {
      background-color: #2e353d;
    }
  }

  i {
    margin-right: 4px;
  }
}

.focus-fade-enter-active,
.focus-fade-leave-active {
  transition: opacity 0.2s ease;
}

.focus-fade-enter-from,
.focus-fade-leave-to {
  opacity: 0;
}
</style>
