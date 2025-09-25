(function () {
  const { getPath, render } = window.Router;

  function needsOnboarding(path) {
    return !localStorage.getItem("profile") && path !== "/onboarding";
  }

  function highlightActive(path) {
    const current = `#${path}`;
    document.querySelectorAll("#menu a").forEach((a) => {
      a.classList.toggle("active", current.startsWith(a.getAttribute("href")));
    });
  }

  function router() {
    const path = getPath();
    if (needsOnboarding(path)) {
      location.hash = "#/onboarding";
      return;
    }

    render(path); // 1) monta o template
    highlightActive(path);
    window.scrollTo({ top: 0, behavior: "auto" });

    try {
      window.hooks?.[path]?.();
    } catch (e) {
      console.error(e);
    } // 2) liga eventos
  }

  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
})();
