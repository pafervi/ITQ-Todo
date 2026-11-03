import moment from "moment";

// Photochemistry theme: a curated set of concepts, phenomena and workhorse
// catalysts covering what a photochemist sees daily. Each entry declares a
// visual archetype (jablonski-like level diagram, orbital with wave,
// two-species transfer arrow, molecule+sun motif) chosen so each item still
// reads distinctly without needing a bespoke SVG for every one.

const SIZE = 100;

// Shape builders. Each returns inline SVG markup, stroked with currentColor
// so the host container's tint carries through. The shapes stay abstract
// (not strictly to-scale photophysics) so they read as "a photophysical
// concept" rather than demanding accuracy.
//
// Arrowheads are drawn as explicit polygons, not SVG <marker>s: markers are
// resolved by document-wide id, so when the same shape is inlined several
// times (board backdrop, project cover, info modal) the reference can end
// up pointing at a copy inside a hidden modal, and the heads vanish.

const f = (v) => Math.round(v * 100) / 100;
const TXT = 'font-family="sans-serif" fill="currentColor"';

// Triangle arrowhead with its tip at (x, y) pointing along (dx, dy).
function head(x, y, dx, dy, size) {
  size = size || 5.5;
  let l = Math.hypot(dx, dy) || 1;
  let ux = dx / l;
  let uy = dy / l;
  let bx = x - ux * size;
  let by = y - uy * size;
  let hw = size * 0.48;
  return (
    '<polygon points="' + f(x) + "," + f(y) + " " + f(bx - uy * hw) + "," + f(by + ux * hw) + " " + f(bx + uy * hw) + "," + f(by - ux * hw) +
    '" fill="currentColor"/>'
  );
}

// Straight arrow from (x1, y1) to (x2, y2).
function arrow(x1, y1, x2, y2, o) {
  o = o || {};
  let w = o.w || 2;
  let size = o.size || 5.5;
  let l = Math.hypot(x2 - x1, y2 - y1) || 1;
  let ex = x2 - ((x2 - x1) / l) * (size * 0.8);
  let ey = y2 - ((y2 - y1) / l) * (size * 0.8);
  return (
    '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(ex) + '" y2="' + f(ey) + '" stroke="currentColor" stroke-width="' + w + '"' +
    (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") +
    ' stroke-linecap="round"' + (o.op ? ' opacity="' + o.op + '"' : "") + "/>" +
    head(x2, y2, x2 - x1, y2 - y1, size)
  );
}

function sun(cx, cy, r, rays) {
  let out = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>';
  for (let i = 0; i < 8; i++) {
    let a = (Math.PI * 2 * i) / 8;
    out +=
      '<line x1="' + f(cx + (r + 4) * Math.cos(a)) + '" y1="' + f(cy + (r + 4) * Math.sin(a)) + '" x2="' + f(cx + (r + 4 + rays) * Math.cos(a)) + '" y2="' + f(cy + (r + 4 + rays) * Math.sin(a)) +
      '" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>';
  }
  return out;
}

function disc(cx, cy, r, text, size) {
  return (
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/>' +
    (text ? '<text x="' + cx + '" y="' + (cy + size * 0.35) + '" text-anchor="middle" font-size="' + size + '" ' + TXT + ' font-weight="700">' + text + "</text>" : "")
  );
}

function wavePath(x0, x1, cy, amp, cycles, op, w) {
  let d = "";
  let steps = 40;
  for (let i = 0; i <= steps; i++) {
    let t = i / steps;
    d += (i ? " L " : "M ") + f(x0 + (x1 - x0) * t) + " " + f(cy - amp * Math.sin(t * Math.PI * 2 * cycles));
  }
  return '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" opacity="' + (op || 0.9) + '"/>';
}

function shapeJablonski(opts) {
  // Full Jablonski diagram with labelled transitions. State lines plus
  // absorption / emission / IC / ISC / rISC arrows, each tagged with the
  // standard label (hv, F, P, IC, ISC) next to its arrow so the mechanism
  // is readable at a glance rather than inferred from colour or dash
  // pattern alone.
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
  let vibs = (y, x1, x2) =>
    [y - 2.8, y - 5.4]
      .map((yy) => '<line x1="' + x1 + '" y1="' + f(yy) + '" x2="' + x2 + '" y2="' + f(yy) + '" stroke="currentColor" stroke-width="0.8" opacity="0.35"/>')
      .join("");
  levels.forEach((l) => {
    parts.push('<line x1="25" y1="' + l.y + '" x2="48" y2="' + l.y + '" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>');
    parts.push('<text x="18" y="' + (l.y + 3) + '" text-anchor="end" font-size="7" ' + TXT + ' opacity="0.85">' + l.label + "</text>");
    if (l.label !== "S0") parts.push(vibs(l.y, 27, 46));
  });
  if (opts.showTriplet) {
    tripletLevels.forEach((l) => {
      parts.push('<line x1="60" y1="' + l.y + '" x2="83" y2="' + l.y + '" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" opacity="0.85"/>');
      parts.push('<text x="88" y="' + (l.y + 3) + '" font-size="7" ' + TXT + ' opacity="0.85">' + l.label + "</text>");
      parts.push(vibs(l.y, 62, 81));
    });
  }
  // Absorption arrow (always drawn, straight up), labelled hv
  parts.push(arrow(30, 80, 30, 26));
  parts.push('<text x="23" y="54" text-anchor="end" font-size="7" ' + TXT + ' font-style="italic" opacity="0.8">hv</text>');
  if (opts.emit === "fluor") {
    parts.push(arrow(40, 42, 40, 80));
    parts.push('<text x="43" y="65" font-size="7" ' + TXT + ' font-weight="700">F</text>');
  } else if (opts.emit === "phos") {
    parts.push('<path d="M 46 42 Q 56 48 60 58" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.8"/>' + head(60, 58, 4, 10, 5));
    parts.push('<text x="52" y="46" font-size="6.5" ' + TXT + ' opacity="0.85">ISC</text>');
    parts.push(arrow(72, 58, 72, 80, { dash: "3 2" }));
    parts.push('<text x="76" y="72" font-size="7" ' + TXT + ' font-weight="700">P</text>');
  } else if (opts.emit === "ic") {
    parts.push('<path d="M 44 42 Q 48 52 44 62 Q 40 72 44 80" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.8"/>' + head(44, 80, 3, 8, 5));
    parts.push('<text x="48" y="64" font-size="7" ' + TXT + ' opacity="0.85">IC</text>');
  } else if (opts.emit === "isc") {
    parts.push(arrow(48, 42, 60, 58, { dash: "3 2" }));
    parts.push('<text x="48" y="55" font-size="7" ' + TXT + ' opacity="0.85">ISC</text>');
  } else if (opts.emit === "tadf") {
    parts.push(arrow(60, 58, 48, 42, { w: 1.6, op: 0.8 }));
    parts.push('<text x="48" y="55" font-size="6.5" ' + TXT + ' opacity="0.85">rISC</text>');
    parts.push(arrow(40, 42, 40, 80));
    parts.push('<text x="43" y="65" font-size="7" ' + TXT + ' font-weight="700">F</text>');
  }
  return parts.join("");
}

function shapeTransfer(opts) {
  // Two circles with an arrow between (energy or electron transfer).
  let l1 = opts.letter || "D";
  let l2 = opts.letter2 || "A";
  let fs = (t) => (t.length > 3 ? 8 : t.length > 2 ? 10 : 12);
  return (
    disc(26, 50, 14, l1, fs(l1)) +
    disc(74, 50, 14, l2, fs(l2)) +
    arrow(42, 50, 58, 50, { w: 2.4, dash: opts.dashed ? "3 2" : "" }) +
    (opts.label ? '<text x="50" y="38" text-anchor="middle" font-size="7" ' + TXT + ' opacity="0.75">' + opts.label + "</text>" : "")
  );
}

function shapeOrbitalWave(opts) {
  // Atom-like orbital with an incoming (absorption) or outgoing (emission)
  // photon wave. Composition is balanced left/right, not centred on the atom.
  let parts = [];
  if (opts.pair) {
    // Stokes shift: bluer photon in (more cycles), redder photon out.
    parts.push(wavePath(6, 36, 50, 8, 4.5, 0.9, 2));
    parts.push(head(40, 50, 1, 0, 5));
    parts.push(disc(50, 50, 12, "", 0));
    parts.push('<circle cx="50" cy="50" r="3" fill="currentColor"/>');
    parts.push(wavePath(66, 90, 50, 10, 2.5, 0.55, 1.8));
    parts.push(head(94, 50, 1, 0, 5));
    return parts.join("");
  }
  let out = opts.direction === "out";
  let cx = out ? 26 : 74;
  parts.push(disc(cx, 50, 12, "", 0));
  parts.push('<circle cx="' + cx + '" cy="50" r="3" fill="currentColor"/>');
  if (out) {
    parts.push(wavePath(44, 88, 50, 10, 3, 0.9, 2));
    parts.push(head(94, 50, 1, 0, 5));
    if (opts.extra === "bolt") {
      // Chemical excitation: a bolt feeding the excited state.
      parts.push('<polygon points="26,14 20,28 25,28 22,38 32,23 27,23 30,14" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>');
    }
  } else {
    parts.push(wavePath(12, 54, 50, 10, 3, 0.9, 2));
    parts.push(head(60, 50, 1, 0, 5));
    if (opts.extra === "electron") {
      // Photoionisation: the electron leaves the atom.
      parts.push('<path d="M 80 40 Q 86 28 92 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2" opacity="0.8"/>');
      parts.push(disc(92, 16, 5, "", 0));
      parts.push('<line x1="89.5" y1="16" x2="94.5" y2="16" stroke="currentColor" stroke-width="1.4"/>');
    }
  }
  return parts.join("");
}

function shapeBand() {
  // Semiconductor photocatalysis: valence / conduction bands, electron
  // promoted across the band gap, hole left behind.
  return (
    sun(12, 50, 5, 3.5) +
    arrow(22, 50, 40, 50, { w: 1.4, op: 0.55, dash: "2 2" }) +
    '<rect x="34" y="20" width="56" height="9" rx="2" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.8"/>' +
    '<rect x="34" y="71" width="56" height="9" rx="2" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.8"/>' +
    '<text x="29" y="28" text-anchor="end" font-size="7" ' + TXT + ' opacity="0.85">CB</text>' +
    '<text x="29" y="79" text-anchor="end" font-size="7" ' + TXT + ' opacity="0.85">VB</text>' +
    arrow(62, 68, 62, 34, { w: 1.8 }) +
    disc(76, 24, 4.6, "", 0) + '<line x1="73.6" y1="24" x2="78.4" y2="24" stroke="currentColor" stroke-width="1.4"/>' +
    '<circle cx="76" cy="76" r="4.6" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<line x1="73.6" y1="76" x2="78.4" y2="76" stroke="currentColor" stroke-width="1.4"/><line x1="76" y1="73.6" x2="76" y2="78.4" stroke="currentColor" stroke-width="1.4"/>' +
    '<line x1="46" y1="34" x2="46" y2="66" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.4"/>' +
    '<text x="50" y="53" font-size="6.5" ' + TXT + ' opacity="0.75">Eg</text>'
  );
}

function shapeRedox(label) {
  // Photoredox: a catalytic cycle of three curved arrows around the
  // catalyst, with the photon driving it.
  let parts = [];
  let r = 27;
  let cx = 50;
  let cy = 54;
  [-80, 40, 160].forEach((a0) => {
    let a1 = a0 + 78;
    let p0 = [cx + r * Math.cos((a0 * Math.PI) / 180), cy + r * Math.sin((a0 * Math.PI) / 180)];
    let p1 = [cx + r * Math.cos((a1 * Math.PI) / 180), cy + r * Math.sin((a1 * Math.PI) / 180)];
    parts.push(
      '<path d="M ' + f(p0[0]) + " " + f(p0[1]) + " A " + r + " " + r + " 0 0 1 " + f(p1[0]) + " " + f(p1[1]) +
      '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
    );
    let tx = -Math.sin((a1 * Math.PI) / 180);
    let ty = Math.cos((a1 * Math.PI) / 180);
    parts.push(head(p1[0], p1[1], tx, ty, 6));
  });
  parts.push(disc(cx, cy, 12, label, 9));
  parts.push(sun(84, 16, 5, 3.5));
  return parts.join("");
}

function shapeOxygen() {
  // Singlet oxygen: a sensitiser (sun) excites O2, whose two atoms end up
  // with paired spins.
  let up = (x) => arrow(x, 76, x, 62, { w: 1.6, size: 4 });
  let down = (x) => arrow(x, 62, x, 76, { w: 1.6, size: 4 });
  return (
    sun(50, 20, 7, 4) +
    arrow(50, 38, 50, 52, { w: 1.6, dash: "2 2", op: 0.6 }) +
    '<circle cx="38" cy="70" r="11" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="62" cy="70" r="11" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="2"/>' +
    up(38) + down(62) +
    '<text x="50" y="95" text-anchor="middle" font-size="7" ' + TXT + ' opacity="0.8">1O2</text>'
  );
}

function shapeAie() {
  // Aggregation-induced emission: a packed cluster of propeller-shaped
  // molecules whose rotation is locked, so the cluster glows.
  let parts = ['<circle cx="50" cy="60" r="31" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2.4" opacity="0.5"/>'];
  let spots = [[50, 60]];
  for (let k = 0; k < 6; k++) {
    let a = ((30 + 60 * k) * Math.PI) / 180;
    spots.push([50 + 18 * Math.cos(a), 60 + 18 * Math.sin(a)]);
  }
  spots.forEach((p) => {
    let hex = [];
    for (let i = 0; i < 6; i++) {
      let a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      hex.push(f(p[0] + 6.5 * Math.cos(a)) + "," + f(p[1] + 6.5 * Math.sin(a)));
    }
    parts.push('<polygon points="' + hex.join(" ") + '" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>');
    for (let i = 0; i < 3; i++) {
      let a = (Math.PI * 2 * i) / 3 + Math.PI / 6;
      parts.push(
        '<line x1="' + f(p[0] + 6.5 * Math.cos(a)) + '" y1="' + f(p[1] + 6.5 * Math.sin(a)) + '" x2="' + f(p[0] + 10.5 * Math.cos(a)) + '" y2="' + f(p[1] + 10.5 * Math.sin(a)) +
        '" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>'
      );
    }
  });
  parts.push(sun(50, 12, 4.5, 3));
  return parts.join("");
}

function shapeYield() {
  // Quantum yield: photons in, fewer photons out.
  let parts = [];
  [34, 44, 54, 64].forEach((y) => parts.push(arrow(6, y + 2, 32, y + 2, { w: 1.8, size: 4.5 })));
  parts.push(disc(50, 52, 15, "Φ", 16));
  [40, 52, 64].forEach((y) => parts.push(arrow(68, y, 94, y, { w: 1.8, size: 4.5, op: 0.8 })));
  return parts.join("");
}

function shapeUpconversion() {
  // TTA up-conversion: two triplets merge into one higher-energy singlet
  // that emits a bluer (tighter) photon.
  return (
    disc(18, 28, 9, "T", 10) +
    disc(18, 72, 9, "T", 10) +
    arrow(27, 32, 43, 45, { w: 1.8 }) +
    arrow(27, 68, 43, 55, { w: 1.8 }) +
    disc(56, 50, 13, "S1", 10) +
    wavePath(72, 90, 50, 6, 3.5, 0.9, 1.8) +
    head(95, 50, 1, 0, 5) +
    '<text x="56" y="76" text-anchor="middle" font-size="7" ' + TXT + ' opacity="0.75">TTA</text>'
  );
}

function buildSvg(item) {
  switch (item.shape) {
    case "jablonski-fluor": return shapeJablonski({ emit: "fluor" });
    case "jablonski-phos": return shapeJablonski({ emit: "phos", showTriplet: true });
    case "jablonski-ic": return shapeJablonski({ emit: "ic" });
    case "jablonski-isc": return shapeJablonski({ emit: "isc", showTriplet: true });
    case "jablonski-tadf": return shapeJablonski({ emit: "tadf", showTriplet: true });
    case "transfer": return shapeTransfer(item.shapeOpts || {});
    case "orbital-out": return shapeOrbitalWave({ direction: "out", extra: item.extra });
    case "orbital-in": return shapeOrbitalWave({ direction: "in", extra: item.extra });
    case "orbital-pair": return shapeOrbitalWave({ pair: true });
    case "band": return shapeBand();
    case "redox": return shapeRedox((item.shapeOpts || {}).label || "Ru");
    case "oxygen": return shapeOxygen();
    case "aie": return shapeAie();
    case "yield": return shapeYield();
    case "upconversion": return shapeUpconversion();
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
  { code: "SOX", fullName: "Singlet oxygen (1O2)", shape: "oxygen",
    note: "Spin-flipped O2 generated by sensitisers. Workhorse of photodynamic therapy and photo-oxidation." },
  { code: "PHCAT", fullName: "Photoredox catalysis", shape: "redox",
    shapeOpts: { label: "Ru" },
    note: "A photoexcited metal complex (Ru, Ir) or organic dye drives single-electron redox cycles." },
  { code: "TIO2", fullName: "TiO2 photocatalysis", shape: "band",
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
  { code: "CHEMI", fullName: "Chemiluminescence", shape: "orbital-out", extra: "bolt",
    note: "Chemical reaction populates an excited product that emits. Luminol glow, lightsticks, GFP luciferase." },
  { code: "PHION", fullName: "Photoionisation", shape: "orbital-in", extra: "electron",
    note: "Absorbed photon ejects an electron into the continuum. Threshold set by the ionisation potential." },
  { code: "QY", fullName: "Quantum yield", shape: "yield",
    note: "Phi = photons out / photons in (emission) or events / photons in (reaction). The headline photophysics number." },
  { code: "UPCNV", fullName: "Triplet-triplet annihilation up-conversion", shape: "upconversion",
    note: "Two triplets combine into one higher-energy singlet. Low-power up-conversion of near-IR to visible." },
  { code: "AIEG", fullName: "Aggregation-induced emission", shape: "aie",
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
