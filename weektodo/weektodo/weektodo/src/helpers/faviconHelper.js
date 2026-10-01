export default {
  apply(accentColor) {
    let color = accentColor || "#5e6ef2";
    let svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
      `<rect width='64' height='64' rx='16' fill='${color}'/>` +
      `<path d='M18 33 L28 43 L46 21' stroke='white' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/>` +
      `</svg>`;
    let href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  },
};
