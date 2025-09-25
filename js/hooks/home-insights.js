(function () {
  // ---------- DOM helpers ----------
  const $ = (id) => document.getElementById(id);
  const DAY = 86400e3;
  const avg = (arr) =>
    arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
  const parseDate = (s) => {
    if (s == null) return null;
    if (typeof s === "number") return s > 1e12 ? s : s * 1000; // ms ou s
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
  };

  // ---------- Fetch (pagina <=100) ----------
  async function fetchUserItems() {
    const svc = window.UserSymptoms || {};
    const PAGE_SIZE = 100;
    try {
      if (typeof svc.listWithMeta === "function") {
        let page = 1,
          all = [];
        while (true) {
          const res = await svc.listWithMeta({ page, page_size: PAGE_SIZE });
          const chunk = Array.isArray(res?.items) ? res.items : [];
          all.push(...chunk);
          if (chunk.length < PAGE_SIZE || !res?.next_page) break;
          page += 1;
        }
        return all;
      }
      if (typeof svc.list === "function") {
        const data = await svc.list();
        return Array.isArray(data) ? data : data?.items || [];
      }
    } catch (e) {
      console.warn("[home-insights] fetchUserItems erro:", e);
    }
    return [];
  }

  // ---------- Cálculos ----------
  function sliceWindow(items, startMs, endMs) {
    return items.filter((x) => {
      const t = parseDate(x.date);
      return t !== null && t >= startMs && t < endMs;
    });
  }

  function computeInsights(items, rangeDays) {
    const norm = items.map((x) => ({
      name: x.symptom_name || x.label || x.symptom || x.type || "Outro",
      level: Number(x.pain_level ?? x.intensity ?? x.level ?? 0),
      date: x.date,
    }));

    const now = Date.now();
    const start = now - rangeDays * DAY;
    const prevStart = now - 2 * rangeDays * DAY;
    const prevEnd = now - rangeDays * DAY;

    const cur = sliceWindow(norm, start, now);
    const prev = sliceWindow(norm, prevStart, prevEnd);

    const total = cur.length;
    const totalPrev = prev.length;
    const delta = totalPrev
      ? (total - totalPrev) / totalPrev
      : total > 0
      ? 1
      : 0;

    const painAvg = avg(
      cur.map((x) => x.level).filter((n) => Number.isFinite(n) && n > 0)
    );

    const count = new Map();
    cur.forEach((x) => count.set(x.name, (count.get(x.name) || 0) + 1));
    const [topName, topCount] = [...count.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0] || ["—", 0];

    return { total, totalPrev, delta, painAvg, topName, topCount };
  }

  // ---------- Pintura ----------
  function paintInsights(ins, rangeDays) {
    const pct = (n) => `${(n * 100).toFixed(0)}%`;

    // título/label
    const title = $("insights-title");
    if (title) title.textContent = `Insights últimos ${rangeDays} dias`;

    // KPIs
    const totalEl = $("ins-kpi-total");
    if (totalEl) totalEl.textContent = String(ins.total);

    const deltaEl = $("ins-kpi-total-delta");
    if (deltaEl) {
      const up = ins.delta >= 0;
      deltaEl.className = `badge ${up ? "badge-up" : "badge-down"}`;
      deltaEl.innerHTML =
        (up
          ? '<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>'
          : '<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>') +
        " " +
        (ins.delta >= 0 ? "+" : "") +
        pct(ins.delta);
    }

    const avgEl = $("ins-kpi-avg");
    if (avgEl) avgEl.textContent = ins.painAvg ? ins.painAvg.toFixed(1) : "—";

    const tag = $("ins-kpi-avg-tag");
    if (tag) {
      const label =
        ins.painAvg >= 7 ? "alta" : ins.painAvg >= 4 ? "moderada" : "baixa";
      tag.textContent = label;
      tag.style.background = "var(--muted)";
      tag.style.color = "var(--foreground)";
    }

    const topEl = $("ins-kpi-top");
    if (topEl) topEl.textContent = ins.topName;
    const topCt = $("ins-kpi-top-count");
    if (topCt)
      topCt.textContent = ins.topCount
        ? `${ins.topCount} ocorrência${ins.topCount > 1 ? "s" : ""}`
        : "— ocorrências";

    // Frases
    const f1 = $("ins-1");
    if (f1)
      f1.innerHTML = `Você registrou <strong>${ins.total}</strong> sintoma${
        ins.total !== 1 ? "s" : ""
      } nos últimos ${rangeDays} dias.`;

    const f2 = $("ins-2");
    if (f2) {
      const label =
        ins.painAvg >= 7 ? "alta" : ins.painAvg >= 4 ? "moderada" : "baixa";
      f2.innerHTML = `Sua <strong>dor média</strong> está <strong>${label}</strong>.`;
    }

    const f3 = $("ins-3");
    if (f3)
      f3.innerHTML = `O sintoma mais frequente foi <strong>${ins.topName}</strong>.`;
  }

  function setActiveRangeButton(rangeDays) {
    document.querySelectorAll("button[data-range]").forEach((btn) => {
      const isActive = Number(btn.getAttribute("data-range")) === rangeDays;
      btn.classList.toggle("btn-primary", isActive);
      btn.classList.toggle("btn-plain", !isActive);
    });
  }

  // ---------- Orquestra ----------
  let CACHE = { items: null, ready: false };
  let currentRange = 30;

  async function ensureData() {
    if (CACHE.ready && Array.isArray(CACHE.items)) return CACHE.items;
    const items = await fetchUserItems();
    CACHE = { items, ready: true };
    return items;
  }

  async function render(rangeDays) {
    currentRange = rangeDays;
    setActiveRangeButton(rangeDays);
    const items = await ensureData();
    const ins = computeInsights(items, rangeDays);
    paintInsights(ins, rangeDays);
  }

  async function init() {
    // Só roda se existir o título (evita executar em páginas sem o card)
    if (!$("insights-title")) return;

    // Listeners dos botões de range
    document.querySelectorAll("button[data-range]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        const days = Number(ev.currentTarget.getAttribute("data-range")) || 30;
        render(days);
      });
    });

    // Estado inicial = 30d
    await render(30);
  }

  window.HomeInsights = { init, render }; // expõe manual se quiser trocar via console
  document.addEventListener("DOMContentLoaded", init);
})();

(function () {
  const toInt = (v, d = 30) => (Number.isFinite(Number(v)) ? Number(v) : d);

  // troca visual só no header do grupo clicado
  function setActiveInHeader(btn, activeDays) {
    const header = btn.closest("header") || document;
    header.querySelectorAll("button[data-range]").forEach((b) => {
      const isActive = toInt(b.dataset.range) === activeDays;
      b.classList.toggle("btn-primary", isActive);
      b.classList.toggle("btn-plain", !isActive);
    });
  }

  document.addEventListener(
    "click",
    (ev) => {
      const btn = ev.target.closest("button[data-range]");
      if (!btn) return;

      const days = toInt(btn.dataset.range);
      console.debug("[home-insights] click range:", days, btn);

      try {
        setActiveInHeader(btn, days);
        if (window.HomeInsights?.render) {
          window.HomeInsights.render(days);
        } else {
          console.warn(
            "[home-insights] HomeInsights.render não encontrado. Confere a ordem dos scripts."
          );
        }
      } catch (e) {
        console.error("[home-insights] erro ao trocar range:", e);
      }
    },
    { passive: true }
  );

  // Garante estado inicial mesmo se o init não rodar por timing
  if (window.HomeInsights?.render) {
    window.HomeInsights.render(30);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      window.HomeInsights?.render?.(30);
    });
  }
})();
