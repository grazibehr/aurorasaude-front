(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function rotuloNivel(n) {
    if (n <= 3) return { txt: "Leve", cls: "text-emerald-600" };
    if (n <= 6) return { txt: "Moderada", cls: "text-amber-600" };
    return { txt: "Intensa", cls: "text-rose-600" };
  }

  async function obterTiposDeSintoma() {
    if (window.Sintomas?.listTypes) {
      try {
        const bruto = await window.Sintomas.listTypes();
        const arr = Array.isArray(bruto)
          ? bruto
          : Array.isArray(bruto?.data)
          ? bruto.data
          : Array.isArray(bruto?.items)
          ? bruto.items
          : Array.isArray(bruto?.results)
          ? bruto.results
          : [];
        return arr.map((x) => ({
          id: x.id ?? x.value ?? x.slug ?? String(x),
          name: x.name ?? x.type ?? x.label ?? String(x),
        }));
      } catch (e) {
        console.warn("Sintomas.listTypes() falhou:", e);
      }
    }
    return [];
  }

  async function carregarOpcoesDeSintoma(selectOculto, listaEl, fecharCb) {
    selectOculto.innerHTML =
      '<option value="" disabled selected>Carregando…</option>';
    const rotuloEl = $("#selected-symptom-text");
    let tipos = [];
    try {
      tipos = await obterTiposDeSintoma();
    } catch (e) {
      console.error("Erro ao obter sintomas:", e);
    }

    selectOculto.innerHTML =
      '<option value="" disabled selected>Selecione…</option>';
    listaEl.innerHTML = "";

    if (!tipos.length) {
      const li = document.createElement("li");
      li.textContent = "Nenhum sintoma encontrado";
      li.className = "px-3 py-2 text-slate-400";
      listaEl.appendChild(li);
      return () => {};
    }

    tipos.forEach((t) => {
      selectOculto.appendChild(new Option(t.name, String(t.id), false, false));

      // item da lista custom
      const li = document.createElement("li");
      li.textContent = t.name;
      li.setAttribute("role", "option");
      li.tabIndex = -1;
      li.dataset.value = String(t.id);
      li.className =
        "px-3 py-2 cursor-pointer hover:bg-indigo-50 hover:text-indigo-700";
      li.addEventListener("click", () => definirSelecao(String(t.id), t.name));
      listaEl.appendChild(li);
    });

    function definirSelecao(valor, texto) {
      selectOculto.value = valor;
      selectOculto.dispatchEvent(new Event("change", { bubbles: true }));
      if (rotuloEl) {
        rotuloEl.textContent = texto;
        rotuloEl.classList.remove("text-gray-500");
      }
      fecharCb?.();
    }

    return definirSelecao;
  }

  function vincularPaginaSintoma() {
    const tituloPagina = document.getElementById("symptom-title");
    if (!tituloPagina) return;

    const form = document.getElementById("symptomForm");
    if (!form || form.__bound) return;

    const botaoSelect = $("#custom-select-btn", form);
    const listaOpcoes = $("#custom-select-options", form);
    const selectOculto = $("#symptom_id", form);
    const rotuloSelecionado = $("#selected-symptom-text", form);

    if (botaoSelect && listaOpcoes) {
      botaoSelect.setAttribute("role", "button");
      botaoSelect.setAttribute("aria-haspopup", "listbox");
      botaoSelect.setAttribute("aria-expanded", "false");
      listaOpcoes.setAttribute("role", "listbox");
    }

    function abrirLista() {
      if (!listaOpcoes || !botaoSelect) return;
      listaOpcoes.classList.remove("hidden");
      botaoSelect.setAttribute("aria-expanded", "true");
      botaoSelect.querySelector("i")?.classList.add("rotate-180");
      const first = listaOpcoes.querySelector("li");
      first && first.focus();
    }

    function fecharLista() {
      if (!listaOpcoes || !botaoSelect) return;
      listaOpcoes.classList.add("hidden");
      botaoSelect.setAttribute("aria-expanded", "false");
      botaoSelect.querySelector("i")?.classList.remove("rotate-180");
    }

    if (selectOculto && listaOpcoes && !form.__symptomsLoaded) {
      carregarOpcoesDeSintoma(selectOculto, listaOpcoes, fecharLista).then(
        () => {
          if (!selectOculto.value && rotuloSelecionado) {
            rotuloSelecionado.textContent = "Selecione um sintoma...";
            rotuloSelecionado.classList.add("text-gray-500");
          }
          selectOculto.dispatchEvent(new Event("change", { bubbles: true }));
        }
      );
      form.__symptomsLoaded = true;
    }

    botaoSelect?.addEventListener("click", () => {
      const aberto = botaoSelect.getAttribute("aria-expanded") === "true";
      aberto ? fecharLista() : abrirLista();
    });
    botaoSelect?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        abrirLista();
      }
    });
    listaOpcoes?.addEventListener("keydown", (e) => {
      const itens = $$("li", listaOpcoes);
      const idx = itens.indexOf(document.activeElement);
      if (e.key === "Escape") {
        fecharLista();
        botaoSelect?.focus();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        itens[Math.min(idx + 1, itens.length - 1)]?.focus();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        itens[Math.max(idx - 1, 0)]?.focus();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        document.activeElement?.click();
      }
    });
    document.addEventListener("click", (ev) => {
      if (form && !form.contains(ev.target)) fecharLista();
    });

    const slider = $("#sym-level", form);
    const outNum = $("#sym-level-num", form);
    const outLbl = $("#sym-level-label", form);
    const atualizarIntensidade = () => {
      const v = parseInt(slider.value, 10);
      outNum && (outNum.textContent = `${v}/10`);
      if (outLbl) {
        const { txt, cls } = rotuloNivel(v);
        outLbl.textContent = txt;
        outLbl.className = `font-semibold ${cls}`;
      }
    };
    slider?.addEventListener("input", atualizarIntensidade);
    slider && atualizarIntensidade();

    const btnSalvar =
      document.getElementById("sym-save") ||
      form.querySelector('button[type="submit"]');
    (btnSalvar || form).addEventListener("click", async (ev) => {
      if (ev.target.closest("button[type='submit']")) ev.preventDefault();

      try {
        if (!selectOculto || !selectOculto.value) {
          alert("Selecione um tipo de sintoma.");
          botaoSelect?.focus();
          return;
        }

        const symptom_id = parseInt(selectOculto.value, 10);
        if (!Number.isFinite(symptom_id)) {
          alert("Seleção inválida.");
          return;
        }

        const pain_level = parseInt($("#sym-level", form).value, 10);
        const notes = ($("#sym-notes", form)?.value || "").trim() || null;
        const date = new Date().toISOString().slice(0, 10);

        await window.UserSymptoms.create({
          symptom_id,
          pain_level,
          date,
          notes,
        });

        alert("Sintoma registrado!");
        form.reset();
        rotuloSelecionado &&
          (rotuloSelecionado.textContent = "Selecione um sintoma...");
        rotuloSelecionado && rotuloSelecionado.classList.add("text-gray-500");
        selectOculto.value = "";
        selectOculto.dispatchEvent(new Event("change", { bubbles: true }));
        slider && atualizarIntensidade();

        if (
          window.hooks?.updateHealthTips &&
          typeof window.apiOrIndexedDB?.getUserHistory === "function"
        ) {
          try {
            const entries = await window.apiOrIndexedDB.getUserHistory();
            window.hooks.updateHealthTips(entries, document);
          } catch {}
        }

        location.hash = "#/home";
      } catch (e) {
        alert(e.message || "Erro ao salvar.");
      }
    });

    form.__bound = true;
  }

  window.addEventListener("hashchange", () =>
    setTimeout(vincularPaginaSintoma, 0)
  );
  document.addEventListener("DOMContentLoaded", () =>
    setTimeout(vincularPaginaSintoma, 0)
  );
})();
