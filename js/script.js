(function () {
  const { obterRotaAtual } = window.Router;

  function highlightActive(path) {
    const current = `#${path}`;
    document.querySelectorAll("#menu a").forEach((a) => {
      a.classList.toggle("active", current.startsWith(a.getAttribute("href")));
    });
  }

  function router() {
    const path = obterRotaAtual();

    highlightActive(path);
    window.scrollTo({ top: 0, behavior: "auto" });

    try {
      window.hooks?.[path]?.();
    } catch (e) {
      console.error(e);
    }
  }

  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
})();
