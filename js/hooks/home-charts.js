// js/hooks/home-charts.js
(function () {
  let painChart = null;
  let symptomChart = null;

  // ---- Helpers -------------------------------------------------------------
  function lastNDays(records, days = 30) {
    const min = Date.now() - days * 86400e3;
    return records.filter((r) => {
      const t = typeof r.date === "string" ? Date.parse(r.date) : +r.date;
      return !Number.isNaN(t) && t >= min;
    });
  }

  function painDistribution(records) {
    const bins = { leve: 0, moderada: 0, intensa: 0, severa: 0 };
    records.forEach((r) => {
      const n = Number(r.level) || 0;
      if (n >= 1 && n <= 3) bins.leve++;
      else if (n <= 6) bins.moderada++;
      else if (n <= 8) bins.intensa++;
      else if (n <= 10) bins.severa++;
    });
    return {
      labels: [
        "Leve (1–3)",
        "Moderada (4–6)",
        "Intensa (7–8)",
        "Severa (9–10)",
      ],
      values: [bins.leve, bins.moderada, bins.intensa, bins.severa],
    };
  }

  function topSymptoms(records, top = 5) {
    const map = new Map();
    records.forEach((r) => {
      const key = (r.label || r.type || "Outro").toString();
      map.set(key, (map.get(key) || 0) + 1);
    });
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
    return { labels: sorted.map((x) => x[0]), values: sorted.map((x) => x[1]) };
  }

  function buildLegend(ulId, chart) {
    const ul = document.getElementById(ulId);
    if (!ul || !chart) return;
    const items = chart.legend?.legendItems || [];
    ul.innerHTML = items
      .map(
        (it) => `
        <li class="flex items-center gap-2">
          <span class="inline-block w-2.5 h-2.5 rounded" style="background:${it.fillStyle}"></span>
          <span>${it.text}</span>
        </li>`
      )
      .join("");
  }

  function waitForChartJS() {
    return new Promise((resolve) => {
      if (window.Chart) return resolve();
      const iv = setInterval(() => {
        if (window.Chart) {
          clearInterval(iv);
          resolve();
        }
      }, 20);
    });
  }

  async function fetchUserRecords(days = 30) {
    // Busca dos serviços reais
    const svc = window.UserSymptoms || {};
    try {
      if (typeof svc.listWithMeta === "function") {
        const res = await svc.listWithMeta({ lastDays: days }); // se teu backend aceitar esse filtro
        const items = Array.isArray(res?.items) ? res.items : [];
        return items.map((x) => ({
          type: x.symptom || x.symptom_type || x.type,
          label: x.symptom_name || x.label || x.symptom || "Outro",
          level: x.pain_level ?? x.intensity ?? x.level ?? 0,
          date: x.date,
        }));
      }
      if (typeof svc.list === "function") {
        const arr = await svc.list();
        const items = Array.isArray(arr) ? arr : arr?.items || [];
        return items.map((x) => ({
          type: x.symptom || x.symptom_type || x.type,
          label: x.symptom_name || x.label || x.symptom || "Outro",
          level: x.pain_level ?? x.intensity ?? x.level ?? 0,
          date: x.date,
        }));
      }
    } catch (e) {
      // 401/erro da API -> retorna vazio, sem quebrar a tela
      console.warn("[HomeCharts] Falha ao buscar registros:", e);
    }
    return []; // sem dados
  }

  function setMonthTotal(count) {
    const el = document.getElementById("month-total");
    if (el) el.textContent = String(count || 0);
  }

  // ---- Init ---------------------------------------------------------------
  async function init() {
    await waitForChartJS();

    const painEl = document.getElementById("chartPain");
    const symptomEl = document.getElementById("chartSymptomTop");
    if (!painEl && !symptomEl) return; // não é a Home

    // destrói instâncias anteriores
    painChart?.destroy();
    painChart = null;
    symptomChart?.destroy();
    symptomChart = null;

    // Carrega dados do usuário e filtra últimos 30 dias
    const all = await fetchUserRecords(30);
    const data30 = lastNDays(all, 30);

    // Atualiza "Sintomas em setembro" (ou últimos 30 dias) só pra dar um up
    setMonthTotal(data30.length);

    // Doughnut – dor
    if (painEl) {
      const dist = painDistribution(data30);
      painChart = new Chart(painEl.getContext("2d"), {
        type: "doughnut",
        data: { labels: dist.labels, datasets: [{ data: dist.values }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          cutout: "60%",
        },
      });
      queueMicrotask(() => buildLegend("legendPain", painChart));
    }

    // Barras – top sintomas
    if (symptomEl) {
      const top5 = topSymptoms(data30, 5);
      symptomChart = new Chart(symptomEl.getContext("2d"), {
        type: "bar",
        data: {
          labels: top5.labels,
          datasets: [{ label: "Ocorrências", data: top5.values }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      });
    }

    // Ajuste de resize (aside)
    const aside =
      painEl?.closest("aside") ||
      painEl?.parentElement ||
      symptomEl?.closest("aside") ||
      symptomEl?.parentElement;
    if (aside && "ResizeObserver" in window) {
      const ro = new ResizeObserver(() => {
        painChart?.resize();
        symptomChart?.resize();
      });
      ro.observe(aside);
    }
  }

  window.HomeCharts = { init };
})();
