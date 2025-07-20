(function () {
  // --- Função para buscar elementos reais de sessão acima do elemento clicado ---
  function getSessionCandidates(element) {
    var candidates = [];
    var current = element.parentElement;
    var STOP_TAGS = ["BODY", "HTML"];
    while (current && STOP_TAGS.indexOf(current.tagName) === -1) {
      var tag = current.tagName || "";
      var classes = (current.className || "").toLowerCase();
      var fontSize = parseFloat(window.getComputedStyle(current).fontSize) || 0;
      var text = (current.innerText || "").trim();

      var isHeading = tag === "H1" || tag === "H2";
      var isLargeParagraph =
        (tag === "P" || classes.indexOf("paragraph") !== -1 || classes.indexOf("paragrafo") !== -1) && fontSize > 20;
      var isSpecial =
        /(session|header|menu|whatsapp|footer|modal|swiper|article|main|hero)/.test(tag.toLowerCase() + " " + classes);

      if ((isHeading && text.length > 0) ||
          (isLargeParagraph && text.length > 0) ||
          (isSpecial && text.length > 0)) {
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
    if (candidates.length === 0) {
      // Fallback: pelo menos retorna BODY se nada achou
      candidates.push({
        tag: "BODY",
        classes: "",
        text: "Sem sessão identificada",
        fontSize: 16,
        selector: "body",
      });
    }
    return candidates.reverse(); // Mais distante para mais próximo do clique
  }

  // --- Função para montar contexto avançado do elemento clicado ---
  function buildDataPayload(element, candidatos) {
    var selectorTripa = window.getSelectorTripa ? getSelectorTripa(element) : [];
    var contexto = window.getHeadingAndParagraphContext ? getHeadingAndParagraphContext(selectorTripa) : [];
    return {
      clicked: {
        tag: element.tagName,
        classes: (element.className || ""),
        text: (element.innerText || "").trim(),
        fontSize: parseFloat(window.getComputedStyle(element).fontSize) || 0,
        selector: window.getFullSelector ? getFullSelector(element) : "",
        position: window.getElementRelativePosition ? getElementRelativePosition(element) : null
      },
      acima: candidatos,
      contexto: contexto
    };
  }

  // --- Modal de Rotulagem ---
  function openRotulagemModal(data, sugestoes, user, msgExtra) {
    // Remove modal existente
    var panel = document.getElementById('rotulagem-panel');
    var backdrop = document.getElementById('rotulagem-backdrop');
    if (panel) panel.remove();
    if (backdrop) backdrop.remove();

    // CSS
    if (!document.getElementById("rotulagem-css")) {
      var link = document.createElement('link');
      link.id = "rotulagem-css";
      link.rel = "stylesheet";
      link.href = "https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css";
      document.head.appendChild(link);
    }

    // HTML
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

    // Preenche datalist apenas com textos dos candidatos REAIS
    var dl = document.getElementById('rotulagem_options');
    dl.innerHTML = '';
    (sugestoes || []).forEach(function (opt) {
      if (opt && typeof opt === "string" && opt.length > 0) {
        var op = document.createElement('option');
        op.value = opt;
        dl.appendChild(op);
      }
    });

    var inp = document.getElementById('rotulagem_input');
    inp.value = sugestoes && sugestoes[0] ? sugestoes[0] : '';
    inp.focus();

    // Fecha modal
    function closeModal() {
      document.getElementById('rotulagem-panel')?.remove();
      document.getElementById('rotulagem-backdrop')?.remove();
      setTimeout(function(){
        // Reativa o listener para permitir novo clique!
        window.rotulagemActive = false;
      },100);
    }
    document.getElementById('rotulagem_cancelar').onclick = function () { closeModal(); };
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
    document.onkeydown = function (ev) {
      if (ev.key === "Escape") closeModal();
    };
    divBackdrop.onclick = function (e) {}; // Não fecha ao clicar fora
  }

  // --- Handler de Clique: busca sessões REAIS, loga e chama backend ---
  function rotulagemTaxonomiaClick(e) {
    if (window.rotulagemActive) return;
    window.rotulagemActive = true;
    try {
      var element = e.target;
      var candidatos = getSessionCandidates(element);

      // Sugestões são apenas textos dos candidatos reais
      var sugestoesReais = candidatos.map(c => c.text).filter(Boolean);

      // Monta payload completo usando utils.js
      var data = buildDataPayload(element, candidatos);

      console.log("[Rotulagem-LOG] Clique:", data);

      // Chama backend (RandomForest/Tensorflow pode sugerir melhor, mas só se for REAL)
      fetch("https://labelling-production.up.railway.app/api/inteligencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(r => r.json())
        .then(resp => {
          console.log("[Rotulagem-LOG] Backend respondeu:", resp);
          var sugestoes = [];
          if (resp && resp.sessao && sugestoesReais.includes(resp.sessao)) sugestoes.push(resp.sessao);
          if (resp && resp.sugestoes && Array.isArray(resp.sugestoes)) {
            resp.sugestoes.forEach(function (s) {
              if (s && sugestoesReais.includes(s) && sugestoes.indexOf(s) === -1) sugestoes.push(s);
            });
          }
          // Fallback: só usa candidatos do DOM
          if (!sugestoes.length) sugestoes = sugestoesReais;
          openRotulagemModal(data, sugestoes, window.loggedUser, "Rotule este exemplo e salve!");
        })
        .catch(function(err){
          console.error("[Rotulagem-LOG] Falha backend, fallback local:", err);
          openRotulagemModal(data, sugestoesReais, window.loggedUser, "Rotule este exemplo e salve!");
        });
    } catch (err) {
      window.rotulagemActive = false;
      alert("Falha ao sugerir sessão: " + err);
      console.error(err);
    }
  }

  // --- Listener SEMPRE reativado ---
  document.addEventListener("click", function(evt){
    if (evt.target.closest('#rotulagem-panel')) return; // Ignora cliques no modal
    rotulagemTaxonomiaClick(evt);
  }, true);

  console.log("[Rotulagem-LOG] Listener de clique ativo.");

  // Expõe global
  window.openRotulagemModal = openRotulagemModal;
})();
