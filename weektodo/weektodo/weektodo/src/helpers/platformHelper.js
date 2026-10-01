// Renderer-side platform checks. Uses the user agent so it also works in the
// plain web build (where `process.platform` is only a webpack polyfill).
const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";

export default {
  isLinux() {
    return /Linux/i.test(ua) && !/Android/i.test(ua);
  },
  isWindows() {
    return /Windows/i.test(ua);
  },
  // A Windows-style absolute path (C:\...) is meaningless on other systems and
  // would make fs.mkdirSync create a folder literally named "C:\...".
  isForeignPath(p) {
    return !!p && /^[A-Za-z]:[\\/]/.test(p) && !/Windows/i.test(ua);
  },
};
