import moment from "moment";

// "Zeolita del dia": a curated set of real zeolite frameworks (IZA codes), a
// deliberate mix of the ones Pau works with (MFI first, his fellowship) and the
// ITQ-n family discovered at his own institute (Instituto de Tecnologia Quimica,
// Corma's group). One is chosen deterministically per day-of-year, drives the
// ambient background lattice, and its details show in a small info card.
//
// The watermark is stylized, not a crystallographic render: each framework's
// silhouette is a regular polygon whose number of sides is the framework's
// largest pore ring size (8-MR octagon, 10-MR decagon, 12-MR dodecagon, an
// 18-MR ring for the extra-large-pore ITQ-33...), so it reads as that pore to
// someone who knows the field, while staying a light line-art mask we can tint.

// Builds a tiled polygon-outline mask (a ring of `sides` vertices). `ry` lets a
// pore read as elliptical (MFI's 10-MR is elongated) rather than circular.
function ngonMaskUrl(sides, size, ry) {
  let rx = size / 2 - 3;
  let radiusY = ry || size / 2 - 3;
  let cx = size / 2;
  let cy = size / 2;
  let pts = [];
  for (let i = 0; i < sides; i++) {
    let a = (Math.PI * 2 * i) / sides - Math.PI / 2;
    let x = (cx + rx * Math.cos(a)).toFixed(2);
    let y = (cy + radiusY * Math.sin(a)).toFixed(2);
    pts.push(x + "," + y);
  }
  let svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" +
    size +
    "' height='" +
    size +
    "' viewBox='0 0 " +
    size +
    " " +
    size +
    "'><polygon points='" +
    pts.join(" ") +
    "' fill='none' stroke='#000' stroke-width='1.1'/></svg>";
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

// code = IZA framework code; fullName = human name; ring = largest pore ring;
// sides/ry/size drive the silhouette; itq/year mark the ones born at the ITQ.
const FRAMEWORKS = [
  // Reference frameworks (not ITQ, kept because Pau works with or against them)
  { code: "MFI", fullName: "MFI (ZSM-5)", ring: "10-MR", sides: 10, ry: 12, size: 40, itq: false, note: "The workhorse of your fellowship: sinusoidal + straight 10-ring channels." },
  { code: "FAU", fullName: "FAU (Faujasite / Y)", ring: "12-MR", sides: 12, size: 42, itq: false, note: "Large 12-ring pores opening into big supercages." },
  { code: "CHA", fullName: "CHA (Chabazite)", ring: "8-MR", sides: 8, size: 34, itq: false, note: "Small-pore 8-ring, cha cages. Key in methanol-to-olefins." },
  { code: "BEA", fullName: "*BEA (Zeolite Beta)", ring: "12-MR", sides: 12, size: 42, itq: false, note: "Intergrown 12-ring three-dimensional channel system." },
  { code: "MOR", fullName: "MOR (Mordenite)", ring: "12-MR", sides: 12, size: 40, itq: false, note: "12-ring main channels with 8-ring side pockets." },

  // ITQ-n family (Instituto de Tecnologia Quimica, Valencia)
  { code: "MWW", fullName: "MWW (ITQ-1)", ring: "10-MR", sides: 10, size: 38, itq: true, year: 1995, note: "ITQ-1: lamellar 10-ring host with large 12-ring surface pockets. The MCM-22 precursor family, made at the ITQ." },
  { code: "ITE", fullName: "ITE (ITQ-3)", ring: "8-MR", sides: 8, size: 34, itq: true, year: 1998, note: "ITQ-3: small-pore 8-ring with cavities, candidate for light-gas separations. Made at the ITQ." },
  { code: "IFR", fullName: "IFR (ITQ-4)", ring: "12-MR", sides: 12, size: 40, itq: true, year: 1996, note: "ITQ-4: unidimensional 12-ring channels, made at the ITQ." },
  { code: "ISV", fullName: "ISV (ITQ-7)", ring: "12-MR", sides: 12, size: 42, itq: true, year: 2000, note: "ITQ-7: large-pore tridirectional 12-ring zeolite, made at the ITQ." },
  { code: "ITW", fullName: "ITW (ITQ-12)", ring: "8-MR", sides: 8, size: 34, itq: true, year: 2002, note: "ITQ-12: small-pore 2D framework with narrow cavities, made at the ITQ." },
  { code: "ITH", fullName: "ITH (ITQ-13)", ring: "10-MR", sides: 10, size: 38, itq: true, year: 2003, note: "ITQ-13: three sets of crossing 9- and 10-ring channels, made at the ITQ." },
  { code: "UTL", fullName: "UTL (ITQ-15)", ring: "14-MR", sides: 14, size: 44, itq: true, year: 2004, note: "ITQ-15: extra-large pore 2D (14x12 ring), germanosilicate. Made at the ITQ." },
  { code: "BEC", fullName: "BEC (ITQ-17)", ring: "12-MR", sides: 12, size: 42, itq: true, year: 2001, note: "ITQ-17: pure polymorph C of Beta, 3D 12-ring channel system. Made at the ITQ." },
  { code: "IWR", fullName: "IWR (ITQ-24)", ring: "12-MR", sides: 12, size: 42, itq: true, year: 2003, note: "ITQ-24: 3D multipore with crossing 12-, 10- and 10-ring channels, made at the ITQ." },
  { code: "IWW", fullName: "IWW (ITQ-22)", ring: "12-MR", sides: 12, size: 42, itq: true, year: 2005, note: "ITQ-22: rare 8-10-12-ring multipore system, made at the ITQ." },
  { code: "IWS", fullName: "IWS (ITQ-26)", ring: "12-MR", sides: 12, size: 44, itq: true, year: 2008, note: "ITQ-26: 3D 12-ring with extra-large cavities, made at the ITQ." },
  { code: "IWV", fullName: "IWV (ITQ-27)", ring: "12-MR", sides: 12, size: 42, itq: true, year: 2008, note: "ITQ-27: layered 12-ring 2D framework, made at the ITQ." },
  { code: "IHW", fullName: "IHW (ITQ-32)", ring: "8-MR", sides: 8, size: 34, itq: true, year: 2007, note: "ITQ-32: small-pore with narrow cavities, made at the ITQ." },
  { code: "ITT", fullName: "ITT (ITQ-33)", ring: "18-MR", sides: 18, size: 46, itq: true, year: 2006, note: "ITQ-33: extra-large 18-ring pores crossed by 10-rings, made at the ITQ." },
  { code: "ITR", fullName: "ITR (ITQ-34)", ring: "10-MR", sides: 10, size: 38, itq: true, year: 2008, note: "ITQ-34: 3D multipore with 10- and 9-ring crossing channels, made at the ITQ." },
  { code: "-ITV", fullName: "-ITV (ITQ-37)", ring: "30-MR", sides: 30, size: 50, itq: true, year: 2009, note: "ITQ-37: first chiral extra-large pore zeolite, 30-ring interrupted framework. Made at the ITQ." },
  { code: "ITG", fullName: "ITG (ITQ-38)", ring: "10-MR", sides: 10, size: 38, itq: true, year: 2012, note: "ITQ-38: 3D 10-ring framework, made at the ITQ." },
  { code: "-IRY", fullName: "-IRY (ITQ-40)", ring: "16-MR", sides: 16, size: 46, itq: true, year: 2011, note: "ITQ-40: extra-large pore interrupted framework with 16- and 15-ring channels. Made at the ITQ." },
  { code: "IRR", fullName: "IRR (ITQ-44)", ring: "18-MR", sides: 18, size: 48, itq: true, year: 2010, note: "ITQ-44: extra-large pore 3D with crossing 18- and 12-ring channels, made at the ITQ." },
  { code: "IFO", fullName: "IFO (ITQ-51)", ring: "16-MR", sides: 16, size: 46, itq: true, year: 2013, note: "ITQ-51: extra-large pore 1D 16-ring channel, made at the ITQ." },
  { code: "IFW", fullName: "IFW (ITQ-52)", ring: "8-MR", sides: 8, size: 34, itq: true, year: 2014, note: "ITQ-52: small-pore with cavities, made at the ITQ." },

  // ITQ-29 kept last so the alphabetical IZA code (LTA) is read as the ITQ entry.
  { code: "LTA", fullName: "LTA (ITQ-29, pure silica)", ring: "8-MR", sides: 8, size: 36, itq: true, year: 2004, note: "ITQ-29 is the pure-silica form of LTA, made at the ITQ." },
];

function build(fw) {
  return {
    code: fw.code,
    name: fw.code,
    fullName: fw.fullName,
    ring: fw.ring,
    itq: !!fw.itq,
    year: fw.year || null,
    note: fw.note,
    mask: ngonMaskUrl(fw.sides, fw.size, fw.ry),
    size: fw.size + "px " + fw.size + "px",
  };
}

export default {
  frameworks: FRAMEWORKS,
  // Kept for back-compat with earlier callers that expected `.lattices`.
  get lattices() {
    return FRAMEWORKS.map(build);
  },
  getTodayLattice() {
    let idx = moment().dayOfYear() % FRAMEWORKS.length;
    return build(FRAMEWORKS[idx]);
  },
};
