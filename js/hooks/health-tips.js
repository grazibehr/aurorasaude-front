(function () {
  function renderHealthTips(entries, root = document) {
    const cont = root.querySelector("#health-tips-container");
    if (!cont) return;
    cont.innerHTML = "";

    const tips = (window.healthTipRules || [])
      .map((rule) => {
        try {
          return rule(entries);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.priority - b.priority);

    if (!tips.length) {
      cont.innerHTML = `
        <p class="text-sm text-gray-500">
          Nenhum padrão detectado até agora. Continue registrando sintomas!
        </p>`;
      return;
    }

    for (const t of tips) {
      cont.innerHTML += `
        <div class="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
          <p class="text-sm font-semibold text-gray-800 flex items-center mb-1">
            <i data-lucide="${t.icon}" class="w-5 h-5 text-${t.tone}-500 mr-2" aria-hidden="true"></i>
            ${t.title}
          </p>
          <p class="text-xs text-gray-600">${t.body}</p>
        </div>`;
    }

    if (window.lucide?.createIcons) lucide.createIcons();
  }

  window.hooks = window.hooks || {};
  window.hooks.updateHealthTips = renderHealthTips;
})();

(function () {
  const DAY = 86400e3;
  const parseDate = (s) => Date.parse(s) || 0;
  const uniqDays = (entries) =>
    new Set(entries.map((e) => String(e.date || "").slice(0, 10))).size;
  const lastNDays = (entries, n) => {
    const now = Date.now();
    const floor = now - n * DAY;
    return entries.filter((e) => {
      const t = parseDate(e.date);
      return t && t >= floor && t <= now;
    });
  };
  const painOf = (e) => Number(e.pain_level ?? e.intensity ?? e.level ?? 0);
  const avg = (arr) =>
    arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
  const tip = ({
    priority = 3,
    icon = "info",
    tone = "blue",
    title,
    body,
  }) => ({ priority, icon, tone, title, body });

  function dorAltaSemana(entries) {
    const w = lastNDays(entries, 7);
    const hi = w.filter((e) => painOf(e) >= 7).length;
    if (hi >= 3) {
      return tip({
        priority: 1,
        icon: "alert-triangle",
        tone: "red",
        title: "Dor Alta Recorrente",
        body: `Dor ≥ 7/10 registrada em <strong>${hi} dia${
          hi > 1 ? "s" : ""
        }</strong> nos últimos 7. Se mantiver, considere orientação médica.`,
      });
    }
    return null;
  }

  function streakDor(entries) {
    const last30 = lastNDays(entries, 30).sort(
      (a, b) => parseDate(a.date) - parseDate(b.date)
    );
    if (!last30.length) return null;
    let max = 0,
      cur = 0,
      prevDay = null;
    for (const e of last30) {
      const t = parseDate(e.date);
      const isQual = painOf(e) >= 5;
      if (!isQual) {
        cur = 0;
        prevDay = t;
        continue;
      }
      if (prevDay && t - prevDay <= 36 * 3600e3) cur += 1;
      else cur = 1;
      max = Math.max(max, cur);
      prevDay = t;
    }
    if (max >= 3) {
      return tip({
        priority: 2,
        icon: "flame",
        tone: "amber",
        title: "Sintoma Persistente",
        body: `Dor ≥ 5/10 por <strong>${max} dia${
          max > 1 ? "s" : ""
        } consecutivo${
          max > 1 ? "s" : ""
        }</strong> no último mês. Observe gatilhos e considere descanso/analgésico conforme orientação médica.`,
      });
    }
    return null;
  }

  function tendenciaPiora(entries) {
    const last14 = lastNDays(entries, 14).sort(
      (a, b) => parseDate(a.date) - parseDate(b.date)
    );
    if (last14.length < 6) return null;
    const last7 = last14.slice(-7);
    const prev7 = last14.slice(-14, -7);
    if (!prev7.length || !last7.length) return null;

    const m1 = avg(prev7.map(painOf));
    const m2 = avg(last7.map(painOf));
    if (m2 - m1 >= 1) {
      return tip({
        priority: 2,
        icon: "trending-up",
        tone: "red",
        title: "Tendência de Piora",
        body: `Média de dor subiu de <strong>${m1.toFixed(
          1
        )}</strong> para <strong>${m2.toFixed(1)}</strong> nos últimos 7 dias.`,
      });
    }
    return null;
  }

  function piorDiaSemana(entries) {
    const win = lastNDays(entries, 30);
    if (win.length < 8) return null;
    const byDow = Array.from({ length: 7 }, () => []);
    for (const e of win) {
      const dow = new Date(parseDate(e.date)).getDay(); // 0-dom .. 6-sáb
      byDow[dow].push(painOf(e));
    }
    const mean = avg(win.map(painOf));
    let worst = null,
      worstAvg = -1,
      worstIdx = -1;
    byDow.forEach((arr, i) => {
      if (!arr.length) return;
      const m = avg(arr);
      if (m > worstAvg) {
        worstAvg = m;
        worstIdx = i;
        worst = arr;
      }
    });
    if (worstAvg >= mean + 1) {
      const nomes = [
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
      ];
      return tip({
        priority: 3,
        icon: "calendar",
        tone: "amber",
        title: "Piora por Dia da Semana",
        body: `Média de dor nas <strong>${
          nomes[worstIdx]
        }</strong>s: <strong>${worstAvg.toFixed(
          1
        )}</strong>, acima da média geral (<strong>${mean.toFixed(
          1
        )}</strong>).`,
      });
    }
    return null;
  }

  function poucosRegistros(entries) {
    const m = lastNDays(entries, 30);
    const u = uniqDays(m);
    if (u < 8) {
      return tip({
        priority: 4,
        icon: "history",
        tone: "green",
        title: "Complete o Histórico",
        body: `Você tem <strong>${u}</strong> dias registrados no último mês. Quanto mais completo, melhores os padrões.`,
      });
    }
    return null;
  }

  function faltaNotas(entries) {
    const last10 = entries
      .slice() // copia
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, 10);
    if (!last10.length) return null;
    const comNota = last10.filter(
      (e) => (e.notes || "").trim().length >= 5
    ).length;
    const pct = Math.round((100 * comNota) / last10.length);
    if (pct < 30) {
      return tip({
        priority: 4,
        icon: "pencil",
        tone: "blue",
        title: "Anotações Ajudam",
        body: `Somente <strong>${pct}%</strong> dos últimos ${last10.length} registros têm observações. Anotar detalhes ajuda a achar gatilhos.`,
      });
    }
    return null;
  }

  window.healthTipRules = [
    dorAltaSemana,
    streakDor,
    tendenciaPiora,
    piorDiaSemana,
    poucosRegistros,
    faltaNotas,
  ];

  if (window.hooks?.updateHealthTips) {
    const oldUpdate = window.hooks.updateHealthTips;
    window.hooks.updateHealthTips = function (entries, root = document) {
      return oldUpdate(entries, root);
    };
  }
})();
