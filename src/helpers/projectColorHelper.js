// Deterministic per-project color identity: every project list gets a
// distinct hue derived from its (stable) listId, so lists get a visual
// identity automatically, without the user having to pick a color.
// The manual color picker (list.color) always takes priority over this.

function hueFor(seed) {
  let str = String(seed || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export default {
  hueFor,
  gradientFor(seed) {
    let hue = hueFor(seed);
    let hue2 = (hue + 34) % 360;
    return `linear-gradient(90deg, hsl(${hue}, 72%, 60%), hsl(${hue2}, 72%, 55%))`;
  },
  solidFor(seed) {
    let hue = hueFor(seed);
    return `hsl(${hue}, 68%, 58%)`;
  },
};
