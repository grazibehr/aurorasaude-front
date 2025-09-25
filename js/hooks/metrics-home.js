(function () {
  const $ = (id) => document.getElementById(id);

  function setDD(id, value, fallback = "0") {
    const el = $(id);
    if (el) el.textContent = value ?? fallback;
  }

  function paintPainAvg(text) {
    // “Leve|Moderada|Intensa” → pinta com a paleta
    const el = $("met-pain-avg");
    if (!el) return;
    el.classList.remove("text-emerald-600", "text-amber-600", "text-rose-600");
    if (text === "Leve") el.classList.add("text-emerald-600");
    else if (text === "Moderada") el.classList.add("text-amber-600");
    else if (text === "Intensa") el.classList.add("text-rose-600");
  }

  async function loadMetrics() {
    try {
      // loading state opcional
      setDD("met-today", "…");
      setDD("met-week", "…");
      setDD("met-total", "…");
      setDD("met-pain-avg", "…");

      const m = await window.Symptoms.metrics();
      setDD("met-today", m.today ?? 0);
      setDD("met-week", m.week ?? 0);
      setDD("met-total", m.total ?? 0);
      setDD("met-pain-avg", m.pain_avg ?? "-");
      paintPainAvg(m.pain_avg);
    } catch (e) {
      console.error("Metrics error:", e);
      setDD("met-today", "0");
      setDD("met-week", "0");
      setDD("met-total", "0");
      setDD("met-pain-avg", "-");
    }
  }

  // Carrega quando:
  document.addEventListener("DOMContentLoaded", loadMetrics);
  // Recarrega após login/logout:
  document.addEventListener("auth:change", loadMetrics);
})();
