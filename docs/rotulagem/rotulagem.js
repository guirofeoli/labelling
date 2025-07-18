(function () {
  // Utilitário: sugestões reais acima do elemento clicado
  function getSessionTextsAbove(element) {
    var candidates = [];
    var current = element.parentElement;
    var KEYWORDS = /(session|header|menu|whatsapp|footer|modal|swiper|article|main|hero)/i;

    while (
      current &&
      current.tagName &&
      current.tagName !== 'BODY' &&
      current.tagName !== 'HTML'
    ) {
      var tag = current.tagName;
      var classes = (current.className || '').toLowerCase();
      var text = (current.innerText || '').trim();
      var fontSize = parseFloat(window.getComputedStyle(current).fontSize) || 0;

      // Critério 1: H1/H2
      if ((tag === 'H1' || tag === 'H2') && text.length > 0) {
        candidates.push(text);
      }
      // Critério 2: Parágrafo real
      else if (
        (tag === 'P' || classes.indexOf('paragraph') !== -1 || classes.indexOf('paragrafo') !== -1) &&
        fontSize > 20 &&
        text.length > 0
      ) {
        candidates.push(text);
      }
      // Critério 3: Palavras-chave em tag/classe
      else if ((KEYWORDS.test(tag) || KEYWORDS.test(classes)) && text.length > 0) {
        candidates.push(text);
      }

      current = current.parentElement;
    }
    // Remove duplicados e vazios
    return Array.from(new Set(candidates.filter(Boolean)));
  }

  // Função para abrir o modal
  function openRotulagemModal(data, sugestoes, user, msgExtra) {
    // Remove modal existente, se houver
    var panel = document.getElementById('rotulagem-panel');
    var backdrop = document.getElementById('rotulagem-backdrop');
    if (panel) panel.remove();
    if (backdrop) backdrop.remove();

    // Adiciona CSS (apenas 1x)
    if (!document.getElementById('rotulagem-css')) {
      var link = document.createElement('link');
      link.id = 'rotulagem-css';
      link.rel = 'stylesheet';
      link.href = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css';
      document.head.appendChild(link);
    }

    // Cria HTML do modal
    var divBackdrop = document.createElement('div');
    divBackdrop.id = 'rotulagem-backdrop';
    divBackdrop.style.display = 'block';
    document.body.appendChild(divBackdrop);

    var divPanel = document.createElement('div');
    divPanel.id = 'rotulagem-panel';
    divPanel.style.display = 'block';
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

    // Popula o datalist
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
      // LOG no front
      console.log('[Rotulagem-LOG] Salvando exemplo:', exemplo);
      fetch('https://labelling-production.up.railway.app/api/rotulo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exemplo)
      })
        .then(r => r.json())
        .then(resp => {
          console.log('[Rotulagem-LOG] Resposta do backend:', resp);
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
    // Não fecha ao clicar no backdrop
    divBackdrop.onclick = function (e) {};
  }

  // Main handler de clique
  function handleRotulagemClick(e) {
    try {
      var element = e.target;
      var sugestoes = getSessionTextsAbove(element);
      // LOG de clique e sugestões
      console.log('[Rotulagem-LOG] Clique detectado em:', element, 'Sugestões:', sugestoes);

      var data = {
        clicked: {
          tag: element.tagName,
          classes: (element.className || ""),
          text: (element.innerText || "").trim(),
          fontSize: parseFloat(window.getComputedStyle(element).fontSize) || 0,
          selector: window.getFullSelector ? getFullSelector(element) : "",
        }
        // Se quiser salvar mais contexto, adicione aqui
      };

      openRotulagemModal(data, sugestoes.length ? sugestoes : ['header', 'main', 'menu', 'footer'], window.loggedUser, "Rotule este exemplo e salve!");
    } catch (err) {
      alert('Falha ao sugerir sessão: ' + err);
      console.error(err);
    }
  }

  // Remove listener duplicado
  if (window.__rotulagem_taxonomia_click) {
    document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
  }
  window.__rotulagem_taxonomia_click = handleRotulagemClick;
  document.addEventListener('click', window.__rotulagem_taxonomia_click, true);

  console.log('[Rotulagem-LOG] Listener de clique ativo.');
})();
