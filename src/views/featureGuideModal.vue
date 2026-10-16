<template>
  <div class="modal fade" id="featureGuideModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="ph ph-sparkle"></i> {{ $t("guide.title") }}</h5>
          <i class="bi-x close-modal" data-bs-dismiss="modal"></i>
        </div>
        <div class="modal-body">
          <div class="fg-layout">
            <nav class="fg-nav">
              <button
                v-for="t in topics"
                :key="t.id"
                type="button"
                class="fg-nav-item"
                :class="{ active: t.id === current }"
                @click="current = t.id"
              >
                <i :class="t.icon"></i>
                <span>{{ $t("guide." + t.id + ".name") }}</span>
              </button>
            </nav>

            <article v-if="topic" class="fg-article">
              <h4 class="fg-title">{{ $t("guide." + topic.id + ".name") }}</h4>
              <p class="fg-summary">{{ $t("guide." + topic.id + ".summary") }}</p>

              <ol class="fg-steps">
                <li v-for="n in topic.steps" :key="n">{{ $t("guide." + topic.id + ".s" + n) }}</li>
              </ol>

              <div v-if="topic.examples" class="fg-examples">
                <div class="fg-examples-title">{{ $t("guide.examples") }}</div>
                <code v-for="n in topic.examples" :key="n" class="fg-example">{{ $t("guide." + topic.id + ".e" + n) }}</code>
              </div>

              <p v-if="topic.hasTip" class="fg-tip">
                <i class="ph ph-sparkle"></i> {{ $t("guide." + topic.id + ".tip") }}
              </p>

              <button v-if="topic.openModal || topic.openPeople" type="button" class="fg-open" @click="openFeature(topic)">
                {{ $t("guide." + topic.id + ".open") }} <i class="ph ph-arrow-right"></i>
              </button>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from "bootstrap";

// In-app tutorial. Texts live in the "guide" namespace of the language files:
//   guide.<id>.name / summary / s1..sN (steps) / e1..eN (examples) / tip / open
// Add a topic here and its keys in en.json + es.json.
const TOPICS = [
  { id: "people", icon: "ph ph-address-book", steps: 5, examples: 4, hasTip: true, openPeople: true },
  { id: "quick", icon: "ph ph-command", steps: 4, examples: 3, hasTip: true, openModal: "searchModal" },
  { id: "daily", icon: "ph ph-calendar-check", steps: 4, examples: 0, hasTip: true },
  { id: "projects", icon: "ph ph-hexagon", steps: 5, examples: 0, hasTip: true, openModal: "newListTemplateModal" },
  { id: "batch", icon: "ph ph-stack", steps: 4, examples: 0, hasTip: false },
  { id: "paper", icon: "ph ph-article", steps: 5, examples: 0, hasTip: true },
  { id: "deadlines", icon: "ph ph-target", steps: 3, examples: 0, hasTip: true, openModal: "deadlineRadarModal" },
  { id: "rhythm", icon: "ph ph-gauge", steps: 4, examples: 0, hasTip: false, openModal: "missionControlModal" },
];

export default {
  name: "featureGuideModal",
  data() {
    return {
      topics: TOPICS,
      current: TOPICS[0].id,
    };
  },
  computed: {
    topic: function () {
      return TOPICS.find((t) => t.id === this.current) || null;
    },
  },
  mounted() {
    window.addEventListener("open-feature-guide", this.onOpenEvent);
  },
  unmounted() {
    window.removeEventListener("open-feature-guide", this.onOpenEvent);
  },
  methods: {
    onOpenEvent: function (event) {
      let id = event && event.detail && event.detail.topic;
      if (id && TOPICS.some((t) => t.id === id)) this.current = id;
      this.showSelf();
    },
    // Shows this modal; if another one is open it is closed first (Bootstrap
    // cannot stack two modals cleanly).
    showSelf: function () {
      let el = document.getElementById("featureGuideModal");
      if (!el) return;
      let other = document.querySelector(".modal.show");
      if (other && other !== el) {
        other.addEventListener("hidden.bs.modal", () => Modal.getOrCreateInstance(el).show(), { once: true });
        Modal.getOrCreateInstance(other).hide();
      } else if (!other) {
        Modal.getOrCreateInstance(el).show();
      }
    },
    openFeature: function (topic) {
      let el = document.getElementById("featureGuideModal");
      let go = () => {
        if (topic.openPeople) {
          window.dispatchEvent(new CustomEvent("open-people", { detail: {} }));
        } else if (topic.openModal) {
          let target = document.getElementById(topic.openModal);
          if (target) Modal.getOrCreateInstance(target).show();
        }
      };
      el.addEventListener("hidden.bs.modal", go, { once: true });
      Modal.getOrCreateInstance(el).hide();
    },
  },
};
</script>

<style scoped lang="scss">
.fg-layout {
  display: flex;
  gap: 18px;
}

.fg-nav {
  flex: 0 0 170px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-right: 1px solid #eaecef;
  padding-right: 10px;

  .dark-theme & {
    border-right-color: #21262d;
  }
}

.fg-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  border: none;
  background: none;
  padding: 8px 9px;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
  font-size: 0.86rem;
  color: #3c3c3c;

  .dark-theme & {
    color: #c9d1d9;
  }

  > i {
    font-size: 1.05rem;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  &:hover {
    background-color: #eaecef;

    .dark-theme & {
      background-color: #21262d;
    }
  }

  &.active {
    background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 15%, transparent);
    color: var(--accent-color, #5e6ef2);
    font-weight: 600;
  }
}

.fg-article {
  flex: 1 1 auto;
  min-width: 0;
}

.fg-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.fg-summary {
  color: grey;
  font-size: 0.9rem;
  margin-bottom: 14px;

  .dark-theme & {
    color: #8b949e;
  }
}

.fg-steps {
  padding-left: 1.25rem;
  font-size: 0.9rem;
  line-height: 1.5;

  li {
    margin-bottom: 8px;
  }
}

.fg-examples {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fg-examples-title {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: grey;
}

.fg-example {
  display: block;
  padding: 6px 10px;
  border-radius: 7px;
  font-size: 0.82rem;
  white-space: normal;
  color: #3c3c3c;
  background-color: #f3f4f6;

  .dark-theme & {
    color: #c9d1d9;
    background-color: #161b22;
  }
}

.fg-tip {
  margin-top: 14px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 0.84rem;
  background-color: color-mix(in srgb, var(--accent-color, #5e6ef2) 10%, transparent);

  > i {
    color: var(--accent-color, #5e6ef2);
    margin-right: 4px;
  }
}

.fg-open {
  margin-top: 16px;
  border: none;
  border-radius: 7px;
  padding: 7px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background-color: var(--accent-color, #5e6ef2);
  cursor: pointer;

  &:hover {
    filter: brightness(1.06);
  }
}

@media (max-width: 640px) {
  .fg-layout {
    flex-direction: column;
  }

  .fg-nav {
    flex: 1 1 auto;
    flex-direction: row;
    flex-wrap: wrap;
    border-right: none;
    border-bottom: 1px solid #eaecef;
    padding: 0 0 10px;
  }
}
</style>
