(function () {
  function getIniciais(name, email) {
    const base = (name || email || "?").trim();
    const parts = base.split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (base[0] || "?").toUpperCase();
  }

  function infoUsuario() {
    const usuario = window.Auth?.getUser?.();
    const card = document.getElementById("user-card");
    const nome = document.getElementById("user-name");
    const email = document.getElementById("user-email");
    const iniciais = document.getElementById("user-initials");
    if (!card) return;

    if (usuario) {
      if (nome) nome.textContent = usuario.name || usuario.email || "Usuário";
      if (email) email.textContent = usuario.email || "";
      if (iniciais)
        iniciais.textContent = getIniciais(usuario.name, usuario.email);
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  }

  window.addEventListener("hashchange", () => {
    infoUsuario();
  });

  document.addEventListener("DOMContentLoaded", infoUsuario);
  document.addEventListener("auth:ready", infoUsuario);
  document.addEventListener("auth:change", infoUsuario);

  if (window.Auth?.getUser) infoUsuario();

  window.infoUsuario = infoUsuario;
})();
