// js/services/user-symptoms.js
(function () {
  const API = "http://127.0.0.1:5000/usuario/sintoma";

  function headersJson({ includeContentType = true } = {}) {
    const token = window.Auth?.getToken?.();
    return {
      ...(includeContentType ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function getJsonWithHeaders(url) {
    const r = await fetch(url, { headers: headersJson() });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
    return { data, headers: r.headers };
  }

  async function sendJson(url, method, body) {
    const r = await fetch(url, {
      method,
      headers: headersJson(), // POST/PATCH com Content-Type
      body: JSON.stringify(body),
    });
    // no create você retorna 201 + json; no patch pode ser 200 + json
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
    return data;
  }

  // ------ endpoints ------
  // Suporta query opcional (ex.: ?from=...&to=...&type=...)
  function buildQuery(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.append(k, v);
    });
    const s = q.toString();
    return s ? `?${s}` : "";
  }

  async function list(params = {}) {
    const { data, headers } = await getJsonWithHeaders(
      `${API}/lista${buildQuery(params)}`
    );

    // O back manda { items: [...] } e X-Total-Count
    const items = Array.isArray(data?.items) ? data.items : [];
    const total = Number(headers.get("X-Total-Count") || items.length);

    return { items, total };
  }

  async function listWithMeta({ limit, ...params } = {}) {
    const { items, total } = await list(params);
    const sorted = items
      .map((x) => ({
        ...x,
        _ts: Date.parse(x.date) || Date.parse(x.created_at) || 0,
      }))
      .sort((a, b) => b._ts - a._ts)
      .map(({ _ts, ...x }) => x);

    return {
      items: typeof limit === "number" ? sorted.slice(0, limit) : sorted,
      total,
    };
  }

  async function create(payload) {
    // POST /usuario/sintoma/user
    return sendJson(`${API}/user`, "POST", payload);
  }

  async function patch(id, partial) {
    // PATCH /usuario/sintoma/user/:id  (teu back já espera isso)
    return sendJson(`${API}/${id}`, "PATCH", partial);
  }

  async function remove(symptom_id) {
    const r = await fetch(`${API}/${symptom_id}`, {
      method: "DELETE",
      headers: headersJson({ includeContentType: false }),
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
    list,
    listWithMeta,
    create,
    patch,
    remove,
  };
})();
