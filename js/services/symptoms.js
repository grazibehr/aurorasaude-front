(function () {
  const API = "http://127.0.0.1:5000/symptoms";

  async function fetchSymptoms() {
    const resp = await fetch(`${API}/`, { credentials: "omit" });
    if (!resp.ok) throw new Error("Falha ao carregar sintomas");
    const raw = await resp.json();

    // normaliza formatos possíveis
    const arr = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.root)
      ? raw.root
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    // garante shape [{id, name}]
    return arr.map((x) => ({
      id: x.id ?? x.value ?? x.slug ?? String(x),
      name: x.name ?? x.type ?? x.label ?? String(x),
    }));
  }

  // expõe no global com o nome que teu código espera
  window.Symptoms = {
    ...(window.Symptoms || {}),
    listTypes: fetchSymptoms,
  };
})();
