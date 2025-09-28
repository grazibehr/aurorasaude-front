(function () {
  const API = "http://127.0.0.1:5000/usuario/sintoma";

  function headersJson({ incluirContentType = true } = {}) {
    const token = window.Auth?.getToken?.();
    return {
      ...(incluirContentType ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function getJSON(url) {
    const r = await fetch(url, { headers: headersJson() });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
    return { data, headers: r.headers };
  }

  async function enviarJson(url, metodo, corpo) {
    const r = await fetch(url, {
      method: metodo,
      headers: headersJson(),
      body: JSON.stringify(corpo),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
    return data;
  }

  function montarQuery(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.append(k, v);
    });
    const s = q.toString();
    return s ? `?${s}` : "";
  }

  async function listar(params = {}) {
    const { data, headers } = await getJSON(
      `${API}/lista${montarQuery(params)}`
    );
    const items = Array.isArray(data?.items) ? data.items : [];
    const total = Number(headers.get("X-Total-Count") || items.length);
    return { items, total };
  }

  async function listarComMeta({ limit, ...params } = {}) {
    const { items, total } = await listar(params);
    const ordenados = items
      .map((x) => ({
        ...x,
        _ts: Date.parse(x.date) || Date.parse(x.created_at) || 0,
      }))
      .sort((a, b) => b._ts - a._ts)
      .map(({ _ts, ...x }) => x);

    return {
      items: typeof limit === "number" ? ordenados.slice(0, limit) : ordenados,
      total,
    };
  }

  async function criar(payload) {
    return enviarJson(`${API}/user`, "POST", payload);
  }

  async function atualizar(id, parcial) {
    return enviarJson(`${API}/${id}`, "PATCH", parcial);
  }

  async function remover(idSintoma) {
    const r = await fetch(`${API}/${idSintoma}`, {
      method: "DELETE",
      headers: headersJson({ incluirContentType: false }),
    });

    if (r.status === 204) return true;

    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.ok === false) {
      throw new Error(data.message || `HTTP ${r.status}`);
    }
    return true;
  }

  window.UserSymptoms = {
    ...(window.UserSymptoms || {}),
    list: listar,
    listWithMeta: listarComMeta,
    create: criar,
    patch: atualizar,
    remove: remover,
  };
})();
