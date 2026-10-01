const FONTS = {
  inter: { google: "Inter:wght@400;500;600;700", css: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  manrope: { google: "Manrope:wght@400;500;600;700", css: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  spacegrotesk: { google: "Space+Grotesk:wght@400;500;600;700", css: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
};

const LINK_ID = "custom-font-link";

export default {
  options: FONTS,
  cssFor(key) {
    return (FONTS[key] && FONTS[key].css) || "";
  },
  applyLink(key) {
    let existing = document.getElementById(LINK_ID);
    let font = FONTS[key];
    if (!font) {
      if (existing) existing.remove();
      return;
    }
    if (!existing) {
      existing = document.createElement("link");
      existing.id = LINK_ID;
      existing.rel = "stylesheet";
      document.head.appendChild(existing);
    }
    existing.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  },
};
