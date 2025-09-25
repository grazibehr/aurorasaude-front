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

/* ===== datas ===== */
function parseDateSafe(dateStr) {
  // "YYYY-MM-DD" => data local, sem deslocar fuso
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

/* ===== render recente (ordenado) ===== */
async function renderRecent() {
  const ul = document.querySelector("#user-symptoms-list");
  const countEl = document.querySelector("#user-symptoms-count");
  if (!ul) return;

  ul.innerHTML = `<li class="text-sm text-gray-500">Carregando…</li>`;

  try {
    const svc = window.UserSymptoms || {};
    let items = [];
    let total = 0;

    if (typeof svc.listWithMeta === "function") {
      const res = await svc.listWithMeta({ limit: 5 });
      items = Array.isArray(res?.items) ? res.items : [];
      total = Number(res?.total ?? items.length);
    } else {
      const arr = await svc.list(); // fallback
      items = Array.isArray(arr) ? arr : [];
      total = items.length;
    }

    // ordena por data desc
    items.sort((a, b) => {
      const A = parseDateSafe(a?.date).date.getTime();
      const B = parseDateSafe(b?.date).date.getTime();
      return B - A;
    });

    items = items.slice(0, 5);

    ul.innerHTML = "";
    for (const s of items) {
      const { data, hora, datetimeAttr } = formatDateTimeBR(s.date);

      ul.innerHTML += `
        <li>
          <article class="card p-5 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-visible" data-id="${
            s.id
          }">
            <header class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-4">
                <span class="text-3xl leading-none text-indigo-500">
                  <i class="fas fa-heartbeat" aria-hidden="true"></i>
                </span>
                <div>
                  <h4 class="font-semibold text-lg text-gray-800">
                    ${s.symptom_name ?? "Sintoma"}
                  </h4>
                  <p class="mt-1">
                    <span class="badge badge--rose">
                      ${s.pain_level ?? 0}/10
                    </span>
                  </p>
                  <p class="flex items-center text-sm text-gray-500 mt-2">
                    <i class="fas ${
                      hora ? "fa-clock" : "fa-calendar"
                    } mr-2" aria-hidden="true"></i>
                    <time datetime="${datetimeAttr}">
                      ${hora ? `${data} · ${hora}` : `${data}`}
                    </time>
                  </p>
                </div>
              </div>

              <div class="sym-actions relative shrink-0">
                <button
                  class="h-10 w-10 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                  data-menu-btn
                  aria-haspopup="true"
                  aria-expanded="false"
                  aria-controls="sym-menu-${s.id}"
                  title="Mais ações"
                >
                  <!-- FA (se carregar) + fallback ⋮ -->
                  <i class="fa-solid fa-ellipsis-vertical fas fa-ellipsis-v" aria-hidden="true"></i>
                  <span class="sr-only">Mais ações</span>
                </button>

                <div
                  id="sym-menu-${s.id}"
                  class="sym-menu hidden absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1"
                  role="menu"
                >
                  <button class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                          data-act="delete" role="menuitem">
                    <i class="fas fa-trash" aria-hidden="true"></i>
                    Excluir
                  </button>
                </div>
              </div>
              <!-- /AÇÕES -->
            </header>
          </article>
        </li>`;
    }

    if (items.length === 0) {
      ul.innerHTML = `<li class="text-sm text-gray-500">Nenhum registro por enquanto.</li>`;
    }

    if (countEl) {
      countEl.textContent = `${total} registro${total === 1 ? "" : "s"}`;
    }
  } catch (e) {
    console.error(e);
    ul.innerHTML = `<li class="text-sm text-rose-600">Erro ao carregar registros.</li>`;
  }
}

/* ===== re-registra o hook do /home mantendo o anterior ===== */
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
          (card.closest("li") || card).remove();
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
