<template>
  <svg
    class="streak-crystal"
    :class="{ 'at-milestone': milestone }"
    viewBox="-24 -24 48 48"
    width="22"
    height="22"
    aria-hidden="true"
  >
    <!-- Nucleus (always visible once streak >= 1) -->
    <polygon
      v-if="count >= 1"
      class="hex-cell nucleus"
      :points="hexPoints(0, 0)"
    />

    <!-- First ring (6 cells, days 2..7) -->
    <polygon
      v-for="(cell, i) in ringCells"
      :key="'r1-' + i"
      class="hex-cell ring-1"
      :points="hexPoints(cell.x, cell.y)"
      :style="{ animationDelay: (i * 0.08) + 's' }"
    />

    <!-- Second ring (12 cells, days 8..19) -->
    <polygon
      v-for="(cell, i) in secondRingCells"
      :key="'r2-' + i"
      class="hex-cell ring-2"
      :points="hexPoints(cell.x, cell.y)"
      :style="{ animationDelay: (i * 0.05) + 's' }"
    />
  </svg>
</template>

<script>
// Streak visualized as a crystal growing one unit cell per day. The nucleus
// is day 1, the surrounding 6-ring fills on days 2-7, the outer 12-ring
// fills on days 8-19, and from 20 onwards every cell is lit at full
// intensity with a soft glow. Milestones (7, 30, 100, 365) light the whole
// crystal in the accent gold.
//
// Geometry: pointy-top hexes of radius 4.5 in a 48-unit viewBox centered on
// (0,0); the ring is laid out so adjacent hexes share edges. Radius chosen
// so even the outer ring-2 (19 cells total) fits inside the viewBox with
// room to breathe.
const HEX_R = 4.5;
const DX = HEX_R * Math.sqrt(3); // horizontal spacing between adjacent cells

// First ring: 6 cells around the nucleus (pointy-top offsets).
const RING_1 = [
  { x: 0,       y: -2 * HEX_R },
  { x:  DX / 1, y: -HEX_R     },
  { x:  DX / 1, y:  HEX_R     },
  { x: 0,       y:  2 * HEX_R },
  { x: -DX / 1, y:  HEX_R     },
  { x: -DX / 1, y: -HEX_R     },
];

// Second ring: 12 cells. Order spirals from the top, clockwise.
const RING_2 = [
  { x: 0,          y: -4 * HEX_R },
  { x:  DX,        y: -3 * HEX_R },
  { x:  2 * DX,    y: -2 * HEX_R },
  { x:  2 * DX,    y: 0          },
  { x:  2 * DX,    y:  2 * HEX_R },
  { x:  DX,        y:  3 * HEX_R },
  { x: 0,          y:  4 * HEX_R },
  { x: -DX,        y:  3 * HEX_R },
  { x: -2 * DX,    y:  2 * HEX_R },
  { x: -2 * DX,    y: 0          },
  { x: -2 * DX,    y: -2 * HEX_R },
  { x: -DX,        y: -3 * HEX_R },
];

export default {
  name: "streakCrystal",
  props: {
    count: { type: Number, default: 0 },
  },
  computed: {
    // Milestone glow lights up the whole crystal in a warm accent when the
    // streak crosses one of the "proud" thresholds, held for the day.
    milestone: function () {
      let c = this.count;
      return c === 7 || c === 14 || c === 30 || c === 100 || c === 365;
    },
    ringCells: function () {
      let n = Math.min(6, Math.max(0, this.count - 1));
      return RING_1.slice(0, n);
    },
    secondRingCells: function () {
      let n = Math.min(12, Math.max(0, this.count - 7));
      return RING_2.slice(0, n);
    },
  },
  methods: {
    // Pointy-top hex path, centered at (cx, cy).
    hexPoints: function (cx, cy) {
      let pts = [];
      for (let i = 0; i < 6; i++) {
        let a = (Math.PI / 3) * i - Math.PI / 2;
        let x = (cx + HEX_R * Math.cos(a)).toFixed(2);
        let y = (cy + HEX_R * Math.sin(a)).toFixed(2);
        pts.push(x + "," + y);
      }
      return pts.join(" ");
    },
  },
};
</script>

<style scoped lang="scss">
.streak-crystal {
  display: block;
  overflow: visible;
  color: var(--accent-color, #5e6ef2);
}

.hex-cell {
  fill: currentColor;
  stroke: none;
  opacity: 0;
  transform-origin: center;
  animation: hexAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.hex-cell.nucleus {
  opacity: 0.95;
  animation: hexAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.hex-cell.ring-1 {
  opacity: 0.72;
}

.hex-cell.ring-2 {
  opacity: 0.5;
}

@keyframes hexAppear {
  0%   { opacity: 0; transform: scale(0.1); }
  60%  { opacity: 1; transform: scale(1.08); }
  100% { opacity: var(--target-opacity, 1); transform: scale(1); }
}

/* Milestone celebration: whole crystal glows warm gold, nucleus pulses. */
.streak-crystal.at-milestone {
  color: #f59e0b;
  filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.55));
}

.streak-crystal.at-milestone .nucleus {
  animation: nucleusPulse 1.8s ease-in-out infinite;
}

@keyframes nucleusPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.15); }
}

@media (prefers-reduced-motion: reduce) {
  .hex-cell,
  .streak-crystal.at-milestone .nucleus {
    animation: none;
  }
  .hex-cell {
    opacity: 1;
    transform: none;
  }
}
</style>
