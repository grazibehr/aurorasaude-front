// js/hooks/analytics.js
(function () {
  window.hooks = window.hooks || {};

  const DAY = 86400e3;
  const toTs = (d) => {
    if (d == null) return -Infinity;
    if (typeof d === "number") return d > 1e12 ? d : d * 1000;
    const t = Date.parse(d);
    return Number.isNaN(t) ? -Infinity : t;
  };
  const fmtBRDate = (s) =>
    new Date(toTs(s)).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });

  function iconMap(name = "") {
    const s = String(name).toLowerCase();
    if (s.includes("náusea") || s.includes("enjoo"))
      return { icon: "stethoscope", color: "text-emerald-600" };
    if (s.includes("febre"))
      return { icon: "thermometer", color: "text-amber-600" };
    if (s.includes("tosse")) return { icon: "wind", color: "text-sky-600" };
    if (s.includes("calafrio"))
      return { icon: "cloud-drizzle", color: "text-indigo-600" };
    if (s.includes("tontura"))
      return { icon: "activity", color: "text-violet-600" };
    if (s.includes("dor")) return { icon: "activity", color: "text-rose-600" };
    return { icon: "heart-pulse", color: "text-gray-600" };
  }
  function badgeClasses(n) {
    if (n >= 8) return "bg-rose-100 text-rose-700";
    if (n >= 5) return "bg-amber-100 text-amber-700";
    if (n >= 3) return "bg-emerald-100 text-emerald-700";
    return "bg-gray-100 text-gray-700";
  }

  // --- Render principal ---
  function renderAnalytics(entriesRaw, appRoot) {
    const root = appRoot.querySelector("section");
    const listEl = root.querySelector("#hist-list");
    const emptyEl = root.querySelector("#hist-empty");
    const countEl = root.querySelector("#hist-count");
    const rangesEl = root.querySelector("#hist-ranges");
    const sortSel = root.querySelector("#hist-sort");
    const itemTpl =
      root.querySelector('template[data-role="hist-item"]') ||
      appRoot.querySelector('template[data-role="hist-item"]');

    if (!root || !listEl || !itemTpl) {
      console.warn("[analytics] elementos essenciais não encontrados");
      return;
    }

    // Normaliza fonte: pode vir array direto ou wrapper { items, total }
    let base = [];
    if (Array.isArray(entriesRaw)) base = entriesRaw;
    else if (entriesRaw && Array.isArray(entriesRaw.items))
      base = entriesRaw.items;

    // Resolve nome de sintoma via dicionário (se existir)
    const dict =
      window.Symptoms?.dictionaryCache || window.Symptoms?.dictionary;

    const entries = base.map((e, i) => {
      const pain = Number(e.pain ?? e.pain_level ?? 0) || 0;
      const name =
        e.symptom ??
        e.symptom_name ??
        (dict && typeof dict === "object" ? dict[e.symptom_id] : null) ??
        "Sintoma";
      return {
        id: e.id ?? i,
        symptom: name,
        pain,
        notes:
          e.notes ??
          e.description ??
          e.desc ??
          e.observacao ??
          e.observação ??
          "",
        notes: e.notes ?? "",
        date: e.date ?? e.createdAt ?? new Date().toISOString(),
      };
    });

    const activeBtn = rangesEl?.querySelector('button[aria-pressed="true"]');
    const state = {
      range: Number(activeBtn?.dataset.range || 0),
      sort: sortSel?.value || "date_desc",
    };

    function filterByRange(arr, days) {
      if (!days) return arr.slice();
      const min = Date.now() - days * DAY;
      return arr.filter((e) => toTs(e.date) >= min);
    }
    function sortItems(arr, mode) {
      const a = arr.slice();
      if (mode === "date_asc") a.sort((x, y) => toTs(x.date) - toTs(y.date));
      if (mode === "date_desc") a.sort((x, y) => toTs(y.date) - toTs(x.date));
      if (mode === "pain_asc") a.sort((x, y) => (x.pain ?? 0) - (y.pain ?? 0));
      if (mode === "pain_desc") a.sort((x, y) => (y.pain ?? 0) - (x.pain ?? 0));
      return a;
    }

    function paint(list) {
      const frag = document.createDocumentFragment();
      listEl.innerHTML = "";

      for (const e of list) {
        const baseLi = itemTpl.content.firstElementChild;
        if (!baseLi) continue;
        const li = baseLi.cloneNode(true);

        li.querySelector(".hist-title").textContent = e.symptom || "Sintoma";

        const { icon, color } = iconMap(e.symptom || "");
        const iconEl = li.querySelector(".hist-icon");
        if (iconEl) {
          iconEl.setAttribute("data-lucide", icon);
          iconEl.className = `hist-icon w-5 h-5 ${color} mr-3`;
        }

        const n = Math.max(0, Math.min(10, Number(e.pain ?? 0)));
        const badge = li.querySelector(".hist-badge");
        if (badge) {
          badge.textContent = `Intensidade ${n}/10`;
          badge.className = `hist-badge ml-3 text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClasses(
            n
          )}`;
        }
        const notesEl = li.querySelector(".hist-notes");

        if (notesEl) {
          const text = String(e.notes || "").trim();
          if (text) {
            notesEl.textContent = text;
            notesEl.title = text; // tooltip com o texto completo
            notesEl.classList.remove("hidden");
          } else {
            notesEl.classList.add("hidden");
          }
        }

        const t = li.querySelector(".hist-date");
        if (t) t.textContent = fmtBRDate(e.date);

        const btn = li.querySelector("[data-menu-btn]");
        const menu = li.querySelector(".hist-menu");
        if (btn && menu) {
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const wasHidden = menu.classList.contains("hidden");
            document
              .querySelectorAll(".hist-menu")
              .forEach((m) => m.classList.add("hidden"));
            if (wasHidden) menu.classList.remove("hidden");
            btn.setAttribute("aria-expanded", String(wasHidden));
          });
          document.addEventListener("click", () =>
            menu.classList.add("hidden")
          );
          menu.querySelectorAll("[data-act]").forEach((b) => {
            b.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const act = b.getAttribute("data-act");
              // TODO: acionar ações reais
              // console.log('acao', act, e.id);
              menu.classList.add("hidden");
            });
          });
        }

        frag.appendChild(li);
      }

      listEl.appendChild(frag);
      window.lucide?.createIcons?.();
    }

    function applyRender() {
      const filtered = sortItems(
        filterByRange(entries, state.range),
        state.sort
      );
      countEl.textContent = `${filtered.length} registro${
        filtered.length === 1 ? "" : "s"
      }`;
      emptyEl.classList.toggle("hidden", filtered.length > 0);
      paint(filtered);
    }

    // Eventos
    rangesEl.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-range]");
      if (!btn) return;
      rangesEl.querySelectorAll("button").forEach((b) => {
        b.classList.remove("bg-white", "shadow-sm");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("bg-white", "shadow-sm");
      btn.setAttribute("aria-pressed", "true");
      state.range = Number(btn.dataset.range || 0);
      applyRender();
    });

    sortSel.addEventListener("change", () => {
      state.sort = sortSel.value;
      applyRender();
    });

    // Primeira pintura
    applyRender();
  }

  // Hook chamado pelo router depois que o template foi clonado em #app
  window.hooks.analytics = async function () {
    const app = document.getElementById("app");

    let res;
    try {
      res = await window.UserSymptoms?.list?.(); // pode retornar array ou {items,total}
      // opcional: cache dicionário
      if (window.Symptoms?.dictionary && !window.Symptoms.dictionaryCache) {
        const d = await window.Symptoms.dictionary();
        if (d && typeof d === "object") window.Symptoms.dictionaryCache = d;
      }
    } catch (err) {
      console.warn("[analytics] erro ao carregar sintomas:", err);
      res = { items: [] };
    }

    renderAnalytics(res || { items: [] }, app);
    window.lucide?.createIcons?.();
  };
})();
