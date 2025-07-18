(function () {
  // Função para buscar candidatos reais de sessão acima do elemento clicado
  function getSessionCandidates(element) {
    var candidates = [];
    var current = element;
    var STOP_TAGS = ["BODY", "HTML"];
    while (current && STOP_TAGS.indexOf(current.tagName) === -1) {
      var tag = current.tagName || "";
      var classes = (current.className || "").toLowerCase();
      var fontSize = parseFloat(window.getComputedStyle(current).fontSize) || 0;
      var text = (current.innerText || "").trim();

      // Critérios de sessão
      var isHeading = tag === "H1" || tag === "H2";
      var isLargeParagraph =
        (tag === "P" || classes.indexOf("paragraph") !== -1 || classes.indexOf("paragrafo") !== -1) && fontSize > 20;
      var isSpecial =
        /(session|header|menu|whatsapp|footer|modal|swiper|article|main|hero)/.test(tag.toLowerCase() + " " + classes);

      if (
        (isHeading && text.length > 0) ||
        (isLargeParagraph && text.length > 0) ||
        (isSpecial && text.length > 0)
      ) {
        candidates.push({
          tag: tag,
          classes: classes,
          text: text,
          fontSize: fontSize,
          selector: window.getFullSelector ? getFullSelector(current) : "",
        });
      }
      current = current.parentElement;
    }
    return candidates.reverse();
  }

  // Modal lógica (garante reaparecimento e logs)
  function openRotulagemModal(data, sugestoes, user, msgExtra) {
    // Remove modal existente, se houver
    var panel = document.getElementById('rotulagem-panel');
    var backdrop = document.getElementById('rotulagem-backdrop');
    if (panel) panel.remove();
    if (backdrop) backdrop.remove();

    // Adiciona CSS (apenas 1x)
    if (!document.getElementById("rotulagem-css")) {
      var link = document.createElement('link');
      link.id = "rotulagem-css";
      link.rel = "stylesheet";
      link.href = "https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css";
      document.head.appendChild(link);
    }

    // Cria HTML
    var divBackdrop = document.createElement('div');
    divBackdrop.id = 'rotulagem-backdrop';
    divBackdrop.style.display = "block";
    document.body.appendChild(divBackdrop);

    var divPanel = document.createElement('div');
    divPanel.id = 'rotulagem-panel';
    divPanel.style.display = "block";
    divPanel.innerHTML = `
      <h3>Rotular Sessão do Elemento</h3>
      <div id="rotulagem-msg-extra">${msgExtra || ""}</div>
      <input type="text" id="rotulagem_input" placeholder="Nome da sessão" list="rotulagem_options" autocomplete="off">
      <datalist id="rotulagem_options"></datalist>
      <div id="rotulagem_msg" style="color:red;margin-top:7px"></div>
      <div style="margin-top:20px;">
        <button id="rotulagem_salvar">Salvar</button>
        <button id="rotulagem_cancelar" style="margin-left:10px;">Cancelar</button>
      </div>
    `;
    document.body.appendChild(divPanel);

    // Popular datalist
    var dl = document.getElementById('rotulagem_options');
    dl.innerHTML = '';
    (sugestoes || []).forEach(function (opt) {
      if (opt && opt.length > 0) {
        var op = document.createElement('option');
        op.value = opt;
        dl.appendChild(op);
      }
    });

    var inp = document.getElementById('rotulagem_input');
    inp.value = sugestoes && sugestoes[0] ? sugestoes[0] : '';
    inp.focus();

    function closeModal() {
      document.getElementById('rotulagem-panel')?.remove();
      document.getElementById('rotulagem-backdrop')?.remove();
      // Garante reativação do listener
      document.addEventListener("click", window.__rotulagem_taxonomia_click, true);
    }
    document.getElementById('rotulagem_cancelar').onclick = function () {
      closeModal();
    };
    document.getElementById('rotulagem_salvar').onclick = function () {
      var sessao = inp.value.trim();
      if (!sessao) {
        document.getElementById('rotulagem_msg').textContent = 'Digite a sessão.';
        return;
      }
      var exemplo = Object.assign({}, data, {
        sessao: sessao,
        usuario: user || null,
        timestamp: new Date().toISOString()
      });
      // LOG NO FRONT
      console.log("[Rotulagem-LOG] Salvando exemplo:", exemplo);
      fetch("https://labelling-production.up.railway.app/api/rotulo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exemplo)
      })
        .then(r => r.json())
        .then(resp => {
          console.log("[Rotulagem-LOG] Resposta do backend:", resp);
          closeModal();
        })
        .catch(e => {
          document.getElementById('rotulagem_msg').textContent = 'Erro ao salvar: ' + e;
        });
    };

    // ESC fecha
    document.onkeydown = function (ev) {
      if (ev.key === "Escape") closeModal();
    };

    // Bloqueia clique no backdrop (não fecha ao clicar fora)
    divBackdrop.onclick = function (e) {};
  }

  // Main handler de clique
  window.__rotulagem_taxonomia_click = function (e) {
    try {
      // Remove listener pra evitar duplo modal!
      document.removeEventListener("click", window.__rotulagem_taxonomia_click, true);

      var element = e.target;
      var candidatos = getSessionCandidates(element);
      // LOG DE CLIQUE
      console.log("[Rotulagem-LOG] Clique detectado. Candidato(s):", candidatos);

      var data = {
        clicked: {
          tag: element.tagName,
          classes: (element.className || ""),
          text: (element.innerText || "").trim(),
          fontSize: parseFloat(window.getComputedStyle(element).fontSize) || 0,
          selector: window.getFullSelector ? getFullSelector(element) : "",
        },
        acima: candidatos
      };

      // Chama backend inteligente
      fetch("https://labelling-production.up.railway.app/api/inteligencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(r => r.json())
        .then(resp => {
          console.log("[Rotulagem-LOG] Sugestão do backend:", resp);
          // Prioriza sugestão do backend, preenche datalist
          var sugestoes = [];
          if (resp && resp.sessao) sugestoes.push(resp.sessao);
          if (resp && resp.sugestoes && Array.isArray(resp.sugestoes)) {
            resp.sugestoes.forEach(function (s) {
              if (s && sugestoes.indexOf(s) === -1) sugestoes.push(s);
            });
          }
          // fallback para candidatos DOM se nada
          if (!sugestoes.length) sugestoes = candidatos.map(c => c.text);
          openRotulagemModal(data, sugestoes, window.loggedUser, "Rotule este exemplo e salve!");
        })
        .catch(err => {
          console.error("[Rotulagem-LOG] Falha ao sugerir sessão:", err);
          openRotulagemModal(data, candidatos.map(c => c.text), window.loggedUser, "Rotule este exemplo e salve!");
        });
    } catch (err) {
      alert("Falha ao sugerir sessão: " + err);
      console.error(err);
    }
  };

  // Ativa listener SEMPRE (mesmo após salvar/cancelar)
  document.addEventListener("click", window.__rotulagem_taxonomia_click, true);
  console.log("[Rotulagem-LOG] Listener de clique ativo.");

})();
