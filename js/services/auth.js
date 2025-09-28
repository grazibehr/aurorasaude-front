(function () {
  const URL_AUTENTICACAO = "http://127.0.0.1:5000/auth";

  const LS_TOKEN = "auth.token";
  const LS_USUARIO = "auth.user";

  function definirAutenticacao({ token, usuario }) {
    if (token) localStorage.setItem(LS_TOKEN, token);
    else localStorage.removeItem(LS_TOKEN);

    if (usuario) localStorage.setItem(LS_USUARIO, JSON.stringify(usuario));
    else localStorage.removeItem(LS_USUARIO);

    document.dispatchEvent(
      new CustomEvent("auth:change", { detail: { token, user: usuario } })
    );
  }

  function obterToken() {
    return localStorage.getItem(LS_TOKEN) || null;
  }

  function obterUsuario() {
    const bruto = localStorage.getItem(LS_USUARIO);
    if (!bruto) return null;
    try {
      return JSON.parse(bruto);
    } catch {
      return null;
    }
  }

  function sair() {
    definirAutenticacao({ token: null, usuario: null });
  }

  function paraFormData(corpo) {
    const fd = new FormData();
    for (const k in corpo) fd.append(k, corpo[k]);
    return fd;
  }

  async function postarFormulario(url, corpo) {
    const r = await fetch(url, { method: "POST", body: paraFormData(corpo) });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, ...data };
  }

  async function fetchAutenticado(url, opcoes = {}) {
    const token = obterToken();
    const headers = { ...(opcoes.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { ...opcoes, headers });
    if (r.status === 401) sair();
    return r;
  }

  async function entrar({ email, password }) {
    const res = await postarFormulario(`${URL_AUTENTICACAO}/login`, {
      email,
      password,
    });
    if (res.ok && res.token) {
      definirAutenticacao({ token: res.token, usuario: res.user || null });
    }
    return res;
  }

  async function cadastrar({ name, email, password }) {
    const res = await postarFormulario(`${URL_AUTENTICACAO}/cadastro`, {
      name,
      email,
      password,
    });
    if (res.ok && res.token) {
      definirAutenticacao({ token: res.token, usuario: res.user || null });
    }
    return res;
  }

  window.Auth = {
    entrar,
    cadastrar,
    definirAutenticacao,
    obterToken,
    obterUsuario,
    sair,
    fetchAutenticado,

    login: entrar,
    signup: cadastrar,
    getToken: obterToken,
    getUser: obterUsuario,
    logout: sair,
    authFetch: fetchAutenticado,
  };

  document.dispatchEvent(new Event("auth:ready"));
})();
