// Aurora Saúde – Onboarding sem Tailwind
// Este script usa delegação de eventos (funciona mesmo com SPA/roteador)
// e classes CSS simples (.hidden, .is-invalid). Nenhuma dependência externa.

(() => {
  const getRoot = () => document.getElementById("app") || document;
  const qs = (sel, root = getRoot()) => (root ? root.querySelector(sel) : null);

  const announce = (msg) => {
    const el = document.getElementById("sr-feedback");
    if (el) el.textContent = msg;
  };

  const ensureClass = (el, cls, on) => {
    if (!el) return;
    el.classList[on ? "add" : "remove"](cls);
  };

  const showStep = (showId, hideId) => {
    const root = getRoot();
    const show = qs("#" + showId, root);
    const hide = qs("#" + hideId, root);
    ensureClass(show, "hidden", false);
    ensureClass(hide, "hidden", true);
    const h = show?.querySelector("h3");
    if (h) {
      h.setAttribute("tabindex", "-1");
      h.focus();
    }
  };

  const markInvalid = (el, invalid) => ensureClass(el, "is-invalid", invalid);

  const requiredFilled = (root, selectors) => {
    let ok = true;
    selectors.forEach((sel) => {
      const el = qs(sel, root);
      const filled = !!String(el?.value ?? "").trim();
      markInvalid(el, !filled);
      if (!filled) ok = false;
    });
    return ok;
  };

  const gatherPayload = (root) => ({
    full_name: qs("#onb-fullName", root)?.value?.trim() || "",
    age: Number(qs("#onb-age", root)?.value || 0),
    sex: qs("#onb-sex", root)?.value || "",
    goals: qs("#onb-goals", root)?.value?.trim() || null,
    notif_daily: qs("#onb-notifDaily", root)?.checked ? 1 : 0,
    notif_weekly: qs("#onb-notifWeekly", root)?.checked ? 1 : 0,
    notif_time: qs("#onb-reminderTime", root)?.value || null,
  });

  const finish = (root) => {
    const payload = gatherPayload(root);
    if (!payload.full_name || !payload.age || !payload.sex) {
      announce("Preencha os campos obrigatórios.");
      return;
    }
    try {
      // Troque por sua API/IndexedDB se quiser
      localStorage.setItem("aurora_profile", JSON.stringify(payload));
      announce("Perfil criado! Vamos começar.");
      location.hash = "#/home";
    } catch (e) {
      console.error(e);
      announce("Erro ao salvar. Tente novamente.");
    }
  };

  const handleClick = (e) => {
    const root = getRoot();
    // Só atua se o onboarding estiver visível
    if (!qs("#onb-step-1", root) && !qs("#onb-step-2", root)) return;

    // NEXT passo 1 → 2
    if (e.target.closest("#onb-next-1")) {
      e.preventDefault();
      const ok = requiredFilled(root, [
        "#onb-fullName",
        "#onb-age",
        "#onb-sex",
      ]);
      if (!ok) {
        announce("Preencha os campos obrigatórios.");
        return;
      }
      showStep("onb-step-2", "onb-step-1");
      return;
    }

    // PREV passo 2 → 1
    if (e.target.closest("#onb-prev-2")) {
      e.preventDefault();
      showStep("onb-step-1", "onb-step-2");
      return;
    }

    // NEXT passo 2 → concluir (sem passo 3 nesta versão)
    if (e.target.closest("#onb-next-2")) {
      e.preventDefault();
      finish(root);
      return;
    }
  };

  // Anexa uma única vez (delegação de eventos)
  if (!window.__auroraOnbBound) {
    document.addEventListener("click", handleClick);
    window.__auroraOnbBound = true;
  }
})();
