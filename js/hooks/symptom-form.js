(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // --- UI helpers
  function levelLabel(n) {
    if (n <= 3) return { txt: "Leve", cls: "text-emerald-600" };
    if (n <= 6) return { txt: "Moderada", cls: "text-amber-600" };
    return { txt: "Intensa", cls: "text-rose-600" };
  }

  async function getSymptomTypes() {
    if (window.Sintomas?.listTypes) {
      try {
        const raw = await window.Sintomas.listTypes();
        const arr = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.results)
          ? raw.results
          : [];

        if (arr.length) {
          return arr.map((x) => ({
            id: x.id ?? x.value ?? x.slug ?? String(x),
            // teu banco usa "type"
            name: x.name ?? x.type ?? x.label ?? String(x),
          }));
        }
      } catch (e) {
        console.warn("Sintomas.listTypes() falhou:", e);
      }
    }
    return [];
  }

  async function loadSymptomOptions(hiddenSelect, listEl, outroOptId, closeCb) {
    hiddenSelect.innerHTML =
      '<option value="" disabled selected>Carregando…</option>';
    const labelEl = $("#selected-symptom-text");
    let types;
    try {
      types = await getSymptomTypes();
    } catch (e) {
      console.error("Erro ao obter sintomas:", e);
      types = [];
    }
    if (!Array.isArray(types)) types = [];

    hiddenSelect.innerHTML =
      '<option value="" disabled selected>Selecione…</option>';
    listEl.innerHTML = "";

    if (types.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Nenhum sintoma encontrado";
      li.className = "px-3 py-2 text-slate-400";
      listEl.appendChild(li);
      return () => {};
    }

    let outroId = null;

    types.forEach((t) => {
      hiddenSelect.appendChild(new Option(t.name, String(t.id), false, false));

      const li = document.createElement("li");
      li.textContent = t.name;
      li.setAttribute("role", "option");
      li.tabIndex = -1;
      li.dataset.value = String(t.id);
      li.className =
        "px-3 py-2 cursor-pointer hover:bg-indigo-50 hover:text-indigo-700";
      li.addEventListener("click", () => setSelection(String(t.id), t.name));
      listEl.appendChild(li);

      if (String(t.name).trim().toLowerCase().startsWith("outro"))
        outroId = t.id;
    });

    // Se no catálogo houver "Outro", cria opção visual "Outro…"
    if (outroId != null && !types.some((t) => String(t.id) === "outro")) {
      const optOutro = document.createElement("option");
      optOutro.value = "outro";
      optOutro.textContent = "Outro…";
      optOutro.id = outroOptId;
      optOutro.dataset.outroId = String(outroId);
      hiddenSelect.appendChild(optOutro);

      const li = document.createElement("li");
      li.textContent = "Outro…";
      li.setAttribute("role", "option");
      li.tabIndex = -1;
      li.dataset.value = "outro";
      li.className =
        "px-3 py-2 cursor-pointer hover:bg-indigo-50 hover:text-indigo-700";
      li.addEventListener("click", () => setSelection("outro", "Outro…"));
      listEl.appendChild(li);
    }

    // sincroniza rótulo + hidden; dispara change (o toggleOuTro escuta isso)
    function setSelection(val, text) {
      hiddenSelect.value = val;
      hiddenSelect.dispatchEvent(new Event("change", { bubbles: true }));
      if (labelEl) {
        labelEl.textContent = text;
        labelEl.classList.remove("text-gray-500");
      }
      closeCb?.(); // fecha dropdown se passado
    }

    return setSelection;
  }

  function bindSymptomPage() {
    const pageTitle = document.getElementById("symptom-title");
    if (!pageTitle) return;

    const form = document.getElementById("symptomForm");
    if (!form || form.__bound) return;

    const btn = $("#custom-select-btn", form);
    const list = $("#custom-select-options", form);
    const hiddenSelect = $("#symptom_id", form);
    const label = $("#selected-symptom-text", form);

    const outroWrap = $("#sym-outro-wrapper", form);
    const outroInput = $("#sym-outro", form);
    const OUTRO_OPT_ID = "sym-type-outro-opt";

    if (btn && list) {
      btn.setAttribute("role", "button");
      btn.setAttribute("aria-haspopup", "listbox");
      btn.setAttribute("aria-expanded", "false");
      list.setAttribute("role", "listbox");
    }

    function openList() {
      if (!list || !btn) return;
      list.classList.remove("hidden");
      btn.setAttribute("aria-expanded", "true");
      btn.querySelector("i")?.classList.add("rotate-180");
      const first = list.querySelector("li");
      first && first.focus();
    }

    function closeList() {
      if (!list || !btn) return;
      list.classList.add("hidden");
      btn.setAttribute("aria-expanded", "false");
      btn.querySelector("i")?.classList.remove("rotate-180");
    }

    let setSelection = () => {};
    if (hiddenSelect && list && !form.__symptomsLoaded) {
      loadSymptomOptions(hiddenSelect, list, OUTRO_OPT_ID, closeList).then(
        (fn) => {
          setSelection = fn || setSelection;
          if (!hiddenSelect.value && label) {
            label.textContent = "Selecione um sintoma...";
            label.classList.add("text-gray-500");
          }
          hiddenSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      );
      form.__symptomsLoaded = true;
    }

    btn?.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      isOpen ? closeList() : openList();
    });
    btn?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openList();
      }
    });
    list?.addEventListener("keydown", (e) => {
      const items = $$("li", list);
      const idx = items.indexOf(document.activeElement);
      if (e.key === "Escape") {
        closeList();
        btn?.focus();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[Math.min(idx + 1, items.length - 1)]?.focus();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        items[Math.max(idx - 1, 0)]?.focus();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        document.activeElement?.click();
      }
    });
    document.addEventListener("click", (ev) => {
      if (form && !form.contains(ev.target)) closeList();
    });

    // “Outro” toggle (escuta o change disparado no setSelection)
    function toggleOutro() {
      const isOutro = hiddenSelect?.value === "outro";
      outroWrap?.classList.toggle("hidden", !isOutro);
      if (outroInput) outroInput.required = !!isOutro;

      const outroOpt = document.getElementById(OUTRO_OPT_ID);
      if (outroOpt && !outroOpt.dataset.outroId) {
        outroOpt.remove();
        if (isOutro && hiddenSelect) hiddenSelect.value = "";
        outroWrap?.classList.add("hidden");
        if (outroInput) outroInput.required = false;
      }
    }
    hiddenSelect?.addEventListener("change", toggleOutro);

    // Intensidade
    const slider = $("#sym-level", form);
    const outNum = $("#sym-level-num", form);
    const outLbl = $("#sym-level-label", form);
    const upd = () => {
      const v = parseInt(slider.value, 10);
      outNum && (outNum.textContent = `${v}/10`);
      if (outLbl) {
        const { txt, cls } = levelLabel(v);
        outLbl.textContent = txt;
        outLbl.className = `font-semibold ${cls}`;
      }
    };
    slider?.addEventListener("input", upd);
    slider && upd();

    // Salvar
    const saveBtn =
      document.getElementById("sym-save") ||
      form.querySelector('button[type="submit"]');
    (saveBtn || form).addEventListener("click", async (ev) => {
      if (ev.target.closest("button[type='submit']")) ev.preventDefault();
      try {
        if (!hiddenSelect || !hiddenSelect.value) {
          alert("Selecione um tipo de sintoma.");
          btn?.focus();
          return;
        }

        let symptom_id = null;
        let notesExtra = null;

        if (hiddenSelect.value === "outro") {
          const outroTxt = (outroInput?.value || "").trim();
          if (!outroTxt) {
            alert('Descreva o sintoma em "Outro".');
            outroInput?.focus();
            return;
          }
          const outroOpt = document.getElementById(OUTRO_OPT_ID);
          const outroId = outroOpt?.dataset?.outroId
            ? parseInt(outroOpt.dataset.outroId, 10)
            : null;
          if (!outroId) {
            alert('A opção "Outro" não está disponível no catálogo.');
            return;
          }
          symptom_id = outroId;
          notesExtra = `[Outro] ${outroTxt}`;
        } else {
          symptom_id = parseInt(hiddenSelect.value, 10);
          if (!Number.isFinite(symptom_id)) {
            alert("Seleção inválida.");
            return;
          }
        }

        const pain_level = parseInt($("#sym-level", form).value, 10);
        const notesTyped = ($("#sym-notes", form)?.value || "").trim();
        const notes =
          [notesExtra, notesTyped].filter(Boolean).join(" | ") || null;
        const date = new Date().toISOString().slice(0, 10);

        await window.UserSymptoms.create({
          symptom_id,
          pain_level,
          date,
          notes,
        });

        alert("Sintoma registrado!");
        form.reset();
        label && (label.textContent = "Selecione um sintoma...");
        label && label.classList.add("text-gray-500");
        hiddenSelect.value = "";
        hiddenSelect.dispatchEvent(new Event("change", { bubbles: true }));
        slider && upd();
        location.hash = "#/home";
      } catch (e) {
        alert(e.message || "Erro ao salvar.");
      }
    });

    form.__bound = true;
  }

  window.addEventListener("hashchange", () => setTimeout(bindSymptomPage, 0));
  document.addEventListener("DOMContentLoaded", () =>
    setTimeout(bindSymptomPage, 0)
  );
})();
