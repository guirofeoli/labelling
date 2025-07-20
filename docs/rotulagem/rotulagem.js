(function () {
  // Função: encontra textos REAIS de sessão acima do elemento clicado
  function getSessionCandidates(element) {
    var candidates = [];
    var current = element.parentElement;
    var STOP_TAGS = ["BODY", "HTML"];
    var keywords = /(session|header|menu|whatsapp|footer|modal|swiper|article|main|hero)/;

    while (current && STOP_TAGS.indexOf(current.tagName) === -1) {
      var tag = current.tagName || "";
      var classes = (current.className || "").toLowerCase();
      var fontSize = parseFloat(window.getComputedStyle(current).fontSize) || 0;
      var text = (current.innerText || "").trim();

      let isHeading = (tag === "H1" || tag === "H2") && text.length > 0 && text.length < 120;
      let isLargeParagraph =
        ((tag === "P" || classes.indexOf("paragraph") !== -1 || classes.indexOf("paragrafo") !== -1) &&
         fontSize > 20 && text.length > 0 && text.length < 200);
      let isSpecial =
        keywords.test(tag.toLowerCase() + " " + classes) && text.length > 0 && text.length < 140;

      if (isHeading || isLargeParagraph || isSpecial) {
        candidates.push(text);
      }
      current = current.parentElement;
    }
    // Remove duplicados e vazios
    candidates = candidates.filter((x, i, arr) => x && arr.indexOf(x) === i);
    return candidates.reverse();
  }

  // Função inteligente: consulta backend, loga tudo, mostra sugestões
  window.sugerirEShowRotulagem = function(el, loggedUser) {
    var candidatos = getSessionCandidates(el);

    var data = {
      clicked: {
        tag: el.tagName,
        classes: (el.className || ""),
        text: (el.innerText || "").trim(),
        fontSize: parseFloat(window.getComputedStyle(el).fontSize) || 0,
        selector: window.getFullSelector ? getFullSelector(el) : "",
      },
      acima: candidatos
    };
    // LOG clique
    console.log('[Rotulagem-LOG] Clique:', data);

    fetch("https://labelling-production.up.railway.app/api/inteligencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(resp => {
      // LOG resposta backend
      console.log('[Rotulagem-LOG] Backend respondeu:', resp);

      // Sugestão prioritária do backend, fallback para candidatos DOM
      var sugestoes = [];
      if (resp && resp.sessao && typeof resp.sessao === "string" && resp.sessao.length < 120) sugestoes.push(resp.sessao);
      if (resp && resp.options && Array.isArray(resp.options)) {
        resp.options.forEach(function (s) {
          if (s && sugestoes.indexOf(s) === -1 && typeof s === "string" && s.length < 120) sugestoes.push(s);
        });
      }
      if (!sugestoes.length) sugestoes = candidatos;
      if (!sugestoes.length) sugestoes = ["(Digite a sessão)"];

      window.openRotulagemModal(data, sugestoes, loggedUser, "Rotule este exemplo e salve!");
    })
    .catch(function(err) {
      console.warn('[Rotulagem-LOG] Erro ao sugerir:', err);
      window.openRotulagemModal(data, candidatos, loggedUser, "Rotule este exemplo e salve!");
    });
  };

  // Exibe o modal de rotulagem e sempre reativa o clique ao fechar
  function openRotulagemModal(data, sugestoes, user, msgExtra) {
    // Remove modal existente se houver
    var panel = document.getElementById('rotulagem-panel');
    var backdrop = document.getElementById('rotulagem-backdrop');
    if (panel) panel.remove();
    if (backdrop) backdrop.remove();

    // CSS (apenas 1x)
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
      if (opt && typeof opt === "string" && opt.length > 0) {
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
      // Sempre reativa listener!
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

    divBackdrop.onclick = function (e) {};
  }

  // Exporta sempre para window
  window.openRotulagemModal = openRotulagemModal;

  console.log('[Rotulagem-LOG] Script rotulagem.js carregado.');

})();
