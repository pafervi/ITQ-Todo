import moment from "moment";
import zeoliteHelper from "./zeoliteHelper";
import organicHelper from "./organicHelper";
import oxideHelper from "./oxideHelper";
import photochemHelper from "./photochemHelper";
import proteinHelper from "./proteinHelper";

// Themes system. The whole app used to assume zeolites, now the user can
// pick between four themes from Settings:
//  - zeolites: Pau's own domain, pore-ring silhouettes
//  - organic: aromatic rings and heterocycles
//  - oxides: metal oxide unit cells
//  - photochem: photochemistry concepts
//  - proteins: structural motifs, folds, landmark proteins
//
// Every helper exposes items with the SAME downstream shape (fullName,
// note, year, meta, svgShape, viewBox) so the splash, the project cover,
// and the info modal render through a single code path.
//
// Zeolites are the historical implementation; this router normalises its
// slightly different interface into the common one so the existing CSS
// mask paths used by the splash background keep working.

const THEMES = [
  {
    id: "zeolites",
    labelKey: "themes.zeolitesName",
    todayLabelKey: "themes.zeolitesToday",
    itemLabelKey: "themes.zeolitesItemLabel",
    // Suggested accent to go with this theme. The user can apply it from
    // Settings on theme switch (not auto-applied so a user who tuned the
    // accent manually never gets surprised).
    suggestedAccent: "#5e6ef2",
    helper: zeoliteHelper,
  },
  {
    id: "organic",
    labelKey: "themes.organicName",
    todayLabelKey: "themes.organicToday",
    itemLabelKey: "themes.organicItemLabel",
    suggestedAccent: "#4e7a3f", // forest green, reads as organic chemistry
    helper: organicHelper,
  },
  {
    id: "oxides",
    labelKey: "themes.oxidesName",
    todayLabelKey: "themes.oxidesToday",
    itemLabelKey: "themes.oxidesItemLabel",
    suggestedAccent: "#b8743a", // ochre, reads as mineral / earth
    helper: oxideHelper,
  },
  {
    id: "photochem",
    labelKey: "themes.photochemName",
    todayLabelKey: "themes.photochemToday",
    itemLabelKey: "themes.photochemItemLabel",
    suggestedAccent: "#9b3cc9", // magenta / violet, reads as photon / UV
    helper: photochemHelper,
  },
  {
    id: "proteins",
    labelKey: "themes.proteinsName",
    todayLabelKey: "themes.proteinsToday",
    itemLabelKey: "themes.proteinsItemLabel",
    suggestedAccent: "#2d8a6e", // teal, reads as biochemistry / protein
    helper: proteinHelper,
  },
];

const BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

// Compute an offset-polygon's points at a given phase shift (in radians).
// Used for the "double ring desfasado" effect, where the back ring shares
// the same vertex count but is rotated by half-step so its vertices sit
// between the main ring's vertices. The result is a star-like double
// outline when both are overlaid.
function shiftedPolygonPoints(sides, ry, phase) {
  let rx = 44;
  let radiusY = ry ? (ry / 50) * 44 : 44;
  let cx = 50;
  let cy = 50;
  let pts = [];
  for (let i = 0; i < sides; i++) {
    let a = (Math.PI * 2 * i) / sides - Math.PI / 2 + (phase || 0);
    let x = (cx + rx * Math.cos(a)).toFixed(2);
    let y = (cy + radiusY * Math.sin(a)).toFixed(2);
    pts.push(x + "," + y);
  }
  return pts.join(" ");
}

// Normalise a zeolite framework object into the common item shape so the
// splash, project cover and info modal can read svgShape/viewBox without
// knowing which theme is active. Zeolite masks (CSS data URL) are kept so
// the splash background pattern still renders the same way.
//
// The svgShape here renders the framework as a dual-stroke polygon plus a
// slightly-rotated second ring behind it (double ring "desfasado"), so
// the pore reads as a layered pore rather than a flat polygon. All
// strokes use currentColor so the host container's accent tint carries
// through unchanged.
function normalizeZeoliteItem(fw) {
  if (!fw) return null;
  // Back ring: same geometry, rotated by half-step so vertices sit
  // between the main ring's vertices. Faint stroke for depth.
  let shiftedPts = shiftedPolygonPoints(fw.sides, fw.ry, Math.PI / fw.sides);
  // Dual-stroke on main ring: a wider halo stroke underneath + the usual
  // crisp stroke on top. Reads as a line with its own shadow.
  let polyAttr =
    // Back layer: phase-shifted outline (double ring).
    '<polygon points="' + shiftedPts + '" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity="0.35"/>' +
    // Shadow halo underneath main stroke.
    '<polygon points="' + fw.polygonPoints + '" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linejoin="round" opacity="0.18"/>' +
    // Main stroke.
    '<polygon points="' + fw.polygonPoints + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>' +
    // Soft fill inside.
    '<polygon points="' + fw.polygonPoints + '" fill="currentColor" fill-opacity="0.1"/>';
  return {
    code: fw.code,
    name: fw.name,
    fullName: fw.fullName,
    note: fw.note,
    year: fw.year || null,
    meta: fw.ring || "",
    itq: !!fw.itq,
    svgShape: polyAttr,
    viewBox: "0 0 100 100",
    mask: fw.mask,
    maskSize: fw.size,
  };
}

function getTheme(config) {
  let id = config && config.activeTheme ? config.activeTheme : "zeolites";
  return BY_ID[id] || BY_ID.zeolites;
}

export default {
  themes: THEMES,

  // The active theme object (metadata, not the items). Use .id for comparisons.
  getActive(config) {
    return getTheme(config);
  },

  // Deterministic daily item for the active theme, normalised to the shared
  // shape with svgShape + viewBox. Zeolites keep their CSS mask so the
  // splash background pattern renders correctly.
  getTodayItem(config) {
    let theme = getTheme(config);
    if (theme.id === "zeolites") {
      return normalizeZeoliteItem(theme.helper.getTodayLattice());
    }
    return theme.helper.getTodayItem();
  },

  getItemFor(seed, config) {
    let theme = getTheme(config);
    if (theme.id === "zeolites") {
      return normalizeZeoliteItem(theme.helper.frameworkFor(seed));
    }
    return theme.helper.getItemFor(seed);
  },

  getItemByCode(code, config) {
    let theme = getTheme(config);
    if (theme.id === "zeolites") {
      return normalizeZeoliteItem(theme.helper.frameworkByCode(code));
    }
    return theme.helper.getItemByCode(code);
  },

  // All items of the active theme, used by the per-project picker if we
  // ever expose it (not required by the current UI).
  getAllItems(config) {
    let theme = getTheme(config);
    if (theme.id === "zeolites") {
      return (theme.helper.frameworks || []).map((f) => normalizeZeoliteItem(theme.helper.frameworkByCode(f.code)));
    }
    return (theme.helper.items || []).map((it) => theme.helper.getItemByCode(it.code));
  },

  // Today's item from a different theme than the active one, for the
  // splash "also today" cross-theme teaser. Rotates through the other
  // themes by day-of-year so over four days the user sees every theme
  // at least once in the second slot. Falls back to null when the theme
  // id matches the active one (should not happen with the day-rotation).
  getCrossThemeItem(config) {
    let active = getTheme(config);
    let others = THEMES.filter((t) => t.id !== active.id);
    if (others.length === 0) return null;
    // Deterministic rotation: pick by day-of-year % others.length. moment
    // is already used by every helper, so time-of-day stability is given.
    let idx = moment().dayOfYear() % others.length;
    let picked = others[idx];
    let item;
    if (picked.id === "zeolites") {
      item = normalizeZeoliteItem(picked.helper.getTodayLattice());
    } else {
      item = picked.helper.getTodayItem();
    }
    if (!item) return null;
    item.themeId = picked.id;
    item.themeLabelKey = picked.labelKey;
    item.themeTodayLabelKey = picked.todayLabelKey;
    return item;
  },

  // A short preview list (3 items by code) used by the Settings dropdown
  // so the user can see what each theme looks like before switching.
  // Returns [{ code, fullName, svgShape, viewBox }, ...] per theme id.
  getPreviewItems(themeId) {
    let theme = BY_ID[themeId];
    if (!theme) return [];
    if (theme.id === "zeolites") {
      // Pick three characteristic frameworks: MFI (Pau's workhorse), FAU,
      // CHA. They cover 10-, 12- and 8-ring respectively.
      let codes = ["MFI", "FAU", "CHA"];
      return codes.map((c) => {
        let fw = theme.helper.frameworkByCode(c);
        return fw ? normalizeZeoliteItem(fw) : null;
      }).filter(Boolean);
    }
    let codes = {
      organic: ["C6H6", "C5H5N", "C4H5N"],       // benzene, pyridine, pyrrole
      oxides: ["CeO2", "SrTiO3", "ZnO"],          // fluorite, perovskite, hexagonal
      photochem: ["fluor", "phos", "fret"],       // fluorescence, phosphorescence, FRET
      proteins: ["globin-fold", "tim-barrel", "green-fp"], // globin, TIM barrel, GFP
    }[themeId] || [];
    // Try the given codes; silently drop any that don't exist in the data.
    let out = [];
    codes.forEach((c) => {
      let it = theme.helper.getItemByCode(c);
      if (it) out.push(it);
    });
    // If none matched (e.g. photochem codes don't align), fall back to
    // the first 3 items of the theme.
    if (out.length === 0 && theme.helper.items) {
      out = theme.helper.items.slice(0, 3).map((it) => theme.helper.getItemByCode(it.code)).filter(Boolean);
    }
    return out;
  },

  // Suggested accent per theme (so Settings can offer "use the theme's
  // accent" on switch). Returns null when the theme has no suggestion.
  getSuggestedAccent(themeId) {
    let t = BY_ID[themeId];
    return t && t.suggestedAccent ? t.suggestedAccent : null;
  },
};
