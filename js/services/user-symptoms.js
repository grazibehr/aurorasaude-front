// js/services/user-symptoms.js
(function () {
  const API = "http://127.0.0.1:5000/user/symptoms";

  // agora com flag pra (não) enviar Content-Type
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

  async function getJson(url) {
    const { data } = await getJsonWithHeaders(url);
    return data;
  }

  async function sendJson(url, method, body) {
    const r = await fetch(url, {
      method,
      headers: headersJson(), // POST/PATCH mantêm Content-Type
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
    return data;
  }

  // ---- endpoints
  async function list() {
    const { data, headers } = await getJsonWithHeaders(`${API}/user`);
    const total = Number(
      headers.get("X-Total-Count") || (Array.isArray(data) ? data.length : 0)
    );
    return { items: Array.isArray(data) ? data : [], total };
  }

  async function create(payload) {
    return sendJson(`${API}/user`, "POST", payload);
  }

  async function patch(id, partial) {
    return sendJson(`${API}/user/${id}`, "PATCH", partial);
  }

  async function remove(id) {
    // GUARDA o response em 'r' e NÃO manda Content-Type no DELETE
    const r = await fetch(`${API}/user/${id}`, {
      method: "DELETE",
      headers: headersJson({ includeContentType: false }),
    });

    // back pode retornar 204 sem body (ideal)
    if (r.status === 204) return true;

    // se vier 200 + json, trata também
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.ok === false) {
      throw new Error(data.message || `HTTP ${r.status}`);
    }
    return true;
  }

  async function listWithMeta({ limit } = {}) {
    const { items, total } = await list();
    const sorted = items
      .map((x) => ({ ...x, _ts: Date.parse(x.date) || 0 }))
      .sort((a, b) => b._ts - a._ts)
      .map(({ _ts, ...x }) => x);

    return {
      items: typeof limit === "number" ? sorted.slice(0, limit) : sorted,
      total,
    };
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
