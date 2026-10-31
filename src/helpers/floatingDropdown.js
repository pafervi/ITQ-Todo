// Floating dropdown menus.
//
// A Bootstrap dropdown menu normally lives inside the element that owns the
// toggle, so it is clipped by that element's overflow and ends up below any
// sibling card that has its own stacking context. Menus marked with the class
// "floating-menu" are moved into a top-level portal while open and put back in
// their original place when closed, so they always overlay everything.
//
// Usage: add class "floating-menu" to the .dropdown-menu and call
// installFloatingDropdowns() once at startup.

const PORTAL_ID = "floating-dropdown-portal";
const origins = new WeakMap(); // menu -> { parent, next }
const menus = new WeakMap(); // toggle -> menu

function getPortal() {
  let portal = document.getElementById(PORTAL_ID);
  if (!portal) {
    portal = document.createElement("div");
    portal.id = PORTAL_ID;
    portal.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;z-index:1065;";
    document.body.appendChild(portal);
  }
  // The theme and fonts live on #app-container, so mirror them on the portal.
  let app = document.getElementById("app-container");
  portal.classList.toggle("dark-theme", !!(app && app.classList.contains("dark-theme")));
  if (app) {
    let cs = window.getComputedStyle(app);
    portal.style.fontFamily = cs.fontFamily;
    portal.style.setProperty("--accent-color", cs.getPropertyValue("--accent-color"));
  }
  return portal;
}

function findMenu(toggle) {
  let parent = toggle.parentNode;
  if (!parent) return null;
  return parent.querySelector(":scope > .dropdown-menu.floating-menu");
}

function positionMenu(toggle, menu) {
  let rect = toggle.getBoundingClientRect();
  // Temporarily show the menu off-screen to measure its height.
  menu.style.position = "fixed";
  menu.style.visibility = "hidden";
  menu.style.display = "block";
  let menuHeight = menu.offsetHeight;
  menu.style.visibility = "";

  let spaceBelow = window.innerHeight - rect.bottom;
  let spaceAbove = rect.top;

  // Flip upward when the menu would overflow the viewport bottom
  // and there is enough room above.
  if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
    menu.style.top = Math.max(4, rect.top - menuHeight) + "px";
  } else {
    menu.style.top = rect.bottom + "px";
  }
  menu.style.left = rect.left + "px";
}

function onShow(event) {
  let toggle = event.target;
  if (!toggle || !toggle.parentNode) return;
  let menu = findMenu(toggle);
  if (!menu || menu.parentNode === document.getElementById(PORTAL_ID)) return;
  origins.set(menu, { parent: menu.parentNode, next: menu.nextSibling });
  menus.set(toggle, menu);
  getPortal().appendChild(menu);
  positionMenu(toggle, menu);
}

function onHidden(event) {
  let toggle = event.target;
  let menu = toggle && menus.get(toggle);
  if (!menu) return;
  let origin = origins.get(menu);
  if (origin && origin.parent) {
    // Clear portal positioning before returning the menu to the DOM.
    menu.style.position = "";
    menu.style.top = "";
    menu.style.left = "";
    if (origin.next && origin.next.parentNode === origin.parent) origin.parent.insertBefore(menu, origin.next);
    else origin.parent.appendChild(menu);
  }
  menus.delete(toggle);
  origins.delete(menu);
}

let installed = false;

export function installFloatingDropdowns() {
  if (installed) return;
  installed = true;
  document.addEventListener("show.bs.dropdown", onShow);
  document.addEventListener("hidden.bs.dropdown", onHidden);
}

export default { installFloatingDropdowns };
