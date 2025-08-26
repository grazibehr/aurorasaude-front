const $ = (sel, root = document) => root.querySelector(sel);

const ROUTES = {
  "": "pages/homepage.html",
  "/home": "pages/homepage.html",
  "/dashboard": "pages/stats.html",
  "/stats": "pages/stats.html",
  "/timeline": "pages/timeline.html",
  "/symptom": "pages/symptoms/symptom-form.html",
};

async function loadInto(selector, url) {
  const host = $(selector);
  if (!host) return;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    host.innerHTML = await res.text();
  } catch (err) {
    console.error(`Falha ao carregar ${url}:`, err);
  }
}

async function loadLayout() {
  await Promise.all([
    loadInto("#header", "layouts/header.html"),
    loadInto("#footer", "layouts/footer.html"),
  ]);
}

function getPathFromHash() {
  const hash = location.hash || "#/";
  const raw = hash.slice(1);
  return raw.replace(/\/+$/, "") || "/";
}

async function router() {
  const path = getPathFromHash();
  const viewUrl = ROUTES[path];
  if (viewUrl) {
    await loadInto("#app", viewUrl);
    window.scrollTo({ top: 0, behavior: "auto" });
  } else {
    console.error("Router error:", err);
  }
}

// Boota
window.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();
  await router();
});
window.addEventListener("hashchange", router);
