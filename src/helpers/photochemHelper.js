import moment from "moment";

// Photochemistry theme: a curated set of concepts, phenomena and workhorse
// catalysts covering what a photochemist sees daily. Each entry declares a
// visual archetype (jablonski-like level diagram, orbital with wave,
// two-species transfer arrow, molecule+sun motif) chosen so each item still
// reads distinctly without needing a bespoke SVG for every one.

const SIZE = 100;
const CENTER = 50;

// Shape builders. Each returns inline SVG markup, stroked with currentColor
// so the host container's tint carries through. The shapes stay abstract
// (not strictly to-scale photophysics) so they read as "a photophysical
// concept" rather than demanding accuracy.

function shapeJablonski(opts) {
  // Full Jablonski diagram with labelled transitions. State lines plus
  // absorption / emission / IC / ISC / rISC arrows, each tagged with the
  // standard label (hv, F, P, IC, ISC, kF, kP) next to its arrow so the
  // mechanism is readable at a glance rather than inferred from colour
  // or dash pattern alone.
  // opts.emit: emission type ('fluor', 'phos', 'ic', 'isc', 'tadf')
  // opts.showTriplet: whether to draw the triplet manifold
  let parts = [];
  let levels = [
    { y: 80, label: "S0" },
    { y: 42, label: "S1" },
    { y: 26, label: "Sn" },
  ];
  let tripletLevels = [
    { y: 58, label: "T1" },
    { y: 34, label: "Tn" },
  ];
  // Vibrational substate lines (shorter, lighter) above each electronic
  // level — makes the diagram read as a proper Jablonski.
  let vibsFor = (y) => {
    let out = [];
    [y - 2.8, y - 5.4].forEach((yy) => {
      out.push('<line x1="27" y1="' + yy.toFixed(2) + '" x2="46" y2="' + yy.toFixed(2) + '" stroke="currentColor" stroke-width="0.8" opacity="0.35"/>');
    });
    return out;
  };
  // Singlet stack with vibrational sublevels
  levels.forEach((l) => {
    parts.push('<line x1="25" y1="' + l.y + '" x2="48" y2="' + l.y + '" stroke="currentColor" stroke-width="2.3"/>');
    parts.push('<text x="18" y="' + (l.y + 3) + '" text-anchor="end" font-size="7" font-family="sans-serif" fill="currentColor" opacity="0.85">' + l.label + "</text>");
    if (l.label !== "S0") parts.push(...vibsFor(l.y));
  });
  // Triplet stack (when needed), always labelled, with vibrational hints
  if (opts.showTriplet) {
    tripletLevels.forEach((l) => {
      parts.push('<line x1="60" y1="' + l.y + '" x2="83" y2="' + l.y + '" stroke="currentColor" stroke-width="2.3" opacity="0.85"/>');
      parts.push('<text x="88" y="' + (l.y + 3) + '" font-size="7" font-family="sans-serif" fill="currentColor" opacity="0.85">' + l.label + "</text>");
      [l.y - 2.8, l.y - 5.4].forEach((yy) => {
        parts.push('<line x1="62" y1="' + yy.toFixed(2) + '" x2="81" y2="' + yy.toFixed(2) + '" stroke="currentColor" stroke-width="0.8" opacity="0.35"/>');
      });
    });
  }
  // Absorption arrow (always drawn, straight up), labelled hv
  parts.push('<line x1="30" y1="80" x2="30" y2="26" stroke="currentColor" stroke-width="2" marker-end="url(#phArrow)"/>');
  parts.push('<text x="23" y="54" text-anchor="end" font-size="7" font-family="sans-serif" font-style="italic" fill="currentColor" opacity="0.8">hv</text>');
  // Emission arrows and their labels differ by mechanism
  if (opts.emit === "fluor") {
    parts.push('<line x1="40" y1="42" x2="40" y2="80" stroke="currentColor" stroke-width="2" marker-end="url(#phArrow)"/>');
    parts.push('<text x="43" y="65" font-size="7" font-family="sans-serif" font-weight="700" fill="currentColor">F</text>');
  } else if (opts.emit === "phos") {
    parts.push('<path d="M 46 42 Q 56 48 60 58" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.8" marker-end="url(#phArrow)"/>');
    parts.push('<text x="52" y="46" font-size="6.5" font-family="sans-serif" fill="currentColor" opacity="0.85">ISC</text>');
    parts.push('<line x1="72" y1="58" x2="72" y2="80" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2" marker-end="url(#phArrow)"/>');
    parts.push('<text x="76" y="72" font-size="7" font-family="sans-serif" font-weight="700" fill="currentColor">P</text>');
  } else if (opts.emit === "ic") {
    parts.push('<path d="M 44 42 Q 48 52 44 62 Q 40 72 44 80" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.8" marker-end="url(#phArrow)"/>');
    parts.push('<text x="48" y="64" font-size="7" font-family="sans-serif" fill="currentColor" opacity="0.85">IC</text>');
  } else if (opts.emit === "isc") {
    parts.push('<path d="M 48 42 L 60 58" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2" marker-end="url(#phArrow)"/>');
    parts.push('<text x="48" y="55" font-size="7" font-family="sans-serif" fill="currentColor" opacity="0.85">ISC</text>');
  } else if (opts.emit === "tadf") {
    // Up from T1 to S1 (rISC), then emission down
    parts.push('<path d="M 60 58 L 48 42" stroke="currentColor" stroke-width="1.6" opacity="0.8" marker-end="url(#phArrow)"/>');
    parts.push('<text x="48" y="55" font-size="6.5" font-family="sans-serif" fill="currentColor" opacity="0.85">rISC</text>');
    parts.push('<line x1="40" y1="42" x2="40" y2="80" stroke="currentColor" stroke-width="2" marker-end="url(#phArrow)"/>');
    parts.push('<text x="43" y="65" font-size="7" font-family="sans-serif" font-weight="700" fill="currentColor">F</text>');
  }
  // Shared arrow marker definition
  let defs = '<defs><marker id="phArrow" markerWidth="7" markerHeight="7" refX="4" refY="3.5" orient="auto"><path d="M0,0 L5,3.5 L0,7 z" fill="currentColor"/></marker></defs>';
  return defs + parts.join("");
}

function shapeTransfer(opts) {
  // Two circles with an arrow between (energy or electron transfer).
  let dashed = opts.dashed ? ' stroke-dasharray="3 2"' : "";
  let letter = opts.letter || "D";
  let letter2 = opts.letter2 || "A";
  return (
    '<defs><marker id="trArrow" markerWidth="7" markerHeight="7" refX="4" refY="3.5" orient="auto"><path d="M0,0 L5,3.5 L0,7 z" fill="currentColor"/></marker></defs>' +
    '<circle cx="26" cy="50" r="14" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/>' +
    '<text x="26" y="53" text-anchor="middle" font-size="12" font-family="sans-serif" font-weight="700" fill="currentColor">' + letter + "</text>" +
    '<circle cx="74" cy="50" r="14" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/>' +
    '<text x="74" y="53" text-anchor="middle" font-size="12" font-family="sans-serif" font-weight="700" fill="currentColor">' + letter2 + "</text>" +
    '<line x1="42" y1="50" x2="58" y2="50" stroke="currentColor" stroke-width="2.4"' + dashed + ' marker-end="url(#trArrow)"/>' +
    (opts.label ? '<text x="50" y="38" text-anchor="middle" font-size="7" font-family="sans-serif" fill="currentColor" opacity="0.75">' + opts.label + "</text>" : "")
  );
}

function shapeOrbitalWave(opts) {
  // Atom-like orbital in the middle, outgoing sinusoidal wave for emission or
  // incoming for absorption.
  let dir = opts.direction === "in" ? -1 : 1;
  let parts = [];
  parts.push('<circle cx="' + CENTER + '" cy="' + CENTER + '" r="12" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/>');
  parts.push('<circle cx="' + CENTER + '" cy="' + CENTER + '" r="3" fill="currentColor"/>');
  // Wave: sinusoid outward
  let path = "M " + CENTER + " " + CENTER + " ";
  for (let i = 0; i <= 30; i++) {
    let t = i / 30;
    let x = CENTER + dir * (20 + 20 * t);
    let y = CENTER - 10 * Math.sin(t * Math.PI * 3);
    path += "L " + x.toFixed(2) + " " + y.toFixed(2) + " ";
  }
  parts.push('<path d="' + path + '" fill="none" stroke="currentColor" stroke-width="2" opacity="0.85"/>');
  // Optional second wave in the opposite direction (Stokes shift style)
  if (opts.pair) {
    let path2 = "M " + CENTER + " " + CENTER + " ";
    for (let i = 0; i <= 30; i++) {
      let t = i / 30;
      let x = CENTER - dir * (20 + 20 * t);
      let y = CENTER + 10 * Math.sin(t * Math.PI * 3);
      path2 += "L " + x.toFixed(2) + " " + y.toFixed(2) + " ";
    }
    parts.push('<path d="' + path2 + '" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>');
  }
  return parts.join("");
}

function shapeMoleculeSun(opts) {
  // A hex "molecule" below with a sun radiating from the top. For
  // photocatalysis-flavoured items.
  let parts = [];
  // Sun
  parts.push('<circle cx="' + CENTER + '" cy="28" r="9" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>');
  for (let i = 0; i < 8; i++) {
    let a = (Math.PI * 2 * i) / 8;
    let x1 = CENTER + 13 * Math.cos(a);
    let y1 = 28 + 13 * Math.sin(a);
    let x2 = CENTER + 18 * Math.cos(a);
    let y2 = 28 + 18 * Math.sin(a);
    parts.push('<line x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) + '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) + '" stroke="currentColor" stroke-width="1.6" opacity="0.85"/>');
  }
  // Molecule hex at the bottom
  let hr = 15;
  let hy = 72;
  let hex = [];
  for (let i = 0; i < 6; i++) {
    let a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    hex.push({ x: CENTER + hr * Math.cos(a), y: hy + hr * Math.sin(a) });
  }
  parts.push('<polygon points="' + hex.map((p) => p.x.toFixed(2) + "," + p.y.toFixed(2)).join(" ") + '" fill="none" stroke="currentColor" stroke-width="2"/>');
  if (opts.label) {
    parts.push('<text x="' + CENTER + '" y="' + (hy + 3) + '" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="700" fill="currentColor">' + opts.label + "</text>");
  }
  return parts.join("");
}

function buildSvg(item) {
  switch (item.shape) {
    case "jablonski-fluor": return shapeJablonski({ emit: "fluor" });
    case "jablonski-phos": return shapeJablonski({ emit: "phos", showTriplet: true });
    case "jablonski-ic": return shapeJablonski({ emit: "ic" });
    case "jablonski-isc": return shapeJablonski({ emit: "isc", showTriplet: true });
    case "jablonski-tadf": return shapeJablonski({ emit: "tadf", showTriplet: true });
    case "transfer": return shapeTransfer(item.shapeOpts || {});
    case "orbital-out": return shapeOrbitalWave({ direction: "out" });
    case "orbital-in": return shapeOrbitalWave({ direction: "in" });
    case "orbital-pair": return shapeOrbitalWave({ direction: "out", pair: true });
    case "mol-sun": return shapeMoleculeSun(item.shapeOpts || {});
    default: return shapeJablonski({ emit: "fluor" });
  }
}

const ITEMS = [
  { code: "FLUOR", fullName: "Fluorescence", shape: "jablonski-fluor",
    note: "S1 to S0 radiative decay, nanoseconds, spin-allowed. The brightest everyday glow in a lab." },
  { code: "PHOS", fullName: "Phosphorescence", shape: "jablonski-phos",
    note: "T1 to S0 radiative decay, spin-forbidden. Microseconds to seconds. Glow in the dark." },
  { code: "IC", fullName: "Internal conversion", shape: "jablonski-ic",
    note: "Non-radiative Sn -> S1 (and S1 -> S0). Picoseconds. The main heat loss channel." },
  { code: "ISC", fullName: "Intersystem crossing", shape: "jablonski-isc",
    note: "Spin-flip from singlet to triplet. Enabled by spin-orbit coupling; opens the triplet manifold." },
  { code: "TADF", fullName: "TADF (thermal activated delayed fluorescence)", shape: "jablonski-tadf",
    note: "Reverse ISC T1 -> S1 followed by fluorescence. Small Delta-EST emitters harvest 100% excitons." },
  { code: "FRET", fullName: "Forster resonance energy transfer", shape: "transfer",
    shapeOpts: { letter: "D*", letter2: "A", label: "FRET" },
    note: "Dipole-dipole energy transfer at 1-10 nm. Spectroscopic ruler of biology." },
  { code: "DEXTER", fullName: "Dexter energy transfer", shape: "transfer",
    shapeOpts: { letter: "D*", letter2: "A", label: "Dexter", dashed: true },
    note: "Electron exchange energy transfer at contact (<1 nm). Dominant in triplet-triplet transfer." },
  { code: "PET", fullName: "Photoinduced electron transfer", shape: "transfer",
    shapeOpts: { letter: "D*", letter2: "A", label: "PET" },
    note: "Excited state ejects or accepts an electron. The engine of photoredox catalysis." },
  { code: "ABS", fullName: "Absorption", shape: "orbital-in",
    note: "Photon in, electron promoted. Beer-Lambert quantifies it: A = epsilon c l." },
  { code: "EMI", fullName: "Emission", shape: "orbital-out",
    note: "Excited state collapses, photon out. Lineshape follows the Franck-Condon envelope." },
  { code: "STOKES", fullName: "Stokes shift", shape: "orbital-pair",
    note: "Energy gap between absorption and emission maxima. Big shifts = less self-reabsorption." },
  { code: "SOX", fullName: "Singlet oxygen (1O2)", shape: "mol-sun",
    shapeOpts: { label: "O2" },
    note: "Spin-flipped O2 generated by sensitisers. Workhorse of photodynamic therapy and photo-oxidation." },
  { code: "PHCAT", fullName: "Photoredox catalysis", shape: "mol-sun",
    shapeOpts: { label: "Ru" },
    note: "A photoexcited metal complex (Ru, Ir) or organic dye drives single-electron redox cycles." },
  { code: "TIO2", fullName: "TiO2 photocatalysis", shape: "mol-sun",
    shapeOpts: { label: "Ti" },
    note: "UV excites e-/h+ pairs across TiO2's 3.2 eV gap. Oxidative mineralisation of pollutants." },
  { code: "TRANSCIS", fullName: "Trans-cis isomerisation", shape: "transfer",
    shapeOpts: { letter: "trans", letter2: "cis", label: "hv" },
    note: "Rotation around a double bond driven by excitation. Azobenzene and retinal use it as a switch." },
  { code: "EXCIMER", fullName: "Excimer", shape: "transfer",
    shapeOpts: { letter: "M*", letter2: "M", label: "excimer" },
    note: "An excited monomer pairs with a ground-state copy; red-shifted emission from the dimer." },
  { code: "EXCIPLEX", fullName: "Exciplex", shape: "transfer",
    shapeOpts: { letter: "A*", letter2: "B", label: "exciplex" },
    note: "Heterodimer formed in the excited state only. Broad, structureless CT emission." },
  { code: "CHEMI", fullName: "Chemiluminescence", shape: "orbital-out",
    note: "Chemical reaction populates an excited product that emits. Luminol glow, lightsticks, GFP luciferase." },
  { code: "PHION", fullName: "Photoionisation", shape: "orbital-in",
    note: "Absorbed photon ejects an electron into the continuum. Threshold set by the ionisation potential." },
  { code: "QY", fullName: "Quantum yield", shape: "jablonski-fluor",
    note: "Phi = photons out / photons in (emission) or events / photons in (reaction). The headline photophysics number." },
  { code: "UPCNV", fullName: "Triplet-triplet annihilation up-conversion", shape: "transfer",
    shapeOpts: { letter: "T", letter2: "T", label: "TTA" },
    note: "Two triplets combine into one higher-energy singlet. Low-power up-conversion of near-IR to visible." },
  { code: "AIEG", fullName: "Aggregation-induced emission", shape: "mol-sun",
    shapeOpts: { label: "AIE" },
    note: "Molecules that only emit when packed. Restricted intramolecular rotation locks the excited state." },
];

function hashCode(seed) {
  let str = String(seed || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

// Repeating-tile mask for the splash background: a soft wave + photon arrow
// motif that reads as "radiation / excitation" at a glance. Same shape of
// API as zeoliteHelper's mask (encoded SVG data URL) so themesHelper can
// route it to the splash without special-casing per theme.
function waveMaskUrl() {
  let size = 48;
  // Build a sinusoid across the tile, plus a small dot pair to break the
  // regularity of pure waves.
  let path = "M 2 " + (size / 2);
  let n = 24;
  for (let i = 0; i <= n; i++) {
    let x = 2 + (i * (size - 4)) / n;
    let y = size / 2 - 6 * Math.sin((i / n) * Math.PI * 2);
    path += " L " + x.toFixed(2) + " " + y.toFixed(2);
  }
  let svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "' viewBox='0 0 " + size + " " + size + "'>" +
    "<path d='" + path + "' fill='none' stroke='#000' stroke-width='1'/>" +
    "<circle cx='" + (size * 0.15) + "' cy='" + (size * 0.22) + "' r='1.6' fill='#000'/>" +
    "<circle cx='" + (size * 0.82) + "' cy='" + (size * 0.78) + "' r='1.6' fill='#000'/>" +
    "</svg>";
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

const MASK = waveMaskUrl();

function build(it) {
  return {
    code: it.code,
    name: it.code,
    fullName: it.fullName,
    note: it.note,
    year: it.year || null,
    meta: it.shape,
    svgShape: buildSvg(it),
    viewBox: "0 0 " + SIZE + " " + SIZE,
    mask: MASK,
    maskSize: "48px 48px",
  };
}

export default {
  items: ITEMS,
  getTodayItem() {
    let idx = moment().dayOfYear() % ITEMS.length;
    return build(ITEMS[idx]);
  },
  getItemFor(seed) {
    let idx = hashCode(seed) % ITEMS.length;
    return build(ITEMS[idx]);
  },
  getItemByCode(code) {
    if (!code) return null;
    let it = ITEMS.find((x) => x.code === code);
    return it ? build(it) : null;
  },
};
