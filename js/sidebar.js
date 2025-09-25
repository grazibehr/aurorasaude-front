(function () {
  const side = document.getElementById("sidebar");
  if (!side) return;
  const btnMobile = document.getElementById("sideToggle");
  const btnCollapse = document.getElementById("sideCollapse");
  const topbar = document.getElementById("app-topbar");
  const main = document.querySelector("main");

  const backdrop =
    document.getElementById("sideBackdrop") ||
    (() => {
      const el = document.createElement("div");
      el.id = "sideBackdrop";
      el.className =
        "fixed inset-0 z-30 bg-black/30 opacity-0 pointer-events-none md:hidden transition";
      document.body.appendChild(el);
      return el;
    })();

  function openSide() {
    if (side.classList.contains("is-hidden")) return;
    side.style.transform = "translateX(0)";
    backdrop.classList.remove("pointer-events-none");
    backdrop.style.opacity = "1";
  }
  function closeSide() {
    side.style.transform = "translateX(-100%)";
    backdrop.style.opacity = "0";
    setTimeout(() => backdrop.classList.add("pointer-events-none"), 200);
  }

  function applyMainMarginByCollapse() {
    if (!main) return;
    if (side.classList.contains("is-collapsed")) {
      main.classList.remove("md:ml-64");
      main.classList.add("md:ml-20");
    } else {
      main.classList.add("md:ml-64");
      main.classList.remove("md:ml-20");
    }
  }

  const MINIMAL_HASHES = new Set(["#/onboarding", "#/auth"]);
  const normHash = () => (location.hash || "#/").replace(/\/+$/, "");

  function hideChromeForMinimal() {
    // sidebar
    side.classList.add("is-hidden");
    side.style.transform = "";
    backdrop.style.opacity = "0";
    backdrop.classList.add("pointer-events-none");
    // remove margens do main
    if (main) main.classList.remove("md:ml-64", "md:ml-20");
    // topbar (se existir)
    if (topbar) topbar.style.display = "none";
  }

  function showChromeNormal() {
    side.classList.remove("is-hidden");
    applyMainMarginByCollapse();
    if (topbar) topbar.style.display = "";
  }

  function applyRouteUI() {
    if (MINIMAL_HASHES.has(normHash())) {
      hideChromeForMinimal();
    } else {
      showChromeNormal();
    }
  }

  applyRouteUI();
  window.addEventListener("hashchange", applyRouteUI);

  btnMobile?.addEventListener("click", () => {
    if (side.classList.contains("is-hidden")) return;
    const hidden = getComputedStyle(side).transform.includes("-100");
    hidden ? openSide() : closeSide();
  });
  backdrop.addEventListener("click", closeSide);
  btnCollapse?.addEventListener("click", () => {
    if (side.classList.contains("is-hidden")) return;

    const isCollapsed = side.classList.toggle("is-collapsed");

    if (isCollapsed) {
      side.classList.remove("w-64");
      side.classList.add("w-20");
    } else {
      side.classList.add("w-64");
      side.classList.remove("w-20");
    }

    applyMainMarginByCollapse();

    btnCollapse.setAttribute("aria-pressed", String(isCollapsed));
    btnCollapse.setAttribute(
      "aria-label",
      isCollapsed ? "Expandir sidebar" : "Recolher sidebar"
    );
  });
})();
