window.hooks = window.hooks || {};

function getSaudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function parseDataSegura(dataStr) {
  const s = String(dataStr || "");
  const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (onlyDate) {
    const [y, m, d] = s.split("-").map(Number);
    return { date: new Date(y, m - 1, d), hasTime: false };
  }
  const d = new Date(s);
  return { date: isNaN(d) ? new Date(0) : d, hasTime: true };
}

function formatarDataHoraBR(dataStr) {
  const { date, hasTime } = parseDataSegura(dataStr);
  const data = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const hora = hasTime
    ? date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : null;
  return { data, hora, datetimeAttr: String(dataStr || "") };
}

function iconeLucide(name) {
  const s = (name || "").toLowerCase();
  if (s.includes("febre"))
    return { icon: "thermometer", color: "text-amber-500" };
  if (s.includes("fadiga")) return { icon: "bed", color: "text-rose-500" };
  if (s.includes("náusea") || s.includes("enjoo"))
    return { icon: "stethoscope", color: "text-emerald-600" };
  if (s.includes("calafrio"))
    return { icon: "cloud-lightning", color: "text-indigo-500" };
  if (s.includes("tosse")) return { icon: "wind", color: "text-slate-500" };
  if (s.includes("cefaleia") || s.includes("cabeça"))
    return { icon: "brain", color: "text-violet-600" };
  return { icon: "activity", color: "text-indigo-600" };
}

function classeSelo(n) {
  n = Math.min(10, Math.max(0, Number(n || 0)));
  if (n >= 9) return "bg-red-100 text-red-600";
  if (n >= 7) return "bg-orange-100 text-orange-600";
  if (n >= 5) return "bg-amber-100 text-amber-700";
  if (n >= 3) return "bg-green-100 text-green-600";
  return "bg-slate-100 text-slate-600";
}

async function renderizarRecentes() {
  const ul = document.querySelector("#user-symptoms-list");
  const countEl = document.querySelector("#user-symptoms-count");
  if (!ul) return;

  ul.innerHTML = `
    <li>
      <div class="flex items-start gap-3"></div>
    </li>
  `.repeat(3);

  try {
    const svc = window.UserSymptoms || {};
    let items = [],
      total = 0;

    if (typeof svc.listWithMeta === "function") {
      const PAGE = 100;
      let page = 1;
      let all = [];
      for (;;) {
        const r = await svc.listWithMeta({ page, page_size: PAGE });
        const chunk = Array.isArray(r?.items) ? r.items : [];
        all.push(...chunk);
        total = Number(r?.total ?? all.length);
        if (chunk.length < PAGE || !r?.next_page) break;
        page++;
      }
      items = all;
    } else if (typeof svc.list === "function") {
      const r = await svc.list();
      items = Array.isArray(r) ? r : r?.items || [];
      total = items.length;
    }

    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    const VISIBLE = 3;
    const visiveis = items.slice(0, VISIBLE);

    ul.innerHTML = "";
    if (visiveis.length === 0) {
      ul.innerHTML = `
        <li class="p-4 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm flex items-center gap-3 bg-white">
          <span class="text-xl">🗒️</span>
          <span>Nenhum registro por enquanto.</span>
        </li>`;
    } else {
      for (const s of visiveis) {
        const nome =
          s.symptom_name ||
          s.label ||
          s.symptom ||
          s.type ||
          (s.symptom_id ? `#${s.symptom_id}` : "Sintoma");
        const nivel = Number(s.pain_level ?? s.intensity ?? s.level ?? 0);
        const { data } = formatarDataHoraBR(s.date);
        const { icon, color } = iconeLucide(nome);

        ul.innerHTML += `
<li class="py-3" data-id="${s.id}">
  <div class="flex justify-between items-center">
    <div class="flex items-center min-w-0">
      <i data-lucide="${icon}" class="w-5 h-5 ${color} mr-3"></i>
      <p class="font-medium text-gray-800 truncate">${nome}</p>
      <span class="ml-3 ${classeSelo(
        nivel
      )} text-xs font-semibold px-2 py-0.5 rounded-full">
        Intensidade ${nivel || 0}/10
      </span>
    </div>

    <div class="flex items-center text-gray-500 text-sm flex-shrink-0">
      <span class="mr-4 whitespace-nowrap">${data}</span>
      <div class="relative sym-actions">
        <button class="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                data-menu-btn aria-haspopup="true" aria-expanded="false"
                aria-controls="sym-menu-${s.id}" title="Mais ações">
          <i data-lucide="more-horizontal" class="w-5 h-5"></i>
        </button>
        <div id="sym-menu-${s.id}"
             class="sym-menu hidden absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1"
             role="menu">
          <button class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600" data-act="delete" role="menuitem">
            <i data-lucide="trash-2" class="w-4 h-4"></i> Excluir
          </button>
        </div>
      </div>
    </div>
  </div>
</li>`;
      }
    }

    if (countEl)
      countEl.textContent = `${items.length} registro${
        items.length === 1 ? "" : "s"
      }`;
  } catch (e) {
    console.error(e);
    ul.innerHTML = `<li class="text-sm text-rose-600">Erro ao carregar registros.</li>`;
  }

  if (window.lucide?.createIcons) lucide.createIcons();
}

if (!window.__bindSymMenus) {
  window.__bindSymMenus = true;

  function fecharTodosMenusSintomas() {
    document
      .querySelectorAll(".sym-menu")
      .forEach((m) => m.classList.add("hidden"));
    document
      .querySelectorAll("[data-menu-btn]")
      .forEach((b) => b.setAttribute("aria-expanded", "false"));
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-menu-btn]");
    if (btn) {
      e.preventDefault();
      const menu = document.getElementById(btn.getAttribute("aria-controls"));
      const vaiAbrir = menu?.classList.contains("hidden");
      fecharTodosMenusSintomas();
      if (menu && vaiAbrir) {
        menu.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
        setTimeout(() => menu.querySelector('[role="menuitem"]')?.focus(), 0);
      }
      return;
    }

    const botaoAcao = e.target.closest("[data-act]");
    if (botaoAcao) {
      const card = botaoAcao.closest("[data-id]");
      const id = Number(card?.dataset?.id);
      if (!id) return;

      fecharTodosMenusSintomas();

      if (botaoAcao.dataset.act === "delete") {
        const svc = window.UserSymptoms || {};
        if (typeof svc.remove !== "function") {
          alert("Excluir indisponível nesta versão do app.");
          return;
        }
        const ok = await ConfirmDialog.ask();
        if (!ok) return;

        try {
          await svc.remove(id);
          await renderizarRecentes();
        } catch (err) {
          console.error(err);
          alert("Falha ao excluir. Tente novamente.");
        }
        return;
      }
    }

    if (!e.target.closest(".sym-actions")) fecharTodosMenusSintomas();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharTodosMenusSintomas();
  });

  (function () {
    if (window.ConfirmDialog && window.ConfirmDialog.__installed) return;
    const root = document.getElementById("confirm-modal");
    if (!root) {
      console.warn("[ConfirmDialog] #confirm-modal não encontrado.");
      window.ConfirmDialog = { ask: async () => false };
      return;
    }
    const panel = root.querySelector('[role="dialog"]') || root;
    const btnOk = root.querySelector("[data-confirm-ok]");
    const btnCancel = root.querySelector("[data-confirm-cancel]");
    const titleEl = root.querySelector("#confirm-title");
    const descEl = root.querySelector("#confirm-desc");
    let resolver = null,
      lastFocus = null;

    function travarScroll(on) {
      document.documentElement.style.overflow = on ? "hidden" : "";
    }
    function prenderFoco(e) {
      if (e.key !== "Tab") return;
      const f = panel.querySelectorAll(
        "button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])"
      );
      if (!f.length) return;
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    function onKey(e) {
      if (root.classList.contains("hidden")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        fechar(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        fechar(true);
      }
    }
    function abrir({
      titleText = "Confirmar ação",
      message = "Tem certeza?",
      okText = "Confirmar",
      cancelText = "Cancelar",
      variant = "default",
    } = {}) {
      if (titleEl) titleEl.textContent = titleText;
      if (descEl) descEl.textContent = message;
      if (btnOk) btnOk.textContent = okText;
      if (btnCancel) btnCancel.textContent = cancelText;

      const iconEl = document.getElementById("confirm-icon");
      btnOk.className =
        "h-9 rounded-lg px-4 text-sm font-semibold text-white " +
        (variant === "danger"
          ? "bg-rose-600 hover:bg-rose-700"
          : variant === "info"
          ? "bg-amber-500 hover:bg-amber-600"
          : "bg-indigo-600 hover:bg-indigo-700");

      if (iconEl) {
        iconEl.setAttribute(
          "data-lucide",
          variant === "danger"
            ? "trash-2"
            : variant === "info"
            ? "alert-triangle"
            : "help-circle"
        );
        iconEl.className =
          "w-6 h-6 " +
          (variant === "danger"
            ? "text-rose-600"
            : variant === "info"
            ? "text-amber-500"
            : "text-indigo-600");
        if (window.lucide?.createIcons) lucide.createIcons();
      }

      lastFocus = document.activeElement;
      root.classList.remove("hidden");
      root.setAttribute("aria-hidden", "false");
      travarScroll(true);
      document.addEventListener("keydown", prenderFoco);
      document.addEventListener("keydown", onKey);
      setTimeout(() => btnOk?.focus(), 10);

      return new Promise((resolve) => {
        resolver = resolve;
      });
    }

    function fechar(result) {
      document.removeEventListener("keydown", prenderFoco);
      document.removeEventListener("keydown", onKey);
      root.classList.add("hidden");
      root.setAttribute("aria-hidden", "true");
      travarScroll(false);
      if (lastFocus && lastFocus.focus) setTimeout(() => lastFocus.focus(), 0);
      if (resolver) {
        resolver(!!result);
        resolver = null;
      }
    }

    btnOk?.addEventListener("click", () => fechar(true));
    btnCancel?.addEventListener("click", () => fechar(false));
    root.addEventListener("click", (e) => {
      const isBackdrop =
        e.target === root ||
        e.target.matches("#confirm-modal > .absolute.inset-0.bg-black\\/50");
      if (isBackdrop) fechar(false);
    });

    window.ConfirmDialog = { ask: abrir, close: fechar, __installed: true };
  })();
}

const hookHomeAnterior = window.hooks["/home"];
window.hooks["/home"] = async () => {
  if (typeof hookHomeAnterior === "function") await hookHomeAnterior();

  const title = document.getElementById("home-title");
  if (title) {
    const user = window.Auth?.getUser?.();
    const nomeCompleto = user?.name || "visitante";
    const primeiroNome = nomeCompleto.split(" ")[0];
    title.textContent = `${getSaudacao()}, ${primeiroNome}!`;
  }

  await renderizarRecentes();

  if (window.hooks?.updateHealthTips) {
    const svc = window.UserSymptoms || {};
    svc.listWithMeta({ limit: 100 }).then((r) => {
      window.hooks.updateHealthTips(r.items, document);
    });
  }
};

window.addEventListener("hashchange", () => {
  if (location.hash.replace(/^#/, "") === "/home") window.hooks["/home"]?.();
});
document.addEventListener("auth:change", () => {
  if (location.hash.replace(/^#/, "") === "/home") window.hooks["/home"]?.();
});
