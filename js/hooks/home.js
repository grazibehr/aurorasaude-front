window.hooks = window.hooks || {};

function getSaudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

window.hooks["/home"] = () => {
  const title = document.getElementById("home-title");
  if (!title) return;

  const user = window.Auth?.getUser?.();
  const nome = user?.name || "visitante";
  title.textContent = `${getSaudacao()}, ${nome}! 👋`;
};

document.addEventListener("auth:change", () => {
  if (location.hash.replace(/^#/, "") === "/home") {
    window.hooks["/home"]?.();
  }
});

function parseDateSafe(dateStr) {
  const s = String(dateStr || "");
  const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (onlyDate) {
    const [y, m, d] = s.split("-").map(Number);
    return { date: new Date(y, m - 1, d), hasTime: false };
  }
  const d = new Date(s);
  return { date: isNaN(d) ? new Date(0) : d, hasTime: true };
}
function formatDateTimeBR(dateStr) {
  const { date, hasTime } = parseDateSafe(dateStr);
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
  return { data, hora, datetimeAttr: String(dateStr || "") };
}
async function renderRecent() {
  const ul = document.querySelector("#user-symptoms-list");
  const countEl = document.querySelector("#user-symptoms-count");
  if (!ul) return;

  // skeletons
  ul.innerHTML = `
    <li class="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div class="flex items-start gap-3">
        <span class="h-9 w-9 rounded-full skel"></span>
        <div class="flex-1 space-y-2">
          <div class="h-4 w-40 rounded skel"></div>
          <div class="h-3 w-24 rounded skel"></div>
          <div class="h-3 w-56 rounded skel"></div>
        </div>
      </div>
    </li>
  `.repeat(3);

  const lvlClass = (n) => `chip l${Math.min(10, Math.max(1, Number(n || 0)))}`;
  const iconFor = (name) => {
    const s = (name || "").toLowerCase();
    if (s.includes("cefaleia") || s.includes("cabeça"))
      return { i: "🧠", bg: "#EEF2FF", fg: "#4F46E5" };
    if (s.includes("enjoo") || s.includes("náusea"))
      return { i: "🤢", bg: "#ECFEFF", fg: "#0891B2" };
    if (s.includes("calafrios"))
      return { i: "🧊", bg: "#F0FDFA", fg: "#0D9488" };
    if (s.includes("fadiga")) return { i: "😮‍💨", bg: "#FFF7ED", fg: "#EA580C" };
    if (s.includes("tosse")) return { i: "🤧", bg: "#F1F5F9", fg: "#334155" };
    if (s.includes("muscular"))
      return { i: "💪", bg: "#FEF2F2", fg: "#DC2626" };
    return { i: "🩺", bg: "#F8FAFC", fg: "#475569" };
  };
  const fmt = (iso) => {
    try {
      return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return String(iso || "—");
    }
  };

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

    // ---- ORDENA e LIMITA (mostra 4) ----
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    const VISIBLE = 3;
    const visibleItems = items.slice(0, VISIBLE);

    // ---- CTA "Ver todos" dinâmico ----
    const viewAll = document.getElementById("view-all-link");
    if (viewAll) {
      if (items.length > VISIBLE) {
        // mostra o total, dá contexto
        viewAll.classList.remove("hidden");
        viewAll.textContent = `Ver todos os registros (${items.length})`;
        viewAll.setAttribute(
          "aria-label",
          `Ver todos os ${items.length} registros`
        );
        // se quiser já levar com um filtro/aba específica, mantenha o href atual (#/analytics)
      } else {
        // sem “todos” a mostrar
        viewAll.classList.add("hidden");
      }
    }

    ul.innerHTML = "";
    if (visibleItems.length === 0) {
      ul.innerHTML = `
    <li class="p-4 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm flex items-center gap-3 bg-white">
      <span class="text-xl">🗒️</span>
      <span>Nenhum registro por enquanto.</span>
    </li>`;
    } else {
      for (const s of visibleItems) {
        const name =
          s.symptom_name ||
          s.label ||
          s.symptom ||
          s.type ||
          `#${s.symptom_id}` ||
          "Sintoma";
        const lvl = Number(s.pain_level ?? s.intensity ?? s.level ?? 0);

        // helpers que você já tem (icon/cores/data) — reaproveite os teus:
        const { data, hora, datetimeAttr } = formatDateTimeBR(s.date);
        const {
          i: icon,
          bg,
          fg,
        } = (function iconFor(n) {
          const t = (n || "").toLowerCase();
          if (t.includes("cefaleia") || t.includes("cabeça"))
            return { i: "🧠", bg: "#EEF2FF", fg: "#4F46E5" };
          if (t.includes("enjoo") || t.includes("náusea"))
            return { i: "🤢", bg: "#ECFEFF", fg: "#0891B2" };
          if (t.includes("calafrios"))
            return { i: "🧊", bg: "#F0FDFA", fg: "#0D9488" };
          if (t.includes("fadiga"))
            return { i: "😮‍💨", bg: "#FFF7ED", fg: "#EA580C" };
          if (t.includes("tosse"))
            return { i: "🤧", bg: "#F1F5F9", fg: "#334155" };
          if (t.includes("muscular"))
            return { i: "💪", bg: "#FEF2F2", fg: "#DC2626" };
          return { i: "🩺", bg: "#F8FAFC", fg: "#475569" };
        })(name);

        const lvlClass = (n) => {
          n = Math.min(10, Math.max(1, Number(n || 0)));
          if (n >= 9) return "bg-red-600 text-white";
          if (n >= 7) return "bg-orange-500 text-white";
          if (n >= 5) return "bg-amber-400 text-black";
          if (n >= 3) return "bg-emerald-500 text-white";
          return "bg-slate-300 text-slate-800";
        };

        ul.innerHTML += `
      <li>
        <article class="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-all" data-id="${
          s.id
        }">
          <header class="flex items-start gap-3">
            <span class="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-base" style="background:${bg};color:${fg}">${icon}</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-semibold text-gray-800 truncate">${name}</h4>
                <span class="px-2 py-0.5 rounded-full text-[11px] ${lvlClass(
                  lvl
                )}">dor ${lvl || 0}/10</span>
                <time class="ml-auto text-xs text-gray-500 whitespace-nowrap" datetime="${datetimeAttr}">
                  ${hora ? `${data} · ${hora}` : `${data}`}
                </time>
              </div>
              <p class="text-sm text-gray-600 mt-1 line-clamp-2">${
                s.notes || "—"
              }</p>
            </div>
            <div class="relative">
              <button class="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                      data-menu-btn aria-haspopup="true" aria-expanded="false" aria-controls="sym-menu-${
                        s.id
                      }" title="Mais ações">
                <i class="fa-solid fa-ellipsis-vertical"></i>
              </button>
              <div id="sym-menu-${
                s.id
              }" class="sym-menu hidden absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1" role="menu">
                <button class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600" data-act="delete">
                  <i class="fas fa-trash"></i> Excluir
                </button>
              </div>
            </div>
          </header>
        </article>
      </li>`;
      }
    }

    // contador total (não só os visíveis)
    if (countEl)
      countEl.textContent = `${items.length} registro${
        items.length === 1 ? "" : "s"
      }`;
  } catch (e) {
    console.error(e);
    ul.innerHTML = `<li class="text-sm text-rose-600">Erro ao carregar registros.</li>`;
  }
}

window.hooks = window.hooks || {};
const prevHome = window.hooks["/home"];
window.hooks["/home"] = function () {
  if (typeof prevHome === "function") prevHome();
  renderRecent();
};

/* ===== toggle do menu e ações (uma vez só) ===== */
if (!window.__bindSymMenus) {
  window.__bindSymMenus = true;

  function closeAllSymMenus() {
    document
      .querySelectorAll(".sym-menu")
      .forEach((m) => m.classList.add("hidden"));
    document
      .querySelectorAll("[data-menu-btn]")
      .forEach((b) => b.setAttribute("aria-expanded", "false"));
  }

  document.addEventListener("click", async (e) => {
    // abrir/fechar ao clicar no ⋮
    const btn = e.target.closest("[data-menu-btn]");
    if (btn) {
      e.preventDefault();
      const menu = document.getElementById(btn.getAttribute("aria-controls"));
      const willOpen = menu?.classList.contains("hidden");
      closeAllSymMenus();
      if (menu && willOpen) {
        menu.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
        setTimeout(() => menu.querySelector('[role="menuitem"]')?.focus(), 0);
      }
      return;
    }

    // ação Editar/Excluir
    const actBtn = e.target.closest("[data-act]");
    if (actBtn) {
      const card = actBtn.closest("[data-id]");
      const id = Number(card?.dataset?.id);
      if (!id) return;

      closeAllSymMenus();

      if (actBtn.dataset.act === "delete") {
        const svc = window.UserSymptoms || {};
        if (typeof svc.remove !== "function") {
          alert("Excluir indisponível nesta versão do app.");
          return;
        }

        const ok = await ConfirmDialog.ask({
          titleText: "Excluir registro",
          message: "Essa ação é permanente e não poderá ser desfeita.",
        });
        if (!ok) return;

        try {
          await svc.remove(id);
          await renderRecent();
        } catch (err) {
          console.error(err);
          alert("Falha ao excluir. Tente novamente.");
        }
        return;
      }

      if (actBtn.dataset.act === "edit") {
        const svc = window.UserSymptoms || {};
        try {
          const res = await svc.list();
          const list = Array.isArray(res) ? res : res?.items || [];
          const item = list.find((x) => x.id === id);
          if (!item) return alert("Registro não encontrado.");
          sessionStorage.setItem("aurora_edit_symptom", JSON.stringify(item));
          location.hash = "#/symptom";
        } catch (err) {
          console.error(err);
          alert("Falha ao abrir para edição.");
        }
        return;
      }
    }

    // clique fora fecha
    if (!e.target.closest(".sym-actions")) {
      closeAllSymMenus();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllSymMenus();
  });
}

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

  let resolver = null;
  let lastFocus = null;

  function disableScroll(on) {
    document.documentElement.style.overflow = on ? "hidden" : "";
  }

  function trapFocus(e) {
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
      close(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      close(true);
    }
  }

  function open({
    titleText = "Confirmar ação",
    message = "Tem certeza?",
  } = {}) {
    if (titleEl) titleEl.textContent = titleText;
    if (descEl) descEl.textContent = message;

    lastFocus = document.activeElement;

    root.classList.remove("hidden");
    root.setAttribute("aria-hidden", "false");
    disableScroll(true);

    requestAnimationFrame(() => {});

    document.addEventListener("keydown", trapFocus);
    document.addEventListener("keydown", onKey);

    setTimeout(() => btnOk?.focus(), 10);

    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function close(result) {
    document.removeEventListener("keydown", trapFocus);
    document.removeEventListener("keydown", onKey);

    root.classList.add("hidden");
    root.setAttribute("aria-hidden", "true");
    disableScroll(false);

    if (lastFocus && lastFocus.focus) setTimeout(() => lastFocus.focus(), 0);

    if (resolver) {
      resolver(!!result);
      resolver = null;
    }
  }

  btnOk?.addEventListener("click", () => close(true));
  btnCancel?.addEventListener("click", () => close(false));
  root.addEventListener("click", (e) => {
    const isBackdrop =
      e.target === root ||
      e.target.matches("#confirm-modal > .absolute.inset-0.bg-black\\/50");
    if (isBackdrop) close(false);
  });

  window.ConfirmDialog = { ask: open, close, __installed: true };
})();
