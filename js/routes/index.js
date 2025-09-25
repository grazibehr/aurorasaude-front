// js/routes/index.js

const byId = (id) => document.getElementById(id);
const clone = (id) => document.importNode(byId(id).content, true);

const ROUTES = {
  "/": "home",
  "/home": "home",
  "/symptom": "symptom",
  "/perfil": "perfil",
  "/ficha-saude": "ficha-saude",
  "/analytics": "analytics",
  "/onboarding": "onboarding",
  "/auth": "auth",
};

const PUBLIC_ROUTES = new Set(["/auth", "/onboarding"]);

const setIntended = (route) => sessionStorage.setItem("INTENDED_ROUTE", route);
const popIntended = () => {
  const r = sessionStorage.getItem("INTENDED_ROUTE");
  sessionStorage.removeItem("INTENDED_ROUTE");
  return r;
};

const getPath = () => {
  const raw = (location.hash || "#/").slice(1);
  return raw.replace(/\/+$/, "") || "/";
};

const isAuth = () => !!window.Auth?.getToken?.();

function toggleSidebar(path) {
  const sb = byId("sidebar");
  if (!sb) return;
  const hide = path === "/auth" || path === "/onboarding";
  sb.style.transform = hide ? "translateX(-100%)" : "translateX(0)";
}

function focusMain() {
  const app = byId("app");
  if (!app) return;
  app.setAttribute("tabindex", "-1");
  app.focus({ preventScroll: true });
  app.removeAttribute("tabindex");
}

function gotoIntendedOrHome() {
  const intended = popIntended();
  location.hash = `#${intended || "/home"}`;
}

function render(path = getPath()) {
  const app = byId("app");
  if (!app) return;

  const cleanPath = path.replace(/\/+$/, "") || "/";
  const tplId = ROUTES[cleanPath];

  // Guard: exige auth em rotas privadas
  const needsAuth = !PUBLIC_ROUTES.has(cleanPath);
  if (needsAuth && !isAuth()) {
    setIntended(cleanPath);
    location.hash = "#/auth";
    return;
  }

  // Se já está logada e caiu no /auth, manda pra intended ou home
  if (cleanPath === "/auth" && isAuth()) {
    gotoIntendedOrHome();
    return;
  }

  app.innerHTML = "";

  // Render 404 se rota não existe
  if (!tplId) {
    app.innerHTML = `
      <section class="p-8 text-center">
        <h2 class="text-2xl font-bold">404</h2>
        <p class="text-slate-600 mt-2">Página não encontrada</p>
      </section>`;
    focusMain();
    return;
  }

  const tpl = byId(tplId);
  if (!tpl) {
    app.innerHTML = `
      <section class="p-8 text-center">
        <h2 class="text-2xl font-bold">Erro</h2>
        <p class="text-slate-600 mt-2">Template "${tplId}" não encontrado.</p>
      </section>`;
    focusMain();
    return;
  }

  app.appendChild(clone(tplId));

  // pós-render: inicializações específicas da tela
  requestAnimationFrame(() => {
    try {
      if (tplId === "home") window.HomeCharts?.init?.();
      if (tplId === "auth") window.AuthUI?.init?.();
      if (tplId === "onboarding") window.Onboarding?.init?.();
      window.hooks?.[path]?.();
    } catch (e) {
      console.warn("Erro ao inicializar tela:", e);
    }
    focusMain();
  });
}

function updateActiveLink(currentPath) {
  const route = currentPath.replace(/\/+$/, "") || "/";
  const links = document.querySelectorAll("#sideNav a");
  links.forEach((link) => {
    link.classList.remove("navlink--active");
    link.removeAttribute("aria-current");
  });
  let current = document.querySelector(`#sideNav a[data-route="${route}"]`);
  if (!current) {
    current = Array.from(links).find(
      (a) => a.getAttribute("href") === `#${route}`
    );
  }
  if (current) {
    current.classList.add("navlink--active");
    current.setAttribute("aria-current", "page");
  }
}

// mantém a API original mas com active link + toggles
const _origRender = render;
render = function (path = getPath()) {
  _origRender(path);
  updateActiveLink(path);
  toggleSidebar(path);
};

// estado inicial UI
const startPath = getPath();
updateActiveLink(startPath);
toggleSidebar(startPath);

// Reagir a mudanças de hash
window.addEventListener("hashchange", () => {
  const p = getPath();
  updateActiveLink(p);
  render(p);
});

// Reagir a login/logout/expiração se teu client disparar
document.addEventListener("auth:change", () => {
  const p = getPath();
  // Se deslogou estando numa rota privada, empurra pro /auth
  if (!PUBLIC_ROUTES.has(p) && !isAuth()) {
    setIntended(p);
    location.hash = "#/auth";
    return;
  }
  // Se logou estando no /auth, manda pra intended ou home
  if (p === "/auth" && isAuth()) {
    gotoIntendedOrHome();
    return;
  }
  render(p);
});

// render inicial
render();

// expõe utilitários
window.Router = { ROUTES, getPath, render };
