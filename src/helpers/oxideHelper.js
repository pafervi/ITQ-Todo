import moment from "moment";

// Metal oxide theme. Each entry carries its formula, a cell family label and
// a stylised unit cell with explicit atom positions. CeO2 opens the list
// because it is Pau's own territory. The cells are deliberately dense:
// corner atoms, face centres, body centres and metal-to-oxygen bonds are all
// drawn so the silhouette reads as a real crystal cell rather than a cube
// with a label slapped on top.
//
// Rendering strategy: a cubic cell (fluorite, rutile, rocksalt, perovskite,
// spinel) draws an isometric cube with corner and face-centre atoms sized
// by role. A hexagonal cell (corundum, wurtzite, layered oxides) draws a
// hex outline with central atoms and axial oxygens. Bonds use currentColor
// stroke so the whole motif tints with the host accent or project colour.

const SIZE = 100;
const CENTER = 50;

// Cube geometry. s = half-side of the front face in the 100x100 viewBox.
// dx/dy are the isometric offset to the back face (how much the back face
// slides up-right). Returns every point we need to decorate a dense cell:
// 8 corners, 6 face centres, 1 body centre, plus the edge paths.
function cubeGeometry(s, dx, dy) {
  s = s || 24;
  dx = dx || 10;
  dy = dy || -8;
  let cx = CENTER;
  let cy = CENTER + 6; // small drop so the cube reads centred after the up-right offset
  let fTL = { x: cx - s, y: cy - s };
  let fTR = { x: cx + s, y: cy - s };
  let fBR = { x: cx + s, y: cy + s };
  let fBL = { x: cx - s, y: cy + s };
  let bTL = { x: fTL.x + dx, y: fTL.y + dy };
  let bTR = { x: fTR.x + dx, y: fTR.y + dy };
  let bBR = { x: fBR.x + dx, y: fBR.y + dy };
  let bBL = { x: fBL.x + dx, y: fBL.y + dy };
  let corners = [fTL, fTR, fBR, fBL, bTL, bTR, bBR, bBL];
  let faceCentre = (verts) => ({
    x: verts.reduce((a, v) => a + v.x, 0) / verts.length,
    y: verts.reduce((a, v) => a + v.y, 0) / verts.length,
  });
  let faces = {
    front: faceCentre([fTL, fTR, fBR, fBL]),
    back: faceCentre([bTL, bTR, bBR, bBL]),
    top: faceCentre([fTL, fTR, bTR, bTL]),
    bottom: faceCentre([fBL, fBR, bBR, bBL]),
    left: faceCentre([fTL, fBL, bBL, bTL]),
    right: faceCentre([fTR, fBR, bBR, bTR]),
  };
  let body = faceCentre([fTL, fTR, fBR, fBL, bTL, bTR, bBR, bBL]);
  let edges = [
    [fTL, fTR], [fTR, fBR], [fBR, fBL], [fBL, fTL],         // front
    [bTL, bTR], [bTR, bBR], [bBR, bBL], [bBL, bTL],         // back
    [fTL, bTL], [fTR, bTR], [fBR, bBR], [fBL, bBL],         // depth
  ];
  return { corners, faces, body, edges };
}

function line(a, b, opacity, width) {
  return (
    '<line x1="' + a.x.toFixed(2) + '" y1="' + a.y.toFixed(2) +
    '" x2="' + b.x.toFixed(2) + '" y2="' + b.y.toFixed(2) +
    '" stroke="currentColor" stroke-width="' + (width || 1.2) + '" opacity="' + (opacity || 0.55) + '" stroke-linecap="round"/>'
  );
}

function atom(p, r, filled, opacity) {
  if (filled) {
    return '<circle cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="' + r + '" fill="currentColor" opacity="' + (opacity || 1) + '"/>';
  }
  return '<circle cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="' + r + '" fill="#fff" stroke="currentColor" stroke-width="1.3" opacity="' + (opacity || 1) + '"/>';
}

function label(p, txt, size) {
  return '<text x="' + p.x.toFixed(2) + '" y="' + (p.y + 2.5).toFixed(2) + '" text-anchor="middle" font-size="' + (size || 7.5) + '" font-family="sans-serif" font-weight="700" fill="#fff">' + txt + "</text>";
}

// Draw a coordination polyhedron: a translucent filled polygon over the
// convex outline of the given vertices in 2D projection, plus the inner
// edges connecting non-adjacent vertices so the volume reads. Used for
// BO6 octahedra (perovskite), MO6 octahedra (rutile) and MO4 tetrahedra
// (fluorite / spinel) so the hero oxide reads as crystal chemistry
// rather than a dot cluster.
function polyhedron(verts, opts) {
  opts = opts || {};
  let fillOpacity = opts.fillOpacity != null ? opts.fillOpacity : 0.14;
  let strokeWidth = opts.strokeWidth || 1.1;
  let strokeOpacity = opts.strokeOpacity != null ? opts.strokeOpacity : 0.6;
  // 2D convex hull by angular sort around the centroid. Good enough for
  // the small vertex sets we draw here (4 to 8 points).
  let cx = verts.reduce((s, v) => s + v.x, 0) / verts.length;
  let cy = verts.reduce((s, v) => s + v.y, 0) / verts.length;
  let hull = verts
    .map((v) => ({ x: v.x, y: v.y, a: Math.atan2(v.y - cy, v.x - cx) }))
    .sort((a, b) => a.a - b.a);
  let pts = hull.map((p) => p.x.toFixed(2) + "," + p.y.toFixed(2)).join(" ");
  let parts = [
    '<polygon points="' + pts +
    '" fill="currentColor" fill-opacity="' + fillOpacity +
    '" stroke="currentColor" stroke-width="' + strokeWidth +
    '" stroke-opacity="' + strokeOpacity +
    '" stroke-linejoin="round"/>'
  ];
  // Inner cross-edges to hint the back face of the polyhedron. For every
  // non-adjacent pair in the hull, draw a faint line.
  if (opts.innerEdges !== false) {
    for (let i = 0; i < hull.length; i++) {
      for (let j = i + 2; j < hull.length; j++) {
        if (i === 0 && j === hull.length - 1) continue;
        parts.push(
          '<line x1="' + hull[i].x.toFixed(2) + '" y1="' + hull[i].y.toFixed(2) +
          '" x2="' + hull[j].x.toFixed(2) + '" y2="' + hull[j].y.toFixed(2) +
          '" stroke="currentColor" stroke-width="' + (strokeWidth * 0.6) +
          '" opacity="' + (strokeOpacity * 0.4) +
          '" stroke-linecap="round"/>'
        );
      }
    }
  }
  return parts;
}

// Isometric cube skeleton: all 12 edges drawn, back edges fainter so the
// front reads first. This is the common base for every cubic cell.
function cubeSkeleton(g) {
  let parts = [];
  // Back edges first (fainter so they sit visually behind)
  [4, 5, 6, 7].forEach((i) => parts.push(line(g.edges[i][0], g.edges[i][1], 0.35, 1)));
  // Depth edges
  [8, 9, 10, 11].forEach((i) => parts.push(line(g.edges[i][0], g.edges[i][1], 0.45, 1)));
  // Front edges on top
  [0, 1, 2, 3].forEach((i) => parts.push(line(g.edges[i][0], g.edges[i][1], 0.7, 1.3)));
  return parts;
}

// Hexagonal cell: a top-down view of a hex prism, with a stacked second
// layer hinted at by the inner smaller hex. Used by corundum, wurtzite and
// the layered oxides for consistency.
function hexSkeleton() {
  let parts = [];
  let r1 = 28;
  let r2 = 16;
  let hex = (r) => {
    let pts = [];
    for (let i = 0; i < 6; i++) {
      let a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      pts.push({ x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) });
    }
    return pts;
  };
  let outer = hex(r1);
  let inner = hex(r2);
  // Outer hex outline
  parts.push('<polygon points="' + outer.map((p) => p.x.toFixed(2) + "," + p.y.toFixed(2)).join(" ") + '" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.75"/>');
  // Inner hex (second layer) dashed
  parts.push('<polygon points="' + inner.map((p) => p.x.toFixed(2) + "," + p.y.toFixed(2)).join(" ") + '" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>');
  // Connecting edges (prism depth hint)
  for (let i = 0; i < 6; i++) {
    parts.push(line(outer[i], inner[i], 0.35, 0.9));
  }
  return { parts, outer, inner };
}

// Build the SVG for one oxide item. Each case fills the cube or hex with
// atoms following the family: fluorite packs 8 oxygens tetrahedrally
// around the central cation plus 4 FCC cations, rock-salt alternates
// metal/oxygen on every corner and face centre, rutile centres a chain of
// metal-oxygens along the vertical body axis, perovskite spots A cations
// on all 8 corners with a B cation at the body centre and O on the 6
// faces, spinel splits the body into tetra and octa sites with two metal
// labels, corundum stacks a hex with axial atoms.
function buildSvg(item) {
  let parts = [];
  switch (item.cell) {
    case "fluorite": {
      let g = cubeGeometry(26, 11, -9);
      parts.push(...cubeSkeleton(g));
      // Cations FCC: 8 corners + 6 face centres (medium large)
      g.corners.forEach((p) => parts.push(atom(p, 3.2, true, 0.85)));
      Object.values(g.faces).forEach((p) => parts.push(atom(p, 3.5, true, 0.9)));
      // 8 oxygens on tetrahedral interstitials (small). Approximate as a
      // 2x2x2 grid of small hollow atoms between body centre and corners.
      let tet = [
        { kx: -0.5, ky: -0.5, kz: -0.5 }, { kx: 0.5, ky: -0.5, kz: -0.5 },
        { kx: -0.5, ky: 0.5, kz: -0.5 }, { kx: 0.5, ky: 0.5, kz: -0.5 },
        { kx: -0.5, ky: -0.5, kz: 0.5 }, { kx: 0.5, ky: -0.5, kz: 0.5 },
        { kx: -0.5, ky: 0.5, kz: 0.5 }, { kx: 0.5, ky: 0.5, kz: 0.5 },
      ];
      let tetPts = tet.map((k) => ({
        x: g.body.x + k.kx * 11 + k.kz * 5.5,
        y: g.body.y + k.ky * 11 + k.kz * -4,
      }));
      // MeO8 cube: draw the convex outline of the 8 tetrahedral oxygens
      // so the fluorite coordination reads as a real cube around the
      // central cation rather than a cloud of dots.
      parts.push(...polyhedron(tetPts, { fillOpacity: 0.1, strokeOpacity: 0.42, innerEdges: false }));
      tetPts.forEach((p) => parts.push(atom(p, 2.1, false, 0.9)));
      // Metal label at the body centre on top of everything
      parts.push(atom(g.body, 7.5, true));
      parts.push(label(g.body, item.metal, 8.5));
      break;
    }
    case "rocksalt": {
      let g = cubeGeometry(25, 10, -8);
      parts.push(...cubeSkeleton(g));
      // Alternate corner atoms: 4 metal + 4 oxygen on cube corners,
      // alternating. FCC interpenetrant lattices.
      let altFront = [0, 2]; // fTL, fBR
      let altBack = [5, 7]; // bTR, bBL
      g.corners.forEach((p, i) => {
        let isMetal = (altFront.includes(i) || altBack.includes(i));
        parts.push(atom(p, isMetal ? 4 : 3, true, isMetal ? 0.95 : 0.55));
      });
      // Face centres with the complementary species
      Object.entries(g.faces).forEach(([k, p]) => {
        let isMetal = ["front", "back", "top"].includes(k);
        parts.push(atom(p, isMetal ? 3.8 : 3, true, isMetal ? 0.6 : 0.9));
      });
      // Bonds metal-oxygen along x axis
      parts.push(line(g.corners[0], g.corners[1], 0.3, 0.9));
      parts.push(line(g.corners[3], g.corners[2], 0.3, 0.9));
      // Body centre with metal label
      parts.push(atom(g.body, 7.5, true));
      parts.push(label(g.body, item.metal, 8.5));
      break;
    }
    case "rutile": {
      let g = cubeGeometry(22, 9, -7);
      parts.push(...cubeSkeleton(g));
      // Metal on 8 corners (small, structural hint)
      g.corners.forEach((p) => parts.push(atom(p, 3.2, true, 0.75)));
      // MO6 octahedron: 4 equatorial + 2 axial oxygens, drawn as a
      // translucent polyhedron so the Ti/Sn/Mn-O6 coordination reads at a
      // glance. The axial pair runs along the vertical body axis, the
      // equatorial pair around the body in the isometric plane.
      let oxTop = { x: g.body.x, y: g.body.y - 14 };
      let oxBot = { x: g.body.x, y: g.body.y + 14 };
      let oxLeft = { x: g.body.x - 11, y: g.body.y + 2 };
      let oxRight = { x: g.body.x + 11, y: g.body.y + 2 };
      // Additional two oxygens shifted by the isometric depth so the
      // octahedron does not degenerate into a square in 2D projection.
      let oxFront = { x: g.body.x - 5, y: g.body.y + 7 };
      let oxBack = { x: g.body.x + 5, y: g.body.y - 7 };
      let oVerts = [oxTop, oxBot, oxLeft, oxRight, oxFront, oxBack];
      parts.push(...polyhedron(oVerts, { fillOpacity: 0.12, strokeOpacity: 0.5 }));
      oVerts.forEach((o) => parts.push(atom(o, 2.6, false, 0.95)));
      // Metal body centre
      parts.push(atom(g.body, 7.5, true));
      parts.push(label(g.body, item.metal, 8.5));
      break;
    }
    case "perovskite": {
      let g = cubeGeometry(26, 11, -9);
      parts.push(...cubeSkeleton(g));
      // A cations on 8 corners (large), B cation at body centre (dark), O
      // on 6 face centres (small hollow).
      g.corners.forEach((p) => parts.push(atom(p, 3.8, true, 0.65)));
      // BO6 octahedron: the 6 face centres as vertices, drawn as a
      // translucent polyhedron underneath the oxygen dots so the
      // coordination reads as a real octahedron rather than six loose
      // atoms with lines to the centre.
      let oVerts = ["front", "back", "top", "bottom", "left", "right"].map((k) => g.faces[k]);
      parts.push(...polyhedron(oVerts, { fillOpacity: 0.12, strokeOpacity: 0.5 }));
      // Oxygen atoms on top of the octahedron outline
      Object.values(g.faces).forEach((p) => parts.push(atom(p, 2.6, false, 0.95)));
      // Body centre metal with label
      parts.push(atom(g.body, 7.5, true));
      parts.push(label(g.body, item.metal, 8.5));
      break;
    }
    case "spinel": {
      let g = cubeGeometry(26, 11, -9);
      parts.push(...cubeSkeleton(g));
      // 8 corners atoms (oxygen hcp framework hint)
      g.corners.forEach((p) => parts.push(atom(p, 2.6, false, 0.9)));
      // Tetrahedral A site (left of body) and octahedral B site (right)
      let aSite = { x: g.body.x - 9, y: g.body.y - 3 };
      let bSite = { x: g.body.x + 9, y: g.body.y + 3 };
      // Connecting bonds A-O and B-O via face centres as proxies
      parts.push(line(aSite, g.faces.top, 0.45, 0.9));
      parts.push(line(aSite, g.faces.left, 0.45, 0.9));
      parts.push(line(bSite, g.faces.bottom, 0.45, 0.9));
      parts.push(line(bSite, g.faces.right, 0.45, 0.9));
      // A site cation
      parts.push(atom(aSite, 6, true));
      parts.push(label(aSite, item.metal, 7));
      // B site cation (slightly lighter)
      parts.push(atom(bSite, 6, true, 0.75));
      parts.push(label(bSite, item.metal2 || item.metal, 7));
      break;
    }
    case "corundum":
    case "hexagonal": {
      let hex = hexSkeleton();
      parts.push(...hex.parts);
      // Six oxygens on the outer vertices, three cations on alternate
      // inner vertices (hcp-ish), plus a label at the centre.
      hex.outer.forEach((p) => parts.push(atom(p, 3, false, 0.9)));
      [0, 2, 4].forEach((i) => parts.push(atom(hex.inner[i], 3.4, true, 0.85)));
      // Bonds inner->outer
      [0, 2, 4].forEach((i) => {
        parts.push(line(hex.inner[i], hex.outer[i], 0.5, 1));
        parts.push(line(hex.inner[i], hex.outer[(i + 1) % 6], 0.5, 1));
      });
      // Central label
      parts.push(atom({ x: CENTER, y: CENTER }, 7.5, true));
      parts.push(label({ x: CENTER, y: CENTER }, item.metal, 8.5));
      break;
    }
    default: {
      let g = cubeGeometry();
      parts.push(...cubeSkeleton(g));
      parts.push(atom(g.body, 7.5, true));
      parts.push(label(g.body, item.metal, 8.5));
    }
  }
  return parts.join("");
}

// Repeating-tile mask for the splash background: a crystal-lattice grid of
// paired atoms that reads as "oxide lattice" at a glance. Returned as a
// CSS url() ready for background-image / mask-image, matching the pattern
// zeoliteHelper already uses.
function latticeMaskUrl() {
  let size = 36;
  let svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "' viewBox='0 0 " + size + " " + size + "'>" +
    "<circle cx='" + (size / 4) + "' cy='" + (size / 4) + "' r='3.2' fill='#000'/>" +
    "<circle cx='" + (3 * size / 4) + "' cy='" + (size / 4) + "' r='1.6' fill='#000'/>" +
    "<circle cx='" + (size / 4) + "' cy='" + (3 * size / 4) + "' r='1.6' fill='#000'/>" +
    "<circle cx='" + (3 * size / 4) + "' cy='" + (3 * size / 4) + "' r='3.2' fill='#000'/>" +
    "<line x1='" + (size / 4) + "' y1='" + (size / 4) + "' x2='" + (3 * size / 4) + "' y2='" + (size / 4) + "' stroke='#000' stroke-width='0.4'/>" +
    "<line x1='" + (size / 4) + "' y1='" + (3 * size / 4) + "' x2='" + (3 * size / 4) + "' y2='" + (3 * size / 4) + "' stroke='#000' stroke-width='0.4'/>" +
    "<line x1='" + (size / 4) + "' y1='" + (size / 4) + "' x2='" + (size / 4) + "' y2='" + (3 * size / 4) + "' stroke='#000' stroke-width='0.4'/>" +
    "<line x1='" + (3 * size / 4) + "' y1='" + (size / 4) + "' x2='" + (3 * size / 4) + "' y2='" + (3 * size / 4) + "' stroke='#000' stroke-width='0.4'/>" +
    "</svg>";
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

const ITEMS = [
  { code: "CeO2", fullName: "Ceria (CeO2)", formula: "CeO2", metal: "Ce", cell: "fluorite", year: null,
    note: "Fluorite structure. Oxygen storage star; Ce3+/Ce4+ redox drives three-way catalysts and SOFCs." },
  { code: "TiO2", fullName: "Titania (TiO2, rutile)", formula: "TiO2", metal: "Ti", cell: "rutile",
    note: "Rutile and anatase polymorphs. UV photocatalyst, sunscreen, white pigment of the century." },
  { code: "ZnO", fullName: "Zincite (ZnO)", formula: "ZnO", metal: "Zn", cell: "hexagonal",
    note: "Wurtzite structure. Piezoelectric, UV LEDs, selective sensors; natural n-type semiconductor." },
  { code: "Fe2O3", fullName: "Hematite (alpha-Fe2O3)", formula: "Fe2O3", metal: "Fe", cell: "corundum",
    note: "Corundum structure. Deep rust-red; photoanode for water splitting with narrow band gap." },
  { code: "Fe3O4", fullName: "Magnetite (Fe3O4)", formula: "Fe3O4", metal: "Fe", metal2: "Fe", cell: "spinel",
    note: "Inverse spinel. Ferrimagnetic; the ancient lodestone and modern core of magnetic nanoparticles." },
  { code: "MnO2", fullName: "Pyrolusite (MnO2)", formula: "MnO2", metal: "Mn", cell: "rutile",
    note: "Rutile-type. Backbone of alkaline batteries; low-overpotential OER catalyst." },
  { code: "V2O5", fullName: "Divanadium pentoxide (V2O5)", formula: "V2O5", metal: "V", cell: "hexagonal",
    note: "Layered oxide. Classical SO2 to SO3 catalyst in sulfuric acid plants; Li-ion cathode." },
  { code: "WO3", fullName: "Tungstic oxide (WO3)", formula: "WO3", metal: "W", cell: "perovskite",
    note: "Distorted perovskite. Electrochromic blues; NOx sensors; photocatalysis in visible light." },
  { code: "MoO3", fullName: "Molybdite (MoO3)", formula: "MoO3", metal: "Mo", cell: "hexagonal",
    note: "Layered orthorhombic. Partial oxidation catalyst; hole-injection layer in OLEDs." },
  { code: "Cu2O", fullName: "Cuprite (Cu2O)", formula: "Cu2O", metal: "Cu", cell: "fluorite",
    note: "Antifluorite cell. Red p-type semiconductor; one of the earliest photocatalysts described." },
  { code: "CuO", fullName: "Tenorite (CuO)", formula: "CuO", metal: "Cu", cell: "rocksalt",
    note: "Monoclinic distorted rock-salt. CO oxidation; antimicrobial; precursor to superconductors." },
  { code: "Al2O3", fullName: "Alpha-alumina (Al2O3)", formula: "Al2O3", metal: "Al", cell: "corundum",
    note: "Corundum. Sapphire and ruby host; the universal catalyst support." },
  { code: "SnO2", fullName: "Cassiterite (SnO2)", formula: "SnO2", metal: "Sn", cell: "rutile",
    note: "Rutile-type. Gas-sensing semiconductor; transparent conducting oxide when F- or Sb-doped." },
  { code: "NiO", fullName: "Bunsenite (NiO)", formula: "NiO", metal: "Ni", cell: "rocksalt",
    note: "Rock-salt antiferromagnet. Hole-transport layer in perovskite solar cells." },
  { code: "Co3O4", fullName: "Cobalt tetroxide (Co3O4)", formula: "Co3O4", metal: "Co", metal2: "Co", cell: "spinel",
    note: "Normal spinel. OER champion in alkaline electrolysers; black ceramic pigment." },
  { code: "SrTiO3", fullName: "Strontium titanate (SrTiO3)", formula: "SrTiO3", metal: "Ti", cell: "perovskite",
    note: "Cubic perovskite. Model photocatalyst; LaAlO3 interface famously 2D-electron-gas." },
  { code: "BaTiO3", fullName: "Barium titanate (BaTiO3)", formula: "BaTiO3", metal: "Ti", cell: "perovskite",
    note: "Tetragonal below 393 K. Ferroelectric since 1945; the capacitor dielectric of choice." },
  { code: "MgO", fullName: "Periclase (MgO)", formula: "MgO", metal: "Mg", cell: "rocksalt",
    note: "Rock-salt. Strong basic support; refractory lining and CO2 sorbent at high temperature." },
  { code: "Y2O3", fullName: "Yttria (Y2O3)", formula: "Y2O3", metal: "Y", cell: "fluorite",
    note: "Bixbyite (defect fluorite). Rare-earth stabiliser for ZrO2; red phosphor host Y2O3:Eu." },
  { code: "ZrO2", fullName: "Zirconia (ZrO2)", formula: "ZrO2", metal: "Zr", cell: "fluorite",
    note: "Monoclinic to cubic polymorphs. YSZ ionic conductor; dental ceramic; strong solid acid." },
  { code: "La2O3", fullName: "Lanthana (La2O3)", formula: "La2O3", metal: "La", cell: "hexagonal",
    note: "Hexagonal. Basic promoter in Ni methane dry-reforming catalysts; FCC additive." },
  { code: "Nb2O5", fullName: "Niobia (Nb2O5)", formula: "Nb2O5", metal: "Nb", cell: "hexagonal",
    note: "T, M and H polymorphs. Mild solid acid; TiO2 alternative in photocatalysis." },
  { code: "Ta2O5", fullName: "Tantalum pentoxide (Ta2O5)", formula: "Ta2O5", metal: "Ta", cell: "hexagonal",
    note: "Beta-polymorph common. High-k capacitor dielectric; wide-gap UV photocatalyst." },
  { code: "Bi2O3", fullName: "Bismite (Bi2O3)", formula: "Bi2O3", metal: "Bi", cell: "fluorite",
    note: "Delta-phase is a fluorite ionic conductor. Visible-light photocatalyst in BiVO4 and friends." },
];

function hashCode(seed) {
  let str = String(seed || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

const MASK = latticeMaskUrl();

function build(it) {
  return {
    code: it.code,
    name: it.code,
    fullName: it.fullName,
    note: it.note,
    year: it.year || null,
    meta: it.cell,
    formula: it.formula,
    metal: it.metal,
    svgShape: buildSvg(it),
    viewBox: "0 0 " + SIZE + " " + SIZE,
    mask: MASK,
    maskSize: "36px 36px",
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
