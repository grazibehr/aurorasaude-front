(function () {
  const $ = (id) => document.getElementById(id);

  const DIA = 86400e3;
  const media = (arr) =>
    arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;

  const parseData = (s) => {
    if (s == null) return null;
    if (typeof s === "number") return s > 1e12 ? s : s * 1000;
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
  };

  function lucideIcons(name = "") {
    const s = String(name).toLowerCase();
    if (s.includes("febre"))
      return { icon: "thermometer", color: "text-amber-600" };
    if (s.includes("fadiga")) return { icon: "bed", color: "text-rose-600" };
    if (s.includes("náusea") || s.includes("enjoo"))
      return { icon: "stethoscope", color: "text-emerald-600" };
    if (s.includes("calafrio"))
      return { icon: "cloud-lightning", color: "text-indigo-600" };
    if (s.includes("tosse")) return { icon: "wind", color: "text-slate-600" };
    if (s.includes("cefaleia") || s.includes("cabeça"))
      return { icon: "brain", color: "text-violet-600" };
    return { icon: "flame", color: "text-yellow-600" };
  }

  async function obtemSintomasUsuario() {
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
      console.warn("[home-insights] erro ao obter sintomas do usuário:", e);
    }
    return [];
  }

  function fatiarJanela(items, inicioMs, fimMs) {
    return items.filter((x) => {
      const t = parseData(x.date);
      return t !== null && t >= inicioMs && t < fimMs;
    });
  }

  function computarInsights(items, diasJanela) {
    const norm = items.map((x) => ({
      name: x.symptom_name || x.label || x.symptom || x.type || "Outro",
      level: Number(x.pain_level ?? x.intensity ?? x.level ?? 0),
      date: x.date,
    }));

    const agora = Date.now();
    const inicio = agora - diasJanela * DIA;
    const prevInicio = agora - 2 * diasJanela * DIA;
    const prevFim = agora - diasJanela * DIA;

    const atual = fatiarJanela(norm, inicio, agora);
    const anterior = fatiarJanela(norm, prevInicio, prevFim);

    const total = atual.length;
    const totalPrev = anterior.length;
    const delta = totalPrev
      ? (total - totalPrev) / totalPrev
      : total > 0
      ? 1
      : 0;

    const dorMedia = media(
      atual.map((x) => x.level).filter((n) => Number.isFinite(n) && n > 0)
    );

    const contagem = new Map();
    atual.forEach((x) => contagem.set(x.name, (contagem.get(x.name) || 0) + 1));
    const [topName, topCount] = [...contagem.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0] || ["—", 0];

    return { total, totalPrev, delta, painAvg: dorMedia, topName, topCount };
  }

  function renderizarRosquinhaDor(container, valor, max = 10) {
    const r = 36;
    const C = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(valor || 0, max));
    const pct = v / max;

    const ring = container.querySelector("[data-circ]");
    const t = container.querySelector("[data-value]");

    ring.setAttribute("stroke-dasharray", `${C} ${C}`);
    ring.setAttribute("stroke-dashoffset", `${(1 - pct) * C}`);
    t.textContent = v ? v.toFixed(1) : "—";

    const tag = document.getElementById("ins-kpi-avg-tag");
    const num = document.getElementById("ins-kpi-avg");
    if (num) num.textContent = v ? v.toFixed(1) : "—";

    let label = "Moderada";
    let stroke = "var(--primary)";
    if (v < 4) {
      label = "Baixa";
      stroke = "#10B981";
    } else if (v >= 7) {
      label = "Alta";
      stroke = "#EF4444";
    }

    ring.setAttribute("stroke", stroke);
    if (tag) tag.textContent = label;
  }

  function pintarInsights(ins, diasJanela) {
    const totalEl = $("ins-kpi-total");
    if (totalEl) totalEl.textContent = String(ins.total);

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

    const donut = $("avg-pain-donut");
    if (donut) renderizarRosquinhaDor(donut, ins.painAvg);

    const topKpi = $("ins-kpi-top");
    if (topKpi) topKpi.textContent = ins.topName || "—";

    const topIconWrap = $("ins-kpi-top-icon");
    if (topIconWrap) {
      const { icon, color } = lucideIcons(ins.topName || "");
      topIconWrap.innerHTML = `<i data-lucide="${icon}" class="w-6 h-6 ${color}"></i>`;
      if (window.lucide?.createIcons) lucide.createIcons();
    }

    const topCt = $("ins-kpi-top-count");
    if (topCt) {
      topCt.textContent = ins.topCount
        ? `${ins.topCount} ocorrência${ins.topCount > 1 ? "s" : ""}`
        : "— ocorrências";
    }

    const totalTextEl = $("ins-total");
    if (totalTextEl) totalTextEl.textContent = ins.total;

    const rangeEl = $("ins-range");
    if (rangeEl) rangeEl.textContent = diasJanela;

    const labelEl = $("ins-avg-label");
    if (labelEl)
      labelEl.textContent =
        ins.painAvg >= 7 ? "alta" : ins.painAvg >= 4 ? "moderada" : "baixa";

    const topEl = $("ins-top");
    if (topEl) topEl.textContent = ins.topName;
  }

  function definirBotaoRangeAtivo(diasJanela) {
    document.querySelectorAll("button[data-range]").forEach((btn) => {
      const ativo = Number(btn.getAttribute("data-range")) === diasJanela;
      btn.classList.toggle("btn-primary", ativo);
      btn.classList.toggle("btn-plain", !ativo);
    });
  }

  let CACHE = { items: null, ready: false };
  function invalidarCache() {
    CACHE = { items: null, ready: false };
  }

  async function garantirDados() {
    if (CACHE.ready && Array.isArray(CACHE.items)) return CACHE.items;
    const items = await obtemSintomasUsuario();
    CACHE = { items, ready: true };
    return items;
  }

  async function renderizar(diasJanela) {
    definirBotaoRangeAtivo(diasJanela);
    const items = await garantirDados();
    const ins = computarInsights(items, diasJanela);
    pintarInsights(ins, diasJanela);
  }

  let _iniciado = false;
  function iniciar() {
    if (_iniciado) return;
    if (!document.getElementById("insights-title")) return;
    _iniciado = true;

    document.addEventListener(
      "click",
      (ev) => {
        const btn = ev.target.closest("button[data-range]");
        if (!btn) return;
        const days = Number(btn.getAttribute("data-range")) || 30;
        renderizar(days);
      },
      { passive: true }
    );

    renderizar(30);
  }

  document.addEventListener("auth:change", () => {
    invalidarCache();
    requestAnimationFrame(() => {
      iniciar();
      renderizar(30);
    });
  });

  window.addEventListener("hashchange", () => {
    requestAnimationFrame(() => {
      iniciar();
      if (document.getElementById("insights-title")) renderizar(30);
    });
  });

  window.HomeInsights = {
    iniciar,
    renderizar,
    invalidar: invalidarCache,
    init: iniciar,
    render: renderizar,
    invalidate: invalidarCache,
  };

  document.addEventListener("DOMContentLoaded", iniciar);
})();
