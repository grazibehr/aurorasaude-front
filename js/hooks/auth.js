(function () {
  function exibirAlerta(el, type, msg) {
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

  function alternarSenha(root) {
    root.querySelectorAll("[data-pass-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sel = btn.getAttribute("data-pass-target");
        const input = root.querySelector(sel);
        if (!input) return;

        const mostrando = input.type === "text";
        input.type = mostrando ? "password" : "text";

        const novoLabel = mostrando ? "Mostrar senha" : "Ocultar senha";
        btn.setAttribute("aria-label", novoLabel);
        btn.setAttribute("aria-pressed", String(!mostrando));
        btn.title = novoLabel;

        const sr = btn.querySelector(".sr-only");
        if (sr) sr.textContent = novoLabel;

        const icon = btn.querySelector("[data-lucide]");
        if (icon) {
          icon.setAttribute("data-lucide", mostrando ? "eye" : "eye-closed");
          if (window.lucide?.createIcons) window.lucide.createIcons();
        }
      });
    });
  }

  function redirecionarPosAuth() {
    const intended = sessionStorage.getItem("INTENDED_ROUTE");
    if (intended) sessionStorage.removeItem("INTENDED_ROUTE");
    location.hash = `#${intended || "/home"}`;
  }

  function iniciarAuthUI() {
    const loginTab = document.getElementById("authTabLogin");
    const registerTab = document.getElementById("authTabRegister");
    const loginForm = document.getElementById("authFormLogin");
    const registerForm = document.getElementById("authFormRegister");
    const authAlert = document.getElementById("authAlert");
    if (!loginTab || !registerTab || !loginForm || !registerForm) return;

    if (loginForm.__bound || registerForm.__bound) return;
    loginForm.__bound = true;
    registerForm.__bound = true;

    const formEntrar = () => {
      loginTab.classList.add("tab-button-active");
      loginTab.classList.remove("tab-button-inactive");
      loginTab.style.background = "var(--primary-purple)";
      loginTab.setAttribute("aria-selected", "true");

      registerTab.style.background = "transparent";
      registerTab.classList.add("tab-button-inactive");
      registerTab.classList.remove("tab-button-active");
      registerTab.setAttribute("aria-selected", "false");

      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
      document.getElementById("authLoginEmail")?.focus();
    };

    const formCadastrar = () => {
      registerTab.classList.add("tab-button-active");
      registerTab.classList.remove("tab-button-inactive");
      registerTab.style.background = "var(--primary-purple)";
      registerTab.setAttribute("aria-selected", "true");

      loginTab.style.background = "transparent";
      loginTab.classList.add("tab-button-inactive");
      loginTab.classList.remove("tab-button-active");
      loginTab.setAttribute("aria-selected", "false");

      registerForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
      document.getElementById("authRegName")?.focus();
    };

    loginTab.addEventListener("click", formEntrar);
    registerTab.addEventListener("click", formCadastrar);
    alternarSenha(document);

    const bootHandlers = () => {
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
          const data = await window.Auth.entrar({ email, password });
          if (!data?.ok) throw new Error(data?.message || "Falha no login");
          exibirAlerta(
            authAlert,
            "success",
            data?.message || "Login efetuado com sucesso!"
          );
          redirecionarPosAuth();
        } catch (err) {
          exibirAlerta(authAlert, "error", err.message || "Erro no login");
        } finally {
          logging = false;
          if (btn) {
            btn.disabled = false;
            btn.textContent = prev;
          }
        }
      });

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
          return exibirAlerta(authAlert, "error", "Digite um e-mail válido.");
        if (!name)
          return exibirAlerta(authAlert, "error", "Informe seu nome completo.");
        if (password.length < 6)
          return exibirAlerta(
            authAlert,
            "error",
            "Senha mínima de 6 caracteres."
          );
        if (password !== confirm)
          return exibirAlerta(authAlert, "error", "As senhas não coincidem.");

        const btn = registerForm.querySelector('button[type="submit"]');
        const prev = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Criando…";

        try {
          const res = await window.Auth.cadastrar({ name, email, password });
          if (!res?.ok) throw new Error(res?.message || "Falha no cadastro");
          exibirAlerta(
            authAlert,
            "success",
            res?.message || "Conta criada! Redirecionando…"
          );
          if (window.Auth?.sair) window.Auth.sair();
          const loginTab = document.getElementById("authTabLogin");
          if (loginTab) loginTab.click();
          location.hash = "#/auth";
        } catch (err) {
          exibirAlerta(
            authAlert,
            "error",
            err.message || "Erro ao criar conta."
          );
        } finally {
          btn.disabled = false;
          btn.textContent = prev;
        }
      });

      if (window.Auth.obterToken && window.Auth.obterToken()) {
        redirecionarPosAuth();
      }
    };

    if (window.Auth) {
      bootHandlers();
    } else {
      document.addEventListener("auth:ready", bootHandlers, { once: true });
    }

    formEntrar();
  }

  window.AuthUI = { iniciarAuthUI };
})();
