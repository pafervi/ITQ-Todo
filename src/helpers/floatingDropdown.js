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
const origins = new WeakMap(); // menu -> { parent, next, toggle }
const activeMenus = new Set(); // all menus currently in the portal

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
  // Temporarily make the menu measurable.
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

function returnMenuToOrigin(menu) {
  let origin = origins.get(menu);
  if (!origin) return;
  menu.style.position = "";
  menu.style.top = "";
  menu.style.left = "";
  menu.style.display = "";
  menu.classList.remove("show");
  if (origin.parent) {
    if (origin.next && origin.next.parentNode === origin.parent) origin.parent.insertBefore(menu, origin.next);
    else origin.parent.appendChild(menu);
  }
  origins.delete(menu);
  activeMenus.delete(menu);
}

function returnAllMenus() {
  for (let menu of Array.from(activeMenus)) {
    returnMenuToOrigin(menu);
  }
}

function onShow(event) {
  let toggle = event.target;
  if (!toggle || !toggle.parentNode) return;
  let menu = findMenu(toggle);
  if (!menu) return;
  // Close any other open menu first.
  returnAllMenus();
  origins.set(menu, { parent: menu.parentNode, next: menu.nextSibling, toggle: toggle });
  activeMenus.add(menu);
  getPortal().appendChild(menu);
  positionMenu(toggle, menu);
}

function onHidden(event) {
  let toggle = event.target;
  if (!toggle) return;
  for (let menu of Array.from(activeMenus)) {
    let origin = origins.get(menu);
    if (origin && origin.toggle === toggle) {
      returnMenuToOrigin(menu);
      return;
    }
  }
}

// Safety net: when the user clicks anywhere outside an open menu while it
// is in the portal, Bootstrap may not fire hidden.bs.dropdown because it
// can't find the menu in its expected DOM location. Instead of checking the
// .show class (which Bootstrap may have FAILED to remove), we check whether
// the click landed inside any active menu or on a dropdown toggle. If not,
// we close everything unconditionally.
function onDocumentClick(event) {
  if (activeMenus.size === 0) return;
  // If the click was inside an active menu, let it proceed (menu item click).
  for (let menu of activeMenus) {
    if (menu.contains(event.target)) return;
  }
  // If the click was on a dropdown toggle, show.bs.dropdown will handle it.
  let el = event.target;
  while (el) {
    if (el.getAttribute && el.getAttribute("data-bs-toggle") === "dropdown") return;
    el = el.parentNode;
  }
  // Click was outside all menus and toggles — close everything after
  // a microtask so Bootstrap's own handler runs first.
  setTimeout(function () {
    returnAllMenus();
  }, 0);
}

function onKeydown(event) {
  if (event.key === "Escape" && activeMenus.size > 0) {
    returnAllMenus();
  }
}

function onScroll() {
  if (activeMenus.size > 0) {
    returnAllMenus();
  }
}

let installed = false;

export function installFloatingDropdowns() {
  if (installed) return;
  installed = true;
  document.addEventListener("show.bs.dropdown", onShow);
  document.addEventListener("hidden.bs.dropdown", onHidden);
  document.addEventListener("click", onDocumentClick, true);
  document.addEventListener("keydown", onKeydown, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll);
}

export default { installFloatingDropdowns };
