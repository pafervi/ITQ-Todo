import zeoliteHelper from "./zeoliteHelper";
import organicHelper from "./organicHelper";
import oxideHelper from "./oxideHelper";
import photochemHelper from "./photochemHelper";

// Themes system. The whole app used to assume zeolites, now the user can
// pick between four themes from Settings:
//  - zeolites: Pau's own domain, pore-ring silhouettes
//  - organic: aromatic rings and heterocycles
//  - oxides: metal oxide unit cells
//  - photochem: photochemistry concepts
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
    helper: zeoliteHelper,
  },
  {
    id: "organic",
    labelKey: "themes.organicName",
    todayLabelKey: "themes.organicToday",
    itemLabelKey: "themes.organicItemLabel",
    helper: organicHelper,
  },
  {
    id: "oxides",
    labelKey: "themes.oxidesName",
    todayLabelKey: "themes.oxidesToday",
    itemLabelKey: "themes.oxidesItemLabel",
    helper: oxideHelper,
  },
  {
    id: "photochem",
    labelKey: "themes.photochemName",
    todayLabelKey: "themes.photochemToday",
    itemLabelKey: "themes.photochemItemLabel",
    helper: photochemHelper,
  },
];

const BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

// Normalise a zeolite framework object into the common item shape so the
// splash, project cover and info modal can read svgShape/viewBox without
// knowing which theme is active. Zeolite masks (CSS data URL) are kept so
// the splash background pattern still renders the same way.
function normalizeZeoliteItem(fw) {
  if (!fw) return null;
  let polyAttr =
    '<polygon points="' + fw.polygonPoints + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>' +
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
};
