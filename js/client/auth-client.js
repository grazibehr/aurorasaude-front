// ./js/client/auth-client.js
(function () {
  const API = "http://127.0.0.1:5000/auth";
  const LS_TOKEN = "auth.token";
  const LS_USER = "auth.user";

  function setAuth({ token, user }) {
    if (token) localStorage.setItem(LS_TOKEN, token);
    else localStorage.removeItem(LS_TOKEN);

    if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
    else localStorage.removeItem(LS_USER);

    document.dispatchEvent(
      new CustomEvent("auth:change", { detail: { token, user } })
    );
  }

  function getToken() {
    return localStorage.getItem(LS_TOKEN) || null;
  }

  function getUser() {
    const raw = localStorage.getItem(LS_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function postJson(url, body, opts = {}) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, ...data };
  }

  async function login({ email, password }) {
    const res = await postJson(`${API}/login`, { email, password });
    // Se sucesso, guarda credenciais:
    if (res.ok && res.token)
      setAuth({ token: res.token, user: res.user || null });
    return res;
  }

  async function signup({ name, email, password }) {
    const res = await postJson(`${API}/signup`, { name, email, password });
    // Alguns backends já retornam token no signup; se vier, salva
    if (res.ok && res.token)
      setAuth({ token: res.token, user: res.user || null });
    return res;
  }

  function logout() {
    setAuth({ token: null, user: null });
  }

  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { ...options, headers });
    if (r.status === 401) logout();
    return r;
  }

  window.Auth = {
    login,
    signup,
    logout,
    setAuth,
    getToken,
    getUser,
    authFetch,
  };

  document.dispatchEvent(new Event("auth:ready"));
})();
