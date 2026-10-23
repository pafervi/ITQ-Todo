import moment from "moment";

// Organic chemistry theme: a curated set of aromatic and heterocyclic rings,
// alkaloid cores and functional archetypes that any organic chemist will
// recognise at a glance. Each entry carries its common ring skeleton (5- or
// 6-membered, isolated or fused) plus the heteroatom letters that place it in
// the right family (N for pyridine, O for furan, S for thiophene, etc.).
//
// Rendering strategy: every item declares a list of regular polygon rings
// placed on a 100x100 canvas with explicit centres, plus an array of
// heteroatom labels drawn on top of specific ring vertices. buildSvg()
// generates the inline SVG markup, which the component renders through
// v-html so the splash and project covers can tint it with currentColor.

const SIZE = 100;
const CENTER = 50;
const RING_R = 20;      // radius for a single-ring molecule
const FUSED_R = 15;     // radius when two rings sit side by side
const TRIPLE_R = 12;    // radius for three fused rings in a row

// Vertices of a regular polygon in a 100x100 viewBox. `rotate` tilts the
// polygon so hexagons sit "pointy top" and pentagons sit upright.
function vertices(cx, cy, r, sides, rotate) {
  let out = [];
  for (let i = 0; i < sides; i++) {
    let a = (Math.PI * 2 * i) / sides - Math.PI / 2 + (rotate || 0);
    out.push({
      x: +(cx + r * Math.cos(a)).toFixed(2),
      y: +(cy + r * Math.sin(a)).toFixed(2),
    });
  }
  return out;
}

function polygonFromVertices(verts) {
  return verts.map((v) => v.x + "," + v.y).join(" ");
}

// Build the SVG markup for one organic item: outline for every ring, soft
// fill for the first ring, and letter labels for every heteroatom. All
// strokes use currentColor so the host container's tint (project colour or
// splash accent) carries through.
function buildSvg(item) {
  let rings = item.rings.map((r) => {
    return {
      verts: vertices(r.cx, r.cy, r.r, r.sides, r.rotate || 0),
      sides: r.sides,
    };
  });
  let parts = [];
  // Outline every ring
  rings.forEach((ring, i) => {
    let pts = polygonFromVertices(ring.verts);
    parts.push(
      '<polygon points="' + pts + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>'
    );
    if (i === 0) {
      parts.push(
        '<polygon points="' + pts + '" fill="currentColor" fill-opacity="0.09"/>'
      );
    }
  });
  // Draw internal double bonds for aromatic rings as short parallel lines
  // along alternating edges. Keeps the visual mnemonic: a benzene reads as
  // a hex with three internal dashes.
  if (item.aromatic) {
    rings.forEach((ring) => {
      let shrink = 0.72;
      let cx = ring.verts.reduce((s, v) => s + v.x, 0) / ring.verts.length;
      let cy = ring.verts.reduce((s, v) => s + v.y, 0) / ring.verts.length;
      for (let i = 0; i < ring.sides; i += 2) {
        let a = ring.verts[i];
        let b = ring.verts[(i + 1) % ring.sides];
        let ax = cx + (a.x - cx) * shrink;
        let ay = cy + (a.y - cy) * shrink;
        let bx = cx + (b.x - cx) * shrink;
        let by = cy + (b.y - cy) * shrink;
        parts.push(
          '<line x1="' + ax.toFixed(2) + '" y1="' + ay.toFixed(2) + '" x2="' + bx.toFixed(2) + '" y2="' + by.toFixed(2) + '" stroke="currentColor" stroke-width="1.6" opacity="0.6"/>'
        );
      }
    });
  }
  // Heteroatom labels. Each is a filled circle backing with the letter on
  // top, placed at a vertex coordinate (indexed into the first ring unless
  // the item says otherwise).
  (item.heteros || []).forEach((h) => {
    let ring = rings[h.ring || 0];
    if (!ring) return;
    let v = ring.verts[h.vertex % ring.verts.length];
    parts.push(
      '<circle cx="' + v.x + '" cy="' + v.y + '" r="6" fill="currentColor" opacity="0.95"/>'
    );
    parts.push(
      '<text x="' + v.x + '" y="' + (v.y + 2.5) + '" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="700" fill="#fff">' + h.label + '</text>'
    );
  });
  return parts.join("");
}

// Molecule definitions. Each item lists its rings (centre + sides) plus
// heteroatoms, so buildSvg can render the correct skeleton without hard-
// coding SVG for every one. 20 covers the usual suspects without becoming
// exhausting to scroll past daily.
const ITEMS = [
  {
    code: "C6H6", fullName: "Benzene", formula: "C6H6", year: 1825,
    note: "Faraday isolated it in 1825; Kekule's dream gave it the ring. The archetype of aromaticity.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 6 }],
  },
  {
    code: "C5H5N", fullName: "Pyridine", formula: "C5H5N", year: 1849,
    note: "Nitrogen in a benzene ring. Lone pair makes it a classic Lewis base and ligand.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 6 }],
    heteros: [{ label: "N", ring: 0, vertex: 0 }],
  },
  {
    code: "C4H4O", fullName: "Furan", formula: "C4H4O", year: 1870,
    note: "Five-membered aromatic with one oxygen. Smells faintly of chloroform; found in pine tar.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 5 }],
    heteros: [{ label: "O", ring: 0, vertex: 0 }],
  },
  {
    code: "C4H4S", fullName: "Thiophene", formula: "C4H4S", year: 1883,
    note: "Sulfur analogue of furan. Victor Meyer stumbled on it as a benzene impurity in 1883.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 5 }],
    heteros: [{ label: "S", ring: 0, vertex: 0 }],
  },
  {
    code: "C4H5N", fullName: "Pyrrole", formula: "C4H5N", year: 1834,
    note: "Five-membered aromatic with NH. Building block of porphyrins and chlorophyll.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 5 }],
    heteros: [{ label: "N", ring: 0, vertex: 0 }],
  },
  {
    code: "C3H4N2", fullName: "Imidazole", formula: "C3H4N2", year: 1858,
    note: "Two nitrogens, one donor and one acceptor. Side chain of histidine, workhorse of enzymology.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 5 }],
    heteros: [{ label: "N", ring: 0, vertex: 0 }, { label: "N", ring: 0, vertex: 2 }],
  },
  {
    code: "C3H4N2p", fullName: "Pyrazole", formula: "C3H4N2", year: 1883,
    note: "N-N adjacent. Scaffold of celecoxib and many drug cores.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 5 }],
    heteros: [{ label: "N", ring: 0, vertex: 0 }, { label: "N", ring: 0, vertex: 1 }],
  },
  {
    code: "C4H4N2", fullName: "Pyrimidine", formula: "C4H4N2", year: 1884,
    note: "Six-ring with 1,3-N. Base of cytosine, thymine, uracil in DNA/RNA.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 6 }],
    heteros: [{ label: "N", ring: 0, vertex: 0 }, { label: "N", ring: 0, vertex: 2 }],
  },
  {
    code: "C4H4N2p", fullName: "Pyrazine", formula: "C4H4N2", year: 1876,
    note: "Six-ring with 1,4-N. The nutty, roasted note in coffee and bread crust.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 6 }],
    heteros: [{ label: "N", ring: 0, vertex: 0 }, { label: "N", ring: 0, vertex: 3 }],
  },
  {
    code: "C3H3N3", fullName: "1,3,5-Triazine", formula: "C3H3N3", year: 1895,
    note: "Three nitrogens alternated. Core of melamine, cyanuric acid, countless energetic materials.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 6 }],
    heteros: [{ label: "N", ring: 0, vertex: 0 }, { label: "N", ring: 0, vertex: 2 }, { label: "N", ring: 0, vertex: 4 }],
  },
  {
    code: "C10H8", fullName: "Naphthalene", formula: "C10H8", year: 1819,
    note: "Two fused benzenes. The mothball molecule, John Kidd's coal-tar isolate of 1819.",
    aromatic: true,
    rings: [
      { cx: CENTER - FUSED_R * 0.87, cy: CENTER, r: FUSED_R, sides: 6 },
      { cx: CENTER + FUSED_R * 0.87, cy: CENTER, r: FUSED_R, sides: 6 },
    ],
  },
  {
    code: "C14H10", fullName: "Anthracene", formula: "C14H10", year: 1832,
    note: "Three benzenes fused in a line. Fluorescent in UV; backbone of acenes.",
    aromatic: true,
    rings: [
      { cx: CENTER - TRIPLE_R * 1.74, cy: CENTER, r: TRIPLE_R, sides: 6 },
      { cx: CENTER, cy: CENTER, r: TRIPLE_R, sides: 6 },
      { cx: CENTER + TRIPLE_R * 1.74, cy: CENTER, r: TRIPLE_R, sides: 6 },
    ],
  },
  {
    code: "C14H10p", fullName: "Phenanthrene", formula: "C14H10", year: 1872,
    note: "Three benzenes fused in a kink. Non-linear acene; precursor to steroid skeletons.",
    aromatic: true,
    rings: [
      { cx: CENTER - TRIPLE_R * 1.3, cy: CENTER + TRIPLE_R * 0.75, r: TRIPLE_R, sides: 6 },
      { cx: CENTER, cy: CENTER - TRIPLE_R * 0.1, r: TRIPLE_R, sides: 6 },
      { cx: CENTER + TRIPLE_R * 1.3, cy: CENTER + TRIPLE_R * 0.75, r: TRIPLE_R, sides: 6 },
    ],
  },
  {
    code: "C8H7N", fullName: "Indole", formula: "C8H7N", year: 1866,
    note: "Benzene fused with pyrrole. Side chain of tryptophan, scaffold of serotonin, LSD, auxins.",
    aromatic: true,
    rings: [
      { cx: CENTER - FUSED_R * 0.8, cy: CENTER, r: FUSED_R, sides: 5 },
      { cx: CENTER + FUSED_R * 0.9, cy: CENTER, r: FUSED_R, sides: 6 },
    ],
    heteros: [{ label: "N", ring: 0, vertex: 0 }],
  },
  {
    code: "C9H7N", fullName: "Quinoline", formula: "C9H7N", year: 1834,
    note: "Benzene fused with pyridine. Core of quinine; isolated from coal tar by Runge.",
    aromatic: true,
    rings: [
      { cx: CENTER - FUSED_R * 0.87, cy: CENTER, r: FUSED_R, sides: 6 },
      { cx: CENTER + FUSED_R * 0.87, cy: CENTER, r: FUSED_R, sides: 6 },
    ],
    heteros: [{ label: "N", ring: 0, vertex: 3 }],
  },
  {
    code: "C5H5N3O", fullName: "Purine", formula: "C5H4N4", year: 1884,
    note: "Fused pyrimidine + imidazole. Adenine and guanine own this core; Emil Fischer's winter puzzle.",
    aromatic: true,
    rings: [
      { cx: CENTER + FUSED_R * 0.87, cy: CENTER, r: FUSED_R, sides: 6 },
      { cx: CENTER - FUSED_R * 0.8, cy: CENTER, r: FUSED_R, sides: 5 },
    ],
    heteros: [
      { label: "N", ring: 0, vertex: 0 },
      { label: "N", ring: 0, vertex: 2 },
      { label: "N", ring: 1, vertex: 0 },
      { label: "N", ring: 1, vertex: 2 },
    ],
  },
  {
    code: "C3H3NO", fullName: "Oxazole", formula: "C3H3NO", year: 1947,
    note: "Five-ring with N and O at 1,3. Found in natural products like oxazolomycin.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 5 }],
    heteros: [{ label: "O", ring: 0, vertex: 0 }, { label: "N", ring: 0, vertex: 2 }],
  },
  {
    code: "C3H3NS", fullName: "Thiazole", formula: "C3H3NS", year: 1887,
    note: "Five-ring with N and S at 1,3. Vitamin B1 and penicillin carry this core.",
    aromatic: true,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 5 }],
    heteros: [{ label: "S", ring: 0, vertex: 0 }, { label: "N", ring: 0, vertex: 2 }],
  },
  {
    code: "C6H12", fullName: "Cyclohexane", formula: "C6H12", year: 1894,
    note: "Chair vs boat vs twist-boat. Sachse and Mohr argued conformations into existence here.",
    aromatic: false,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 6 }],
  },
  {
    code: "C5H10", fullName: "Cyclopentane", formula: "C5H10", year: 1891,
    note: "Envelope and half-chair conformers. The five-ring that steroid chemistry grew up on.",
    aromatic: false,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 5 }],
  },
  {
    code: "C8H6N2", fullName: "Benzimidazole", formula: "C7H6N2", year: 1872,
    note: "Benzene fused with imidazole. Core of albendazole and the ribonucleoside analogues.",
    aromatic: true,
    rings: [
      { cx: CENTER - FUSED_R * 0.8, cy: CENTER, r: FUSED_R, sides: 5 },
      { cx: CENTER + FUSED_R * 0.9, cy: CENTER, r: FUSED_R, sides: 6 },
    ],
    heteros: [{ label: "N", ring: 0, vertex: 0 }, { label: "N", ring: 0, vertex: 2 }],
  },
  {
    code: "C9H7NO", fullName: "Benzofuran", formula: "C8H6O", year: 1870,
    note: "Benzene fused with furan. Found in anti-inflammatories and amiodarone.",
    aromatic: true,
    rings: [
      { cx: CENTER - FUSED_R * 0.8, cy: CENTER, r: FUSED_R, sides: 5 },
      { cx: CENTER + FUSED_R * 0.9, cy: CENTER, r: FUSED_R, sides: 6 },
    ],
    heteros: [{ label: "O", ring: 0, vertex: 0 }],
  },
  {
    code: "C12H9N", fullName: "Carbazole", formula: "C12H9N", year: 1872,
    note: "Three fused rings, central pyrrole. OLED emitter host; core of ellipticine.",
    aromatic: true,
    rings: [
      { cx: CENTER - TRIPLE_R * 1.4, cy: CENTER, r: TRIPLE_R, sides: 6 },
      { cx: CENTER, cy: CENTER, r: TRIPLE_R * 0.9, sides: 5 },
      { cx: CENTER + TRIPLE_R * 1.4, cy: CENTER, r: TRIPLE_R, sides: 6 },
    ],
    heteros: [{ label: "N", ring: 1, vertex: 0 }],
  },
  {
    code: "C5H10O", fullName: "Tetrahydropyran", formula: "C5H10O", year: 1890,
    note: "Chair six-ring with one O. The sugar oxane. Scaffold of countless glycosides.",
    aromatic: false,
    rings: [{ cx: CENTER, cy: CENTER, r: RING_R, sides: 6 }],
    heteros: [{ label: "O", ring: 0, vertex: 0 }],
  },
];

function hashCode(seed) {
  let str = String(seed || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

// Repeating-tile mask for the splash background: a scattered hexagon-ring
// pattern that reads as "organic chemistry" at a glance. Same shape of API
// as zeoliteHelper's mask (encoded SVG data URL) so themesHelper can route
// it to the splash without special-casing per theme.
function ringMaskUrl() {
  let size = 40;
  // Two offset hexagons so the tile does not look like a grid of beehives.
  let hexAt = (cx, cy, r) => {
    let pts = [];
    for (let i = 0; i < 6; i++) {
      let a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      pts.push((cx + r * Math.cos(a)).toFixed(2) + "," + (cy + r * Math.sin(a)).toFixed(2));
    }
    return pts.join(" ");
  };
  let svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "' viewBox='0 0 " + size + " " + size + "'>" +
    "<polygon points='" + hexAt(10, 10, 7) + "' fill='none' stroke='#000' stroke-width='1.1'/>" +
    "<polygon points='" + hexAt(30, 28, 6) + "' fill='none' stroke='#000' stroke-width='1'/>" +
    "</svg>";
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

const MASK = ringMaskUrl();

function build(it) {
  return {
    code: it.code,
    name: it.code,
    fullName: it.fullName,
    note: it.note,
    year: it.year || null,
    meta: it.formula ? "C" + (it.formula.match(/C(\d+)/) || ["", ""])[1] + " ring" : "",
    formula: it.formula,
    svgShape: buildSvg(it),
    viewBox: "0 0 " + SIZE + " " + SIZE,
    mask: MASK,
    maskSize: "40px 40px",
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
