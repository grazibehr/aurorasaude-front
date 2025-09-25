// ./js/hooks/auth-ui.js
(function () {
  function setAlert(el, type, msg) {
    if (!el) return;
    el.textContent = msg;
    el.className =
      "block p-3 rounded-lg text-sm transition-all duration-300 " +
      (type === "success"
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
        : "bg-rose-50 text-rose-700 border border-rose-200");
    clearTimeout(el.__t);
    el.__t = setTimeout(() => el.classList.add("hidden"), 5000);
    el.classList.remove("hidden");
  }

  function bindPasswordToggles(root) {
    root.querySelectorAll("[data-pass-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sel = btn.getAttribute("data-pass-target");
        const input = root.querySelector(sel);
        if (!input) return;
        const isPwd = input.type === "password";
        input.type = isPwd ? "text" : "password";
        btn.textContent = isPwd ? "ocultar" : "mostrar";
        btn.setAttribute(
          "aria-label",
          isPwd ? "Ocultar Senha" : "Mostrar Senha"
        );
      });
    });
  }

  function gotoIntendedOrHome() {
    const intended = sessionStorage.getItem("INTENDED_ROUTE");
    if (intended) sessionStorage.removeItem("INTENDED_ROUTE");
    location.hash = `#${intended || "/home"}`;
  }

  function init() {
    const loginTab = document.getElementById("authTabLogin");
    const registerTab = document.getElementById("authTabRegister");
    const loginForm = document.getElementById("authFormLogin");
    const registerForm = document.getElementById("authFormRegister");
    const authAlert = document.getElementById("authAlert");
    if (!loginTab || !registerTab || !loginForm || !registerForm) return;

    if (loginForm.__bound || registerForm.__bound) return;
    loginForm.__bound = true;
    registerForm.__bound = true;

    const showLoginForm = () => {
      loginTab.classList.add("tab-button-active");
      loginTab.classList.remove("tab-button-inactive");
      loginTab.style.background = "var(--gradient-aurora)";
      loginTab.setAttribute("aria-selected", "true");

      registerTab.style.background = "transparent";
      registerTab.classList.add("tab-button-inactive");
      registerTab.classList.remove("tab-button-active");
      registerTab.setAttribute("aria-selected", "false");

      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
      document.getElementById("authLoginEmail")?.focus();
    };

    const showRegisterForm = () => {
      registerTab.classList.add("tab-button-active");
      registerTab.classList.remove("tab-button-inactive");
      registerTab.style.background = "var(--gradient-aurora)";
      registerTab.setAttribute("aria-selected", "true");

      loginTab.style.background = "transparent";
      loginTab.classList.add("tab-button-inactive");
      loginTab.classList.remove("tab-button-active");
      loginTab.setAttribute("aria-selected", "false");

      registerForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
      document.getElementById("authRegName")?.focus();
    };

    loginTab.addEventListener("click", showLoginForm);
    registerTab.addEventListener("click", showRegisterForm);
    bindPasswordToggles(document);

    // ====== Handlers só depois que Auth cliente estiver pronto
    const bootHandlers = () => {
      if (!window.Auth?.login || !window.Auth?.signup) {
        setAlert(
          authAlert,
          "error",
          "Cliente de autenticação não está disponível."
        );
        return;
      }

      // ---- Login
      let logging = false;
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (logging) return;
        logging = true;
        const btn = loginForm.querySelector('button[type="submit"]');
        const prev = btn?.textContent;
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Entrando…";
        }

        const email =
          document
            .getElementById("authLoginEmail")
            ?.value?.trim()
            ?.toLowerCase() || "";
        const password = document.getElementById("authLoginPass")?.value || "";

        try {
          const data = await window.Auth.login({ email, password });
          if (!data?.ok) throw new Error(data?.message || "Falha no login");
          setAlert(
            authAlert,
            "success",
            data?.message || "Login efetuado com sucesso!"
          );
          gotoIntendedOrHome();
        } catch (err) {
          setAlert(authAlert, "error", err.message || "Erro no login");
        } finally {
          logging = false;
          if (btn) {
            btn.disabled = false;
            btn.textContent = prev;
          }
        }
      });

      // ---- Cadastro
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("authRegName").value.trim();
        const email = document
          .getElementById("authRegEmail")
          .value.trim()
          .toLowerCase();
        const password = document.getElementById("authRegPass").value;
        const confirm = document.getElementById("authRegConfirm").value;

        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(email))
          return setAlert(authAlert, "error", "Digite um e-mail válido.");
        if (!name)
          return setAlert(authAlert, "error", "Informe seu nome completo.");
        if (password.length < 6)
          return setAlert(authAlert, "error", "Senha mínima de 6 caracteres.");
        if (password !== confirm)
          return setAlert(authAlert, "error", "As senhas não coincidem.");

        const btn = registerForm.querySelector('button[type="submit"]');
        const prev = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Criando…";

        try {
          const res = await window.Auth.signup({ name, email, password });
          if (!res?.ok) throw new Error(res?.message || "Falha no cadastro");
          setAlert(
            authAlert,
            "success",
            res?.message || "Conta criada! Redirecionando…"
          );
          gotoIntendedOrHome();
        } catch (err) {
          setAlert(authAlert, "error", err.message || "Erro ao criar conta.");
        } finally {
          btn.disabled = false;
          btn.textContent = prev;
        }
      });

      // Se já está logado e por algum motivo caiu no /auth, manda pra intended
      if (window.Auth.getToken && window.Auth.getToken()) {
        gotoIntendedOrHome();
      }
    };

    // Liga handlers quando Auth estiver pronto
    if (window.Auth) {
      bootHandlers();
    } else {
      document.addEventListener("auth:ready", bootHandlers, { once: true });
    }

    // estado inicial
    showLoginForm();
  }

  // expõe UI como AuthUI (não conflita com o client Auth)
  window.AuthUI = { init };
})();
