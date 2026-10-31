import moment from "moment";

// Protein theme: structural motifs, folds and landmark proteins from
// biochemistry and structural biology. Each entry carries a schematic SVG
// depiction of its secondary-structure signature (helices as coiled
// ribbons, sheets as arrows, loops as curves) so the splash and project
// covers feel distinct from the other science themes.
//
// Rendering: every item declares an array of "elements" — helix, sheet,
// loop, or domain — each with position and size on a 100x100 canvas.
// buildSvg() assembles the inline SVG markup using currentColor so host
// tinting works as in the other helpers.

const SIZE = 100;

// ── Drawing primitives ──────────────────────────────────────────────

// Alpha helix: a stylised coiled ribbon drawn as stacked sine-wave
// curves, evoking the 3.6-residue helical backbone.
function drawHelix(cx, cy, w, h) {
  let x0 = cx - w / 2;
  let x1 = cx + w / 2;
  let mid = cy;
  let amp = h * 0.35;
  let turns = 3;
  let parts = [];
  // Halo
  parts.push(
    '<path d="M ' + x0 + ',' + mid + sinPath(x0, x1, mid, amp, turns) +
    '" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.15"/>'
  );
  // Main ribbon
  parts.push(
    '<path d="M ' + x0 + ',' + mid + sinPath(x0, x1, mid, amp, turns) +
    '" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>'
  );
  // Second phase-shifted ribbon for depth
  parts.push(
    '<path d="M ' + x0 + ',' + mid + sinPath(x0, x1, mid, amp * 0.6, turns, Math.PI) +
    '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.4"/>'
  );
  return parts.join("");
}

function sinPath(x0, x1, cy, amp, turns, phase) {
  phase = phase || 0;
  let steps = 40;
  let dx = (x1 - x0) / steps;
  let d = "";
  for (let i = 1; i <= steps; i++) {
    let x = x0 + dx * i;
    let t = (i / steps) * Math.PI * 2 * turns + phase;
    let y = cy + amp * Math.sin(t);
    d += " L " + x.toFixed(2) + "," + y.toFixed(2);
  }
  return d;
}

// Beta sheet: a flat arrow pointing right, the classic sheet-strand icon.
function drawSheet(cx, cy, w, h) {
  let x0 = cx - w / 2;
  let x1 = cx + w / 2;
  let bodyH = h * 0.35;
  let arrowW = w * 0.22;
  // Body rectangle + arrowhead
  let bx1 = x1 - arrowW;
  let pts = [
    x0 + "," + (cy - bodyH),
    bx1 + "," + (cy - bodyH),
    bx1 + "," + (cy - h / 2),
    x1 + "," + cy,
    bx1 + "," + (cy + h / 2),
    bx1 + "," + (cy + bodyH),
    x0 + "," + (cy + bodyH),
  ].join(" ");
  return (
    '<polygon points="' + pts + '" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
  );
}

// Loop / coil: a gentle curved line between two points.
function drawLoop(cx, cy, w, h) {
  let x0 = cx - w / 2;
  let x1 = cx + w / 2;
  let cp1x = x0 + w * 0.3;
  let cp2x = x0 + w * 0.7;
  let cp1y = cy - h;
  let cp2y = cy + h;
  return (
    '<path d="M ' + x0 + ',' + cy +
    ' C ' + cp1x.toFixed(2) + ',' + cp1y.toFixed(2) +
    ' ' + cp2x.toFixed(2) + ',' + cp2y.toFixed(2) +
    ' ' + x1 + ',' + cy +
    '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.55"/>'
  );
}

// Domain circle: a soft filled circle representing a globular domain.
function drawDomain(cx, cy, r) {
  return (
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
    '" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="2"/>'
  );
}

// Disulfide bridge: a small "S—S" marker.
function drawDisulfide(cx, cy) {
  return (
    '<line x1="' + (cx - 6) + '" y1="' + cy + '" x2="' + (cx + 6) + '" y2="' + cy +
    '" stroke="#d6a141" stroke-width="1.8" opacity="0.7"/>' +
    '<text x="' + (cx - 6) + '" y="' + (cy - 3) +
    '" text-anchor="middle" font-size="5" font-family="sans-serif" font-weight="700" fill="#d6a141" opacity="0.85">S</text>' +
    '<text x="' + (cx + 6) + '" y="' + (cy - 3) +
    '" text-anchor="middle" font-size="5" font-family="sans-serif" font-weight="700" fill="#d6a141" opacity="0.85">S</text>'
  );
}

// ── SVG builder ─────────────────────────────────────────────────────

function buildSvg(item) {
  let parts = [];
  (item.elements || []).forEach(function (el) {
    switch (el.type) {
      case "helix":
        parts.push(drawHelix(el.cx, el.cy, el.w || 36, el.h || 18));
        break;
      case "sheet":
        parts.push(drawSheet(el.cx, el.cy, el.w || 30, el.h || 14));
        break;
      case "loop":
        parts.push(drawLoop(el.cx, el.cy, el.w || 24, el.h || 10));
        break;
      case "domain":
        parts.push(drawDomain(el.cx, el.cy, el.r || 16));
        break;
      case "disulfide":
        parts.push(drawDisulfide(el.cx, el.cy));
        break;
    }
  });
  // Optional PDB-style label in the corner
  if (item.pdb) {
    parts.push(
      '<text x="92" y="10" text-anchor="end" font-size="6" font-family="monospace" font-weight="600" fill="currentColor" opacity="0.4">' +
      item.pdb + '</text>'
    );
  }
  return parts.join("");
}

// ── Protein / motif catalogue ───────────────────────────────────────
// 20 items covering folds, structural motifs and landmark proteins.

const ITEMS = [
  {
    code: "alpha-helix", fullName: "Alpha Helix", pdb: null, year: 1951,
    note: "Pauling and Corey predicted the 3.6₁₃ helix in 1951. The most common secondary structure in nature.",
    elements: [
      { type: "helix", cx: 50, cy: 50, w: 60, h: 22 },
    ],
  },
  {
    code: "beta-sheet", fullName: "Beta Sheet", pdb: null, year: 1951,
    note: "Parallel or antiparallel hydrogen-bonded strands forming a pleated sheet. The second pillar of protein structure.",
    elements: [
      { type: "sheet", cx: 50, cy: 30, w: 50, h: 14 },
      { type: "sheet", cx: 50, cy: 55, w: 50, h: 14 },
      { type: "sheet", cx: 50, cy: 80, w: 50, h: 14 },
    ],
  },
  {
    code: "helix-turn-helix", fullName: "Helix-Turn-Helix", pdb: null, year: 1982,
    note: "Classic DNA-binding motif. Two helices connected by a short turn, one reading the major groove.",
    elements: [
      { type: "helix", cx: 30, cy: 38, w: 34, h: 14 },
      { type: "loop", cx: 50, cy: 52, w: 16, h: 8 },
      { type: "helix", cx: 70, cy: 65, w: 34, h: 14 },
    ],
  },
  {
    code: "beta-barrel", fullName: "Beta Barrel", pdb: null, year: 1979,
    note: "A closed cylinder of beta strands. Found in porins, GFP, and lipocalins.",
    elements: [
      { type: "sheet", cx: 30, cy: 30, w: 24, h: 12 },
      { type: "sheet", cx: 70, cy: 30, w: 24, h: 12 },
      { type: "sheet", cx: 30, cy: 70, w: 24, h: 12 },
      { type: "sheet", cx: 70, cy: 70, w: 24, h: 12 },
      { type: "domain", cx: 50, cy: 50, r: 28 },
    ],
  },
  {
    code: "coiled-coil", fullName: "Coiled-coil", pdb: null, year: 1953,
    note: "Two or more helices wound around each other. Leucine zippers, myosin, keratin all use this rope-like motif.",
    elements: [
      { type: "helix", cx: 42, cy: 45, w: 55, h: 16 },
      { type: "helix", cx: 58, cy: 58, w: 55, h: 16 },
    ],
  },
  {
    code: "zinc-finger", fullName: "Zinc Finger", pdb: "1ZNF", year: 1985,
    note: "Compact ββα fold stabilised by a zinc ion. The most abundant DNA-binding domain in eukaryotic genomes.",
    elements: [
      { type: "sheet", cx: 35, cy: 35, w: 22, h: 10 },
      { type: "sheet", cx: 35, cy: 50, w: 22, h: 10 },
      { type: "helix", cx: 65, cy: 55, w: 28, h: 14 },
      { type: "loop", cx: 50, cy: 28, w: 20, h: 8 },
    ],
  },
  {
    code: "globin-fold", fullName: "Globin Fold", pdb: "1MBO", year: 1958,
    note: "Kendrew solved myoglobin in 1958, the first protein structure ever. Eight helices cradling a haem group.",
    elements: [
      { type: "helix", cx: 30, cy: 30, w: 30, h: 12 },
      { type: "helix", cx: 70, cy: 30, w: 30, h: 12 },
      { type: "helix", cx: 30, cy: 60, w: 30, h: 12 },
      { type: "helix", cx: 70, cy: 60, w: 30, h: 12 },
      { type: "domain", cx: 50, cy: 45, r: 10 },
    ],
  },
  {
    code: "immunoglobulin", fullName: "Immunoglobulin Fold", pdb: "1IGT", year: 1973,
    note: "Two stacked beta sheets forming a sandwich. Building block of antibodies and countless cell-surface receptors.",
    elements: [
      { type: "sheet", cx: 38, cy: 30, w: 28, h: 12 },
      { type: "sheet", cx: 38, cy: 50, w: 28, h: 12 },
      { type: "sheet", cx: 62, cy: 40, w: 28, h: 12 },
      { type: "sheet", cx: 62, cy: 60, w: 28, h: 12 },
      { type: "disulfide", cx: 50, cy: 75 },
    ],
  },
  {
    code: "tim-barrel", fullName: "TIM Barrel (βα)₈", pdb: "1TIM", year: 1975,
    note: "Eight alternating beta-alpha units forming a barrel. The most common enzyme fold, found in ~10% of all enzymes.",
    elements: [
      { type: "sheet", cx: 50, cy: 50, w: 16, h: 10 },
      { type: "helix", cx: 28, cy: 35, w: 22, h: 10 },
      { type: "helix", cx: 72, cy: 35, w: 22, h: 10 },
      { type: "helix", cx: 28, cy: 65, w: 22, h: 10 },
      { type: "helix", cx: 72, cy: 65, w: 22, h: 10 },
      { type: "domain", cx: 50, cy: 50, r: 30 },
    ],
  },
  {
    code: "rossmann", fullName: "Rossmann Fold", pdb: "6LDH", year: 1974,
    note: "βαβαβ sandwich that binds NAD⁺ and FAD. The workhorse of dehydrogenases and reductases.",
    elements: [
      { type: "sheet", cx: 50, cy: 35, w: 42, h: 12 },
      { type: "helix", cx: 35, cy: 55, w: 26, h: 12 },
      { type: "helix", cx: 65, cy: 55, w: 26, h: 12 },
      { type: "sheet", cx: 50, cy: 72, w: 42, h: 12 },
    ],
  },
  {
    code: "ef-hand", fullName: "EF-Hand", pdb: "1CLL", year: 1973,
    note: "Helix-loop-helix calcium-binding motif. Named after helices E and F in parvalbumin. Key to calmodulin signalling.",
    elements: [
      { type: "helix", cx: 30, cy: 40, w: 30, h: 14 },
      { type: "loop", cx: 50, cy: 55, w: 18, h: 12 },
      { type: "helix", cx: 70, cy: 65, w: 30, h: 14 },
      { type: "domain", cx: 50, cy: 55, r: 5 },
    ],
  },
  {
    code: "sh3-domain", fullName: "SH3 Domain", pdb: "1SHG", year: 1992,
    note: "Small all-beta domain recognising proline-rich sequences. Ubiquitous in signal transduction.",
    elements: [
      { type: "sheet", cx: 35, cy: 30, w: 22, h: 10 },
      { type: "sheet", cx: 65, cy: 30, w: 22, h: 10 },
      { type: "sheet", cx: 35, cy: 55, w: 22, h: 10 },
      { type: "sheet", cx: 65, cy: 55, w: 22, h: 10 },
      { type: "sheet", cx: 50, cy: 75, w: 22, h: 10 },
    ],
  },
  {
    code: "green-fp", fullName: "Green Fluorescent Protein", pdb: "1EMA", year: 1996,
    note: "Shimomura's jellyfish barrel. The chromophore autocatalytically forms inside an 11-strand beta barrel. Revolutionised cell biology.",
    elements: [
      { type: "domain", cx: 50, cy: 50, r: 28 },
      { type: "sheet", cx: 28, cy: 35, w: 14, h: 10 },
      { type: "sheet", cx: 72, cy: 35, w: 14, h: 10 },
      { type: "sheet", cx: 28, cy: 65, w: 14, h: 10 },
      { type: "sheet", cx: 72, cy: 65, w: 14, h: 10 },
      { type: "helix", cx: 50, cy: 50, w: 20, h: 10 },
    ],
  },
  {
    code: "collagen", fullName: "Collagen Triple Helix", pdb: "1CAG", year: 1955,
    note: "Three left-handed polyproline-II helices wound into a right-handed superhelix. The most abundant protein in mammals.",
    elements: [
      { type: "helix", cx: 40, cy: 42, w: 55, h: 12 },
      { type: "helix", cx: 50, cy: 50, w: 55, h: 12 },
      { type: "helix", cx: 60, cy: 58, w: 55, h: 12 },
    ],
  },
  {
    code: "lysozyme", fullName: "Lysozyme", pdb: "2LYZ", year: 1965,
    note: "Phillips solved it in 1965, the first enzyme structure. Two domains with the active site in the cleft between them.",
    elements: [
      { type: "domain", cx: 35, cy: 45, r: 20 },
      { type: "domain", cx: 65, cy: 55, r: 18 },
      { type: "helix", cx: 35, cy: 35, w: 22, h: 10 },
      { type: "sheet", cx: 65, cy: 50, w: 20, h: 10 },
    ],
  },
  {
    code: "kinase", fullName: "Protein Kinase Fold", pdb: "2CPK", year: 1991,
    note: "Bilobal architecture: a small N-lobe of sheets and one helix, a large C-lobe of helices. Phosphorylation's universal scaffold.",
    elements: [
      { type: "sheet", cx: 35, cy: 30, w: 24, h: 10 },
      { type: "sheet", cx: 35, cy: 45, w: 24, h: 10 },
      { type: "helix", cx: 35, cy: 60, w: 22, h: 10 },
      { type: "helix", cx: 65, cy: 40, w: 26, h: 12 },
      { type: "helix", cx: 65, cy: 60, w: 26, h: 12 },
      { type: "helix", cx: 65, cy: 75, w: 26, h: 12 },
    ],
  },
  {
    code: "wd40", fullName: "WD40 Beta Propeller", pdb: "1ERJ", year: 1999,
    note: "Seven-bladed beta propeller. A protein-protein interaction platform in chromatin, signalling, and vesicle transport.",
    elements: [
      { type: "sheet", cx: 50, cy: 22, w: 16, h: 8 },
      { type: "sheet", cx: 28, cy: 32, w: 16, h: 8 },
      { type: "sheet", cx: 72, cy: 32, w: 16, h: 8 },
      { type: "sheet", cx: 22, cy: 55, w: 16, h: 8 },
      { type: "sheet", cx: 78, cy: 55, w: 16, h: 8 },
      { type: "sheet", cx: 32, cy: 74, w: 16, h: 8 },
      { type: "sheet", cx: 68, cy: 74, w: 16, h: 8 },
      { type: "domain", cx: 50, cy: 50, r: 14 },
    ],
  },
  {
    code: "leucine-zipper", fullName: "Leucine Zipper", pdb: "2ZTA", year: 1988,
    note: "Coiled-coil dimerisation motif. Leucines at every seventh position interlock like a zip. Key to bZIP transcription factors.",
    elements: [
      { type: "helix", cx: 40, cy: 50, w: 60, h: 16 },
      { type: "helix", cx: 60, cy: 50, w: 60, h: 16 },
    ],
  },
  {
    code: "p53-dbd", fullName: "p53 DNA-Binding Domain", pdb: "1TSR", year: 1994,
    note: "The guardian of the genome. Immunoglobulin-like beta sandwich with zinc-stabilised loops that read DNA. Most mutated protein in cancer.",
    elements: [
      { type: "sheet", cx: 40, cy: 35, w: 24, h: 10 },
      { type: "sheet", cx: 40, cy: 52, w: 24, h: 10 },
      { type: "loop", cx: 65, cy: 40, w: 18, h: 12 },
      { type: "loop", cx: 65, cy: 60, w: 18, h: 12 },
      { type: "disulfide", cx: 50, cy: 75 },
    ],
  },
  {
    code: "cas9", fullName: "CRISPR-Cas9", pdb: "4OO8", year: 2014,
    note: "Doudna and Charpentier's RNA-guided nuclease. Two lobes, REC and NUC, clamp around guide RNA and target DNA. Genome editing's workhorse.",
    elements: [
      { type: "domain", cx: 32, cy: 45, r: 22 },
      { type: "domain", cx: 68, cy: 55, r: 22 },
      { type: "helix", cx: 32, cy: 38, w: 22, h: 10 },
      { type: "helix", cx: 32, cy: 55, w: 22, h: 10 },
      { type: "sheet", cx: 68, cy: 48, w: 20, h: 10 },
      { type: "helix", cx: 68, cy: 64, w: 22, h: 10 },
    ],
  },
];

// ── Hash ────────────────────────────────────────────────────────────

function hashCode(str) {
  str = String(str);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Repeating-tile mask ─────────────────────────────────────────────
// Soft helix-and-strand pattern for the splash background, keeping the
// same API as zeoliteHelper (encoded SVG data URL).

function proteinMaskUrl() {
  let size = 44;
  let svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "' viewBox='0 0 " + size + " " + size + "'>" +
    // Small helix-like wave
    "<path d='M 4,12 C 8,6 14,18 18,12 C 22,6 28,18 32,12' fill='none' stroke='#000' stroke-width='1' opacity='0.7'/>" +
    // Small sheet arrow
    "<polygon points='10,30 28,30 28,27 34,32 28,37 28,34 10,34' fill='none' stroke='#000' stroke-width='0.8' opacity='0.6'/>" +
    "</svg>";
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

const MASK = proteinMaskUrl();

function build(it) {
  return {
    code: it.code,
    name: it.code,
    fullName: it.fullName,
    note: it.note,
    year: it.year || null,
    meta: it.pdb ? "PDB " + it.pdb : "motif",
    pdb: it.pdb,
    svgShape: buildSvg(it),
    viewBox: "0 0 " + SIZE + " " + SIZE,
    mask: MASK,
    maskSize: "44px 44px",
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
