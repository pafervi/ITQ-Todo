import moment from "moment";

// Purely decorative, but a real wink to the field: four stylized zeolite
// framework silhouettes (line-art, not to-scale crystallography) used as the
// ambient watermark lattice behind the app. One is picked deterministically
// per day (day-of-year), so the background subtly changes every day without
// any randomness/flicker on reload.
const lattices = [
  {
    id: "MFI",
    name: "MFI",
    fullName: "MFI (ZSM-5)",
    size: "28px 49px",
    mask:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.1'%3E%3Cpath d='M13.99 0L27 7.5v15l-13.01 7.5L1 22.5v-15z'/%3E%3Cpath d='M13.99 49L27 41.5v-15l-13.01-7.5L1 26.5v15z'/%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: "FAU",
    name: "FAU",
    fullName: "FAU (Faujasita / Y)",
    size: "40px 40px",
    mask:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.1'%3E%3Cpath d='M12 0L28 0 40 12 40 28 28 40 12 40 0 28 0 12Z'/%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: "CHA",
    name: "CHA",
    fullName: "CHA (Chabazita)",
    size: "34px 34px",
    mask:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34' height='34' viewBox='0 0 34 34'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.1'%3E%3Cpath d='M17 0L34 17 17 34 0 17Z'/%3E%3Cpath d='M17 0L17 34M0 17L34 17'/%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: "LTA",
    name: "LTA",
    fullName: "LTA (Linde Type A)",
    size: "32px 32px",
    mask:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.1'%3E%3Crect x='2' y='2' width='28' height='28'/%3E%3Cpath d='M2 2L30 30M30 2L2 30'/%3E%3C/g%3E%3C/svg%3E\")",
  },
];

export default {
  lattices,
  getTodayLattice() {
    let idx = moment().dayOfYear() % lattices.length;
    return lattices[idx];
  },
};
