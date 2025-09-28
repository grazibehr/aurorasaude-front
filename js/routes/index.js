const porId = (id) => document.getElementById(id);
const clonar = (id) => document.importNode(porId(id).content, true);

const ROTAS = {
  "/": "home",
  "/home": "home",
  "/symptom": "symptom",
  "/analytics": "analytics",
  "/auth": "auth",
};

const ROTAS_PUBLICAS = new Set(["/auth"]);

const definirRotaPretendida = (rota) =>
  sessionStorage.setItem("ROTA_PRETENDIDA", rota);

const consumirRotaPretendida = () => {
  const r = sessionStorage.getItem("ROTA_PRETENDIDA");
  sessionStorage.removeItem("ROTA_PRETENDIDA");
  return r;
};

const obterRotaAtual = () => {
  const bruto = (location.hash || "#/auth").slice(1);
  return bruto.replace(/\/+$/, "") || "/auth";
};

const estaAutenticada = () => !!window.Auth?.obterToken?.();

function alternarSidebar(rota) {
  const sb = porId("sidebar");
  if (!sb) return;
  const ocultar = rota === "/auth";
  sb.style.transform = ocultar ? "translateX(-100%)" : "translateX(0)";
}

function aplicarClasseDaRota(rota = obterRotaAtual()) {
  const ehAuth = rota === "/auth" || !estaAutenticada();
  document.body.classList.toggle("route-auth", ehAuth);
  document.body.classList.toggle("route-app", !ehAuth);
}

function focarMain() {
  const app = porId("app");
  if (!app) return;
  app.setAttribute("tabindex", "-1");
  app.focus({ preventScroll: true });
  app.removeAttribute("tabindex");
}

function irParaPretendidaOuHome() {
  const pretendida = consumirRotaPretendida();
  location.hash = `#${pretendida || "/home"}`;
}

function renderizar(rota = obterRotaAtual()) {
  const app = porId("app");
  if (!app) return;

  const caminhoLimpo = rota.replace(/\/+$/, "") || "/";
  const tplId = ROTAS[caminhoLimpo];

  const precisaAuth = !ROTAS_PUBLICAS.has(caminhoLimpo);
  if (precisaAuth && !estaAutenticada()) {
    definirRotaPretendida(caminhoLimpo);
    location.hash = "#/auth";
    return;
  }

  if (caminhoLimpo === "/auth" && estaAutenticada()) {
    irParaPretendidaOuHome();
    return;
  }

  app.innerHTML = "";

  const tpl = porId(tplId);
  if (!tpl) {
    app.innerHTML = `
      <section class="p-8 text-center">
        <h2 class="text-2xl font-bold">Erro</h2>
        <p class="text-slate-600 mt-2">Template "${tplId}" não encontrado.</p>
      </section>`;
    focarMain();
    return;
  }

  app.appendChild(clonar(tplId));

  requestAnimationFrame(() => {
    try {
      if (tplId === "home") {
        window.HomeInsights?.invalidate?.();
        window.HomeInsights?.init?.();
      }
      if (tplId === "auth") {
        window.AuthUI?.iniciarAuthUI?.();
      }

      window.hooks?.[tplId]?.();

      if (window.lucide?.createIcons) lucide.createIcons();
    } catch (e) {
      console.warn("Erro ao inicializar tela:", e);
    }
    focarMain();
  });
}

function atualizarLinkAtivo(caminhoAtual) {
  const rota = caminhoAtual.replace(/\/+$/, "") || "/";
  const links = document.querySelectorAll("#sideNav a");
  links.forEach((link) => {
    link.classList.remove("navlink--active");
    link.removeAttribute("aria-current");
  });
  let atual = document.querySelector(`#sideNav a[data-route="${rota}"]`);
  if (!atual) {
    atual = Array.from(links).find(
      (a) => a.getAttribute("href") === `#${rota}`
    );
  }
  if (atual) {
    atual.classList.add("navlink--active");
    atual.setAttribute("aria-current", "page");
  }
}

const _renderizarOriginal = renderizar;
renderizar = function (rota = obterRotaAtual()) {
  aplicarClasseDaRota(rota);
  _renderizarOriginal(rota);
  atualizarLinkAtivo(rota);
  alternarSidebar(rota);
};

if (!location.hash) {
  location.replace("#/auth");
}

const rotaInicial = obterRotaAtual();
aplicarClasseDaRota(rotaInicial);
atualizarLinkAtivo(rotaInicial);
alternarSidebar(rotaInicial);

window.addEventListener("hashchange", () => {
  const r = obterRotaAtual();
  aplicarClasseDaRota(r);
  atualizarLinkAtivo(r);
  renderizar(r);
});

document.addEventListener("auth:change", () => {
  const r = obterRotaAtual();
  if (!ROTAS_PUBLICAS.has(r) && !estaAutenticada()) {
    definirRotaPretendida(r);
    location.hash = "#/auth";
    return;
  }
  if (r === "/auth" && estaAutenticada()) {
    irParaPretendidaOuHome();
    return;
  }
  aplicarClasseDaRota(r);
  renderizar(r);
});

renderizar();

window.Router = { ROTAS, obterRotaAtual, renderizar };
