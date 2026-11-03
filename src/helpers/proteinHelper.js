import moment from "moment";

// Protein theme: structural motifs, folds and landmark proteins from
// biochemistry and structural biology, drawn as schematic "cartoon"
// diagrams in the style of PyMOL / ChimeraX ribbon views:
//   - alpha helices as flat ribbons with a visible front and back turn,
//   - beta strands as two-tone arrows,
//   - loops as smooth tubes that connect the elements in chain order,
//   - metals, cofactors and DNA as gold / thin-line accents.
//
// Every item is a small function that returns SVG markup for a 100x100
// canvas plus the points used to paint a soft "molecular surface" halo
// behind it. Everything uses currentColor (host accent) except the gold
// ligands, and there is no text, so the board background can rotate it
// slowly without anything ending up upside down.

const SIZE = 100;
const GOLD = "#d6a141";

// ── Small geometry helpers ──────────────────────────────────────────

const rad = (d) => (d * Math.PI) / 180;
const n1 = (v) => Math.round(v * 10) / 10;
const pol = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
const unit = (dx, dy) => {
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};

// Element made from its centre, length and angle (0 = right, 90 = down).
function mk(t, cx, cy, len, ang, o) {
  const a = rad(ang);
  const dx = (Math.cos(a) * len) / 2;
  const dy = (Math.sin(a) * len) / 2;
  return Object.assign({ t, len, ang, x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy }, o || {});
}
// Element made from its two end points.
function mk2(t, x1, y1, x2, y2, o) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return Object.assign({ t, len, ang, x1, y1, x2, y2 }, o || {});
}
const H = (cx, cy, len, ang, o) => mk("h", cx, cy, len, ang, o);
const S = (cx, cy, len, ang, o) => mk("s", cx, cy, len, ang, o);
const H2 = (x1, y1, x2, y2, o) => mk2("h", x1, y1, x2, y2, o);
const S2 = (x1, y1, x2, y2, o) => mk2("s", x1, y1, x2, y2, o);

const xform = (e) => 'transform="translate(' + n1(e.x1) + " " + n1(e.y1) + ") rotate(" + n1(e.ang) + ')"';
const colOf = (o) => (o && o.col) || "currentColor";

// ── Alpha helix: flat ribbon, front turns solid, back turns faint ───

function helixSvg(e) {
  const L = e.len;
  const pitch = e.pitch || Math.min(16, Math.max(10, L / 3));
  const r = e.r || pitch * 0.36;
  const bw = (e.bw ? e.bw / 3.1 : 1) * pitch * 0.27;
  const col = colOf(e);
  const turns = L / pitch;
  const steps = Math.max(30, Math.ceil(turns * 18));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const ph = Math.PI * 2 * turns * u + (e.phase || 0);
    pts.push({ x: L * u, y: r * Math.sin(ph), z: Math.cos(ph) });
  }
  const runs = [];
  let cur = null;
  for (let i = 0; i < pts.length; i++) {
    const side = pts[i].z >= 0;
    if (!cur || cur.side !== side) {
      cur = { side: side, p: [] };
      if (i > 0) cur.p.push(pts[i - 1]);
      runs.push(cur);
    }
    cur.p.push(pts[i]);
  }
  // The ribbon is wide along the helix axis (like a PyMOL cartoon), so
  // each turn reads as a flat band and not as a thin wire.
  const band = (run, half) => {
    const left = run.p.map((p) => n1(p.x - half) + "," + n1(p.y));
    const right = run.p.map((p) => n1(p.x + half) + "," + n1(p.y)).reverse();
    return left.concat(right).join(" ");
  };
  let back = "";
  let front = "";
  runs.forEach((run) => {
    if (run.p.length < 2) return;
    if (run.side) {
      front +=
        '<polygon points="' + band(run, bw) + '" fill="' + col + '" fill-opacity="0.34" stroke="' + col +
        '" stroke-width="1.4" stroke-linejoin="round"/>';
    } else {
      back +=
        '<polygon points="' + band(run, bw * 0.7) + '" fill="' + col + '" fill-opacity="0.08" stroke="' + col +
        '" stroke-width="0.9" stroke-linejoin="round" opacity="0.38"/>';
    }
  });
  return "<g " + xform(e) + ">" + back + front + "</g>";
}

// ── Beta strand: two-tone arrow with a fold line ────────────────────

function strandSvg(e) {
  const L = e.len;
  const w = e.w || 5.2;
  const hw = w / 2;
  const hh = w * 0.95;
  const hl = Math.min(L * 0.45, w * 2.1);
  const b = L - hl;
  const col = colOf(e);
  const pts = [[0, -hw], [b, -hw], [b, -hh], [L, 0], [b, hh], [b, hw], [0, hw]]
    .map((p) => n1(p[0]) + "," + n1(p[1]))
    .join(" ");
  return (
    "<g " + xform(e) + ">" +
    '<polygon points="' + pts + '" fill="' + col + '" fill-opacity="0.2" stroke="' + col + '" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<polygon points="0,0 ' + n1(b) + ",0 " + n1(b) + "," + n1(hw) + " 0," + n1(hw) + " " + n1(b) + "," + n1(hw) + " " + n1(b) + "," + n1(hh) + " " + n1(L) + ',0" fill="' + col + '" fill-opacity="0.16"/>' +
    '<line x1="1.5" y1="0" x2="' + n1(b) + '" y2="0" stroke="' + col + '" stroke-width="0.8" opacity="0.35"/>' +
    "</g>"
  );
}

// ── Loop: smooth tube joining the end of one element to the next ────

function linkSvg(a, b, o) {
  o = o || {};
  const d0 = unit(a.x2 - a.x1, a.y2 - a.y1);
  const d1 = unit(b.x2 - b.x1, b.y2 - b.y1);
  const dist = Math.hypot(b.x1 - a.x2, b.y1 - a.y2);
  const k = Math.max(dist * 0.42, 7) * (o.k || 1);
  const c1 = [a.x2 + d0[0] * k, a.y2 + d0[1] * k];
  const c2 = [b.x1 - d1[0] * k, b.y1 - d1[1] * k];
  const d =
    "M " + n1(a.x2) + "," + n1(a.y2) + " C " + n1(c1[0]) + "," + n1(c1[1]) + " " + n1(c2[0]) + "," + n1(c2[1]) + " " + n1(b.x1) + "," + n1(b.y1);
  const col = colOf(o);
  return (
    '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="4.2" stroke-linecap="round" opacity="0.1"/>' +
    '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" opacity="0.85"/>'
  );
}

// Free coil through arbitrary points (Catmull-Rom to Bezier).
function coilPath(points, o) {
  o = o || {};
  let d = "M " + n1(points[0][0]) + "," + n1(points[0][1]);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += " C " + n1(c1[0]) + "," + n1(c1[1]) + " " + n1(c2[0]) + "," + n1(c2[1]) + " " + n1(p2[0]) + "," + n1(p2[1]);
  }
  const col = colOf(o);
  return (
    '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="4.2" stroke-linecap="round" opacity="0.1"/>' +
    '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" opacity="0.85"/>'
  );
}

// A chain of elements in sequence order, auto-connected by loops
// (an element with nl: true is not linked to the next one).
function chain(els) {
  let links = "";
  let strands = "";
  let helices = "";
  const pts = [];
  els.forEach((e, i) => {
    pts.push([e.x1, e.y1], [e.x2, e.y2]);
    if (e.t === "h") helices += helixSvg(e);
    else strands += strandSvg(e);
    const nx = els[i + 1];
    if (nx && !e.nl) links += linkSvg(e, nx, { k: e.k });
  });
  return { svg: links + strands + helices, pts: pts };
}

// Wrap a result in a rotation / opacity group.
function grp(res, o) {
  o = o || {};
  const cx = o.cx === undefined ? 50 : o.cx;
  const cy = o.cy === undefined ? 50 : o.cy;
  const a = rad(o.rot || 0);
  const pts = res.pts.map((p) => {
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
  });
  const tr = o.rot ? ' transform="rotate(' + o.rot + " " + cx + " " + cy + ')"' : "";
  const op = o.op !== undefined ? ' opacity="' + o.op + '"' : "";
  return { svg: "<g" + tr + op + ">" + res.svg + "</g>", pts: pts };
}

// ── Super-coil: 2 or 3 helices wound around a common axis ───────────

function coilSvg(x1, y1, x2, y2, n, o) {
  o = o || {};
  const e = mk2("c", x1, y1, x2, y2);
  const L = e.len;
  const r = o.r || 5;
  const pitch = o.pitch || 26;
  const turns = L / pitch;
  const steps = Math.max(40, Math.ceil(turns * 26));
  let back = "";
  let front = "";
  const strandOp = [1, 0.72, 0.5];
  for (let k = 0; k < n; k++) {
    const phase = (Math.PI * 2 * k) / n;
    const runs = [];
    let cur = null;
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const ph = Math.PI * 2 * turns * u + phase;
      const p = { x: L * u, y: r * Math.sin(ph), z: Math.cos(ph) };
      const side = p.z >= 0;
      if (!cur || cur.side !== side) {
        cur = { side: side, p: [] };
        if (prev) cur.p.push(prev);
        runs.push(cur);
      }
      cur.p.push(p);
      prev = p;
    }
    runs.forEach((run) => {
      if (run.p.length < 2) return;
      const d = "M " + run.p.map((p) => n1(p.x) + "," + n1(p.y)).join(" L ");
      if (run.side) {
        front +=
          '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="5.6" stroke-linecap="round" opacity="0.1"/>' +
          '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" opacity="' + strandOp[k] + '"/>';
      } else {
        back += '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.28"/>';
      }
    });
  }
  let beads = "";
  if (o.beads) {
    for (let m = 1; m * pitch * 0.5 < L - 2; m++) {
      beads += '<circle cx="' + n1(m * pitch * 0.5) + '" cy="0" r="1.7" fill="' + GOLD + '" opacity="0.95"/>';
    }
  }
  return {
    svg: "<g " + xform(e) + ">" + back + front + beads + "</g>",
    pts: [[x1, y1], [x2, y2]],
  };
}

// ── DNA: two phase-shifted strands with base-pair rungs ─────────────

function dnaSvg(x1, y1, x2, y2, o) {
  o = o || {};
  const e = mk2("d", x1, y1, x2, y2);
  const L = e.len;
  const amp = o.amp || 4.5;
  const pitch = o.pitch || 17;
  const turns = L / pitch;
  const steps = Math.max(40, Math.ceil(turns * 24));
  let a = "";
  let b = "";
  let rungs = "";
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const ph = Math.PI * 2 * turns * u;
    const x = n1(L * u);
    const ya = n1(amp * Math.sin(ph));
    const yb = n1(-amp * Math.sin(ph));
    a += (i ? " L " : "M ") + x + "," + ya;
    b += (i ? " L " : "M ") + x + "," + yb;
  }
  const rungCount = Math.floor(turns * 5);
  for (let i = 1; i < rungCount; i++) {
    const u = i / rungCount;
    const ph = Math.PI * 2 * turns * u;
    const x = n1(L * u);
    const yy = n1(amp * Math.sin(ph));
    rungs += '<line x1="' + x + '" y1="' + yy + '" x2="' + x + '" y2="' + -yy + '"/>';
  }
  return {
    svg:
      "<g " + xform(e) + ">" +
      '<g stroke="currentColor" stroke-width="0.9" opacity="0.3">' + rungs + "</g>" +
      '<path d="' + b + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.4"/>' +
      '<path d="' + a + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>' +
      "</g>",
    pts: [[x1, y1], [x2, y2]],
  };
}

// ── Ligands, metals and cofactors ───────────────────────────────────

function sphere(cx, cy, r, col) {
  col = col || GOLD;
  return (
    '<circle cx="' + n1(cx) + '" cy="' + n1(cy) + '" r="' + n1(r * 1.9) + '" fill="' + col + '" opacity="0.16"/>' +
    '<circle cx="' + n1(cx) + '" cy="' + n1(cy) + '" r="' + n1(r) + '" fill="' + col + '" opacity="0.95"/>' +
    '<circle cx="' + n1(cx - r * 0.3) + '" cy="' + n1(cy - r * 0.3) + '" r="' + n1(r * 0.35) + '" fill="#fff" opacity="0.55"/>'
  );
}

function bonds(cx, cy, targets) {
  return (
    '<g stroke="' + GOLD + '" stroke-width="1" stroke-dasharray="2 1.6" stroke-linecap="round" opacity="0.85">' +
    targets.map((t) => '<line x1="' + n1(cx) + '" y1="' + n1(cy) + '" x2="' + n1(t[0]) + '" y2="' + n1(t[1]) + '"/>').join("") +
    "</g>"
  );
}

function haem(cx, cy, s, rot) {
  return (
    '<g transform="translate(' + n1(cx) + " " + n1(cy) + ") rotate(" + (rot || 0) + ')">' +
    '<rect x="' + -s + '" y="' + -s + '" width="' + 2 * s + '" height="' + 2 * s + '" rx="' + n1(s * 0.35) + '" fill="' + GOLD + '" fill-opacity="0.18" stroke="' + GOLD + '" stroke-width="1.4"/>' +
    '<circle r="' + n1(s * 0.6) + '" fill="none" stroke="' + GOLD + '" stroke-width="0.9" opacity="0.6"/>' +
    sphere(0, 0, s * 0.32) +
    "</g>"
  );
}

function ring6(cx, cy, r, rot) {
  const p = [];
  for (let i = 0; i < 6; i++) p.push(pol(cx, cy, r, (rot || 0) + i * 60).map(n1).join(","));
  return (
    '<polygon points="' + p.join(" ") + '" fill="' + GOLD + '" fill-opacity="0.18" stroke="' + GOLD + '" stroke-width="1.3" stroke-linejoin="round"/>' +
    '<circle cx="' + n1(cx) + '" cy="' + n1(cy) + '" r="' + n1(r * 0.5) + '" fill="none" stroke="' + GOLD + '" stroke-width="0.8" opacity="0.6"/>'
  );
}

function ssBridge(x1, y1, x2, y2) {
  const m = [(x1 + x2) / 2, (y1 + y2) / 2];
  return (
    '<g stroke="' + GOLD + '" stroke-width="1.6" stroke-linecap="round">' +
    '<line x1="' + n1(x1) + '" y1="' + n1(y1) + '" x2="' + n1(x2) + '" y2="' + n1(y2) + '"/></g>' +
    '<circle cx="' + n1(m[0]) + '" cy="' + n1(m[1]) + '" r="1.6" fill="' + GOLD + '"/>'
  );
}

// ── Surface halo: soft convex hull behind the whole molecule ────────

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  p.forEach((q) => {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  });
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}

function haloSvg(points) {
  const h = hull(points);
  if (h.length < 3) return "";
  const s = h.map((p) => n1(p[0]) + "," + n1(p[1])).join(" ");
  return (
    '<g opacity="0.055"><polygon points="' + s + '" fill="currentColor" stroke="currentColor" stroke-width="14" stroke-linejoin="round"/></g>'
  );
}

// ── Barrel: n strands around a cylinder seen from the side ──────────

function barrelParts(cx, cy, R, n, len, w, phi0) {
  const capRy = R * 0.28;
  const strands = [];
  for (let i = 0; i < n; i++) {
    const phi = (Math.PI * 2 * i) / n + (phi0 === undefined ? Math.PI / n : phi0);
    const depth = Math.cos(phi);
    const x = cx + R * Math.sin(phi);
    const up = i % 2 === 0;
    const e = S(x, cy + depth * capRy, len, up ? -90 : 90, { w: w * (0.5 + 0.5 * Math.abs(depth)) });
    e.depth = depth;
    strands.push(e);
  }
  const ell = (y) =>
    '<ellipse cx="' + n1(cx) + '" cy="' + n1(y) + '" rx="' + n1(R) + '" ry="' + n1(capRy) + '" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.25"/>';
  let back = "";
  let front = "";
  const pts = [];
  strands.forEach((e, i) => {
    pts.push([e.x1, e.y1], [e.x2, e.y2]);
    const isFront = e.depth > 0;
    const piece = strandSvg(e);
    if (isFront) front += piece;
    else back += '<g opacity="0.3">' + piece + "</g>";
    const nx = strands[i + 1];
    if (nx) {
      const both = isFront && nx.depth > 0;
      const l = linkSvg(e, nx);
      if (both) front += l;
      else back += '<g opacity="0.3">' + l + "</g>";
    }
  });
  return {
    underlay: ell(cy - len / 2) + ell(cy + len / 2) + back,
    overlay: front,
    pts: pts.concat([[cx - R, cy - len / 2], [cx + R, cy - len / 2], [cx - R, cy + len / 2], [cx + R, cy + len / 2]]),
  };
}

// ── Beta sandwich: two sheets stacked and slightly rotated ──────────

function sheetOf(xs, cy, len, w, dir) {
  const els = xs.map((x, i) => S(x, cy, len, (i % 2 === 0) === dir ? -90 : 90, { w: w }));
  return chain(els);
}

function sandwich(o) {
  o = o || {};
  const w = o.w || 5;
  const back = grp(sheetOf(o.back || [30, 42, 54], 42, o.len || 38, w, true), { rot: -14, op: 0.5 });
  const front = grp(sheetOf(o.front || [44, 56, 68, 80], 56, o.len || 38, w, false), { rot: 12 });
  return { svg: back.svg + front.svg, pts: back.pts.concat(front.pts) };
}

// ── Item definitions ────────────────────────────────────────────────

const ITEMS = [
  {
    code: "alpha-helix", fullName: "Alpha Helix", pdb: null, year: 1951,
    note: "Pauling and Corey predicted the 3.6₁₃ helix in 1951. The most common secondary structure in nature.",
    draw() {
      const h = H(50, 50, 70, -24, { r: 8, pitch: 10, bw: 3 });
      const tail1 = coilPath([[h.x1, h.y1], [h.x1 - 5, h.y1 + 4], [h.x1 - 10, h.y1 + 3]]);
      const tail2 = coilPath([[h.x2, h.y2], [h.x2 + 4, h.y2 - 5], [h.x2 + 9, h.y2 - 4]]);
      return { svg: tail1 + tail2 + helixSvg(h), pts: [[h.x1 - 10, h.y1 + 3], [h.x2 + 9, h.y2 - 4], [h.x1, h.y1 - 8], [h.x2, h.y2 + 8], [h.x1, h.y1 + 8], [h.x2, h.y2 - 8]] };
    },
  },
  {
    code: "beta-sheet", fullName: "Beta Sheet", pdb: null, year: 1951,
    note: "Parallel or antiparallel hydrogen-bonded strands forming a pleated sheet. The second pillar of protein structure.",
    draw() {
      const els = [];
      for (let i = 0; i < 4; i++) {
        els.push(S(46 + (i % 2 ? 3 : -3), 22 + i * 18.5, 54, (i % 2 ? 180 : 0) - 4 + i * 2.5, { w: 6.4 }));
      }
      return chain(els);
    },
  },
  {
    code: "helix-turn-helix", fullName: "Helix-Turn-Helix", pdb: null, year: 1982,
    note: "Classic DNA-binding motif. Two helices connected by a short turn, one reading the major groove.",
    draw() {
      const c = chain([H2(10, 18, 36, 38, {}), H2(46, 36, 78, 60, {})]);
      const dna = dnaSvg(6, 82, 94, 82, { amp: 5 });
      return { svg: dna.svg + c.svg, pts: c.pts };
    },
  },
  {
    code: "beta-barrel", fullName: "Beta Barrel", pdb: null, year: 1979,
    note: "A closed cylinder of beta strands. Found in porins, GFP, and lipocalins.",
    draw() {
      const b = barrelParts(50, 50, 24, 8, 54, 7.5);
      return { svg: b.underlay + b.overlay, pts: b.pts };
    },
  },
  {
    code: "coiled-coil", fullName: "Coiled-coil", pdb: null, year: 1953,
    note: "Two or more helices wound around each other. Leucine zippers, myosin, keratin all use this rope-like motif.",
    draw() {
      return coilSvg(8, 68, 92, 34, 2, { r: 6.5, pitch: 28, beads: true });
    },
  },
  {
    code: "zinc-finger", fullName: "Zinc Finger", pdb: "1ZNF", year: 1985,
    note: "Compact ββα fold stabilised by a zinc ion. The most abundant DNA-binding domain in eukaryotic genomes.",
    draw() {
      const c = chain([
        S2(20, 18, 20, 48, { w: 6 }),
        S2(34, 48, 34, 18, { w: 6 }),
        H2(50, 18, 72, 62, {}),
      ]);
      const ligands = [[20, 46], [34, 44], [68, 56], [72, 62]];
      const ion = [47, 52];
      const extra = bonds(ion[0], ion[1], ligands) + sphere(ion[0], ion[1], 4.4);
      return { svg: c.svg + extra, pts: c.pts.concat([[ion[0], ion[1]]]) };
    },
  },
  {
    code: "globin-fold", fullName: "Globin Fold", pdb: "1MBO", year: 1958,
    note: "Kendrew solved myoglobin in 1958, the first protein structure ever. Eight helices cradling a haem group.",
    draw() {
      const c = chain([
        H2(14, 66, 24, 44, {}),      // A
        H2(26, 38, 44, 24, {}),      // B
        H2(52, 20, 70, 20, {}),        // C
        H2(76, 26, 84, 40, {}),        // D
        H2(80, 50, 62, 58, {}),      // E
        H2(50, 64, 40, 78, {}),        // F
        H2(32, 82, 12, 74, {}),      // G
        H2(22, 66, 56, 46, { nl: true }), // H
      ]);
      c.svg += haem(52, 42, 7, -20);
      c.pts.push([52, 42]);
      return c;
    },
  },
  {
    code: "immunoglobulin", fullName: "Immunoglobulin Fold", pdb: "1IGT", year: 1973,
    note: "Two stacked beta sheets forming a sandwich. Building block of antibodies and countless cell-surface receptors.",
    draw() {
      const s = sandwich({ back: [28, 41, 54], front: [42, 55, 68, 81], len: 38, w: 5.6 });
      return { svg: s.svg + ssBridge(48, 40, 56, 48), pts: s.pts };
    },
  },
  {
    code: "tim-barrel", fullName: "TIM Barrel (βα)₈", pdb: "1TIM", year: 1975,
    note: "Eight alternating beta-alpha units forming a barrel. The most common enzyme fold, found in ~10% of all enzymes.",
    draw() {
      const els = [];
      for (let i = 0; i < 8; i++) {
        const phi = -90 + i * 45;
        const a = pol(50, 50, 7, phi);
        const b = pol(50, 50, 24, phi);
        els.push(S2(a[0], a[1], b[0], b[1], { w: 4.6 }));
        const hs = pol(50, 50, 37, phi + 4);
        const he = pol(50, 50, 37, phi + 41);
        els.push(H2(hs[0], hs[1], he[0], he[1], { r: 4, pitch: 9, bw: 2.5 }));
      }
      const c = chain(els);
      return c;
    },
  },
  {
    code: "rossmann", fullName: "Rossmann Fold", pdb: "6LDH", year: 1974,
    note: "βαβαβ sandwich that binds NAD⁺ and FAD. The workhorse of dehydrogenases and reductases.",
    draw() {
      const c = chain([
        S2(38, 74, 38, 28, { w: 6 }),
        H2(18, 34, 18, 72, {}),
        S2(50, 74, 50, 24, { w: 6 }),
        H2(82, 30, 82, 72, {}),
        S2(62, 74, 62, 28, { w: 6 }),
      ]);
      return { svg: c.svg + ring6(50, 14, 4.2, 0), pts: c.pts.concat([[50, 10]]) };
    },
  },
  {
    code: "ef-hand", fullName: "EF-Hand", pdb: "1CLL", year: 1973,
    note: "Helix-loop-helix calcium-binding motif. Named after helices E and F in parvalbumin. Key to calmodulin signalling.",
    draw() {
      const c = chain([
        H2(14, 76, 22, 36, {}),
        H2(40, 36, 48, 76, {}),
        H2(54, 76, 62, 36, {}),
        H2(80, 36, 88, 76, {}),
      ]);
      const ca = [[31, 28], [71, 28]];
      let extra = "";
      ca.forEach((p) => {
        extra += bonds(p[0], p[1], [[p[0] - 8, p[1] + 5], [p[0] + 8, p[1] + 5]]) + sphere(p[0], p[1], 3.4);
      });
      return { svg: c.svg + extra, pts: c.pts.concat(ca) };
    },
  },
  {
    code: "sh3-domain", fullName: "SH3 Domain", pdb: "1SHG", year: 1992,
    note: "Small all-beta domain recognising proline-rich sequences. Ubiquitous in signal transduction.",
    draw() {
      const b = barrelParts(44, 50, 20, 5, 42, 7.5, 0);
      const pep = H2(60, 70, 90, 30, { r: 2.4, pitch: 5, bw: 1.4, col: GOLD });
      return { svg: b.underlay + b.overlay + helixSvg(pep), pts: b.pts.concat([[pep.x1, pep.y1], [pep.x2, pep.y2]]) };
    },
  },
  {
    code: "green-fp", fullName: "Green Fluorescent Protein", pdb: "1EMA", year: 1996,
    note: "Shimomura's jellyfish barrel. The chromophore autocatalytically forms inside an 11-strand beta barrel. Revolutionised cell biology.",
    draw() {
      const b = barrelParts(50, 50, 27, 11, 56, 7);
      const core = helixSvg(H2(50, 28, 50, 72, { r: 3.4, pitch: 9, bw: 2 }));
      const chromo =
        '<circle cx="50" cy="50" r="9" fill="' + GOLD + '" opacity="0.14"/>' +
        ring6(47, 50, 3.4, 0) +
        '<polygon points="52.5,47 57.5,48.5 57,53.5 52.5,54" fill="' + GOLD + '" fill-opacity="0.35" stroke="' + GOLD + '" stroke-width="1.1" stroke-linejoin="round"/>';
      return { svg: b.underlay + core + chromo + b.overlay, pts: b.pts };
    },
  },
  {
    code: "collagen", fullName: "Collagen Triple Helix", pdb: "1CAG", year: 1955,
    note: "Three left-handed polyproline-II helices wound into a right-handed superhelix. The most abundant protein in mammals.",
    draw() {
      return coilSvg(8, 74, 92, 28, 3, { r: 5.4, pitch: 22 });
    },
  },
  {
    code: "lysozyme", fullName: "Lysozyme", pdb: "2LYZ", year: 1965,
    note: "Phillips solved it in 1965, the first enzyme structure. Two domains with the active site in the cleft between them.",
    draw() {
      const alpha = chain([
        H2(14, 22, 30, 40, {}),
        H2(18, 52, 34, 66, {}),
        H2(30, 80, 14, 74, {}),
      ]);
      const beta = chain([
        S2(62, 22, 66, 46, { w: 5.4 }),
        S2(74, 48, 70, 24, { w: 5.4 }),
        S2(84, 26, 86, 50, { w: 5.4 }),
        H2(80, 78, 62, 66, {}),
      ]);
      let sub = "";
      const rings = [[48, 26], [49, 46], [50, 66]];
      rings.forEach((r, i) => {
        sub += ring6(r[0], r[1], 5, 30);
        if (i) sub += '<line x1="' + r[0] + '" y1="' + (r[1] - 10) + '" x2="' + rings[i - 1][0] + '" y2="' + (rings[i - 1][1] + 10) + '" stroke="' + GOLD + '" stroke-width="1.2"/>';
      });
      const lnk = coilPath([[30, 40], [40, 48], [56, 56], [62, 66]], {});
      return { svg: lnk + alpha.svg + beta.svg + sub, pts: alpha.pts.concat(beta.pts, [[44, 24], [54, 70]]) };
    },
  },
  {
    code: "kinase", fullName: "Protein Kinase Fold", pdb: "2CPK", year: 1991,
    note: "Bilobal architecture: a small N-lobe of sheets and one helix, a large C-lobe of helices. Phosphorylation's universal scaffold.",
    draw() {
      const n = chain([
        S2(16, 16, 42, 14, { w: 4.8, nl: true }),
        S2(42, 24, 16, 26, { w: 4.8, nl: true }),
        S2(16, 36, 42, 36, { w: 4.8, nl: true }),
        H2(52, 16, 80, 20, {}),
      ]);
      const c = chain([
        H2(18, 82, 40, 62, {}),
        H2(46, 64, 62, 82, {}),
        H2(68, 76, 84, 56, {}),
        H2(78, 44, 58, 50, {}),
      ]);
      const hinge = coilPath([[42, 36], [48, 44], [44, 54], [40, 62]]);
      const atp = ring6(30, 48, 4.4, 0) + '<line x1="35" y1="48" x2="44" y2="46" stroke="' + GOLD + '" stroke-width="1.3"/>' +
        sphere(46, 46, 1.9) + sphere(50.5, 44.8, 1.9) + sphere(55, 43.6, 1.9);
      return { svg: hinge + n.svg + c.svg + atp, pts: n.pts.concat(c.pts) };
    },
  },
  {
    code: "wd40", fullName: "WD40 Beta Propeller", pdb: "1ERJ", year: 1999,
    note: "Seven-bladed beta propeller. A protein-protein interaction platform in chromatin, signalling, and vesicle transport.",
    draw() {
      let parts = "";
      const pts = [];
      const radii = [16, 27, 38];
      for (let k = 0; k < 7; k++) {
        const phi = -90 + k * (360 / 7);
        const els = radii.map((r, i) => {
          const cx = 50 + r * Math.cos(rad(phi));
          const cy = 50 + r * Math.sin(rad(phi));
          const len = 2 * r * Math.sin(rad(360 / 7 / 2)) * 0.62;
          const ang = phi + 90 + (i % 2 ? 180 : 0);
          return S(cx, cy, len, ang, { w: 5 });
        });
        const res = chain(els);
        parts += res.svg;
        res.pts.forEach((p) => pts.push(p));
      }
      return { svg: '<circle cx="50" cy="50" r="7" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.3"/>' + parts, pts: pts };
    },
  },
  {
    code: "leucine-zipper", fullName: "Leucine Zipper", pdb: "2ZTA", year: 1988,
    note: "Coiled-coil dimerisation motif. Leucines at every seventh position interlock like a zip. Key to bZIP transcription factors.",
    draw() {
      const dna = dnaSvg(6, 86, 94, 86, { amp: 4.5 });
      const zip = coilSvg(50, 8, 50, 50, 2, { r: 5, pitch: 20, beads: true });
      const arms = chain([H2(46, 52, 24, 74, {})]);
      const arms2 = chain([H2(54, 52, 76, 74, {})]);
      return {
        svg: dna.svg + arms.svg + arms2.svg + zip.svg,
        pts: zip.pts.concat(arms.pts, arms2.pts),
      };
    },
  },
  {
    code: "p53-dbd", fullName: "p53 DNA-Binding Domain", pdb: "1TSR", year: 1994,
    note: "The guardian of the genome. Immunoglobulin-like beta sandwich with zinc-stabilised loops that read DNA. Most mutated protein in cancer.",
    draw() {
      const s = grp(sandwich({ back: [30, 42, 54], front: [44, 56, 68, 80], len: 32, w: 5 }), { rot: 0 });
      const lsh = chain([H2(22, 74, 46, 70, {}), S2(60, 70, 80, 72, { w: 4.6 })]);
      const dna = dnaSvg(6, 90, 94, 90, { amp: 4 });
      const zn = [50, 60];
      const extra = bonds(zn[0], zn[1], [[46, 70], [60, 70], [42, 48], [58, 48]]) + sphere(zn[0], zn[1], 3.8);
      return { svg: dna.svg + s.svg + lsh.svg + extra, pts: s.pts.concat(lsh.pts) };
    },
  },
  {
    code: "cas9", fullName: "CRISPR-Cas9", pdb: "4OO8", year: 2014,
    note: "Doudna and Charpentier's RNA-guided nuclease. Two lobes, REC and NUC, clamp around guide RNA and target DNA. Genome editing's workhorse.",
    draw() {
      const lobe = (cx, cy, r) =>
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2.4" opacity="0.5"/>';
      const rec = chain([
        H2(20, 22, 38, 20, {}),
        H2(40, 30, 28, 44, {}),
        H2(16, 40, 18, 58, {}),
      ]);
      const nuc = chain([
        S2(60, 66, 82, 62, { w: 4.8 }),
        S2(82, 74, 60, 78, { w: 4.8 }),
        H2(84, 50, 70, 36, {}),
      ]);
      const dna = dnaSvg(12, 82, 88, 18, { amp: 4.6, pitch: 16 });
      const cut =
        '<g stroke="' + GOLD + '" stroke-width="1.8" stroke-linecap="round">' +
        '<line x1="45" y1="44" x2="53" y2="38"/><line x1="47" y1="58" x2="55" y2="52"/></g>';
      return {
        svg: lobe(32, 38, 26) + lobe(70, 62, 26) + dna.svg + rec.svg + nuc.svg + cut,
        pts: rec.pts.concat(nuc.pts),
      };
    },
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

// ── Repeating-tile mask for the splash / board background ───────────
// A tiny ribbon helix, a beta arrow and a few residue dots.

function proteinMaskUrl() {
  const size = 56;
  let wave = "M 3,14";
  for (let i = 1; i <= 24; i++) {
    const x = 3 + i * 1.5;
    wave += " L " + x.toFixed(1) + "," + (14 + 5 * Math.sin((i / 24) * Math.PI * 2 * 2)).toFixed(1);
  }
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "' viewBox='0 0 " + size + " " + size + "'>" +
    "<path d='" + wave + "' fill='none' stroke='#000' stroke-width='1.6' stroke-linecap='round' opacity='0.8'/>" +
    "<path d='" + wave + "' fill='none' stroke='#000' stroke-width='0.6' stroke-linecap='round' opacity='0.5' transform='translate(0 1.5)'/>" +
    "<polygon points='10,40 30,40 30,37 38,42.5 30,48 30,45 10,45' fill='none' stroke='#000' stroke-width='0.9' stroke-linejoin='round' opacity='0.7'/>" +
    "<path d='M 39,14 C 46,14 48,24 44,30 C 42,34 46,38 50,36' fill='none' stroke='#000' stroke-width='0.9' stroke-linecap='round' opacity='0.55'/>" +
    "<circle cx='50' cy='36' r='1.4' fill='#000' opacity='0.7'/>" +
    "<circle cx='6' cy='28' r='1' fill='#000' opacity='0.5'/>" +
    "</svg>";
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

const MASK = proteinMaskUrl();

function build(it) {
  const d = it.draw();
  return {
    code: it.code,
    name: it.code,
    fullName: it.fullName,
    note: it.note,
    year: it.year || null,
    meta: it.pdb ? "PDB " + it.pdb : "motif",
    pdb: it.pdb,
    svgShape: haloSvg(d.pts) + d.svg,
    viewBox: "0 0 " + SIZE + " " + SIZE,
    mask: MASK,
    maskSize: "56px 56px",
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
