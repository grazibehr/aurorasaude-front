(function () {
  const API = "http://127.0.0.1:5000/sintomas";

  async function fetchSintomas() {
    const resp = await fetch(`${API}/lista`, { credentials: "omit" });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Falha ao carregar sintomas (${resp.status}) ${txt}`);
    }

    const raw = await resp.json();

    const arr = Array.isArray(raw?.items) ? raw.items : [];

    return arr.map((x) => ({
      id: x.id ?? x.value ?? x.slug ?? String(x),
      name: x.nome ?? x.name ?? x.tipo ?? x.type ?? x.label ?? String(x),
    }));
  }

  window.Sintomas = {
    ...(window.Sintomas || {}),
    listTypes: fetchSintomas,
  };
})();
