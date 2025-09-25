// js/services/auth.js
(function () {
  const API = "http://127.0.0.1:5000/auth";

  // chaves no localStorage
  const LS_TOKEN = "auth.token";
  const LS_USER = "auth.user";

  function setAuth({ token, user }) {
    if (token) localStorage.setItem(LS_TOKEN, token);
    else localStorage.removeItem(LS_TOKEN);

    if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
    else localStorage.removeItem(LS_USER);

    // avisa o app (header, roteador, etc.)
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

  function logout() {
    setAuth({ token: null, user: null });
  }

  // ===== http helpers =====
  function toFormData(body) {
    const fd = new FormData();
    for (const k in body) fd.append(k, body[k]);
    return fd;
  }

  async function postForm(url, body) {
    const r = await fetch(url, { method: "POST", body: toFormData(body) });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, ...data };
  }

  // fetch autenticado opcional (pra rotas protegidas)
  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { ...options, headers });
    if (r.status === 401) logout(); // token expirou -> derruba sessão
    return r;
  }

  // ===== endpoints =====
  async function login({ email, password }) {
    const res = await postForm(`${API}/login`, { email, password });
    // se o backend retornar token/user, salva aqui
    if (res.ok && res.token)
      setAuth({ token: res.token, user: res.user || null });
    return res;
  }

  async function signup({ name, email, password }) {
    const res = await postForm(`${API}/signup`, { name, email, password });
    // alguns backends já retornam token no signup
    if (res.ok && res.token)
      setAuth({ token: res.token, user: res.user || null });
    return res;
  }

  // expõe no global
  window.Auth = {
    login,
    signup,
    setAuth,
    getToken,
    getUser,
    logout,
    authFetch,
  };

  // sinaliza que tá pronto
  document.dispatchEvent(new Event("auth:ready"));
})();
