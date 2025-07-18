(function() {
  // URLs para assets
  var UTILS_URL     = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_HTML = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.html';
  var ROTULAGEM_CSS  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css';
  var BACKEND_URL   = 'https://labelling-production.up.railway.app';

  var loggedUser = null;

  // Heurística local baseada nas regras fornecidas
  function getHeuristicSessions(el, selectorTripa) {
    var heuristicas = [];
    for (var i = 1; i < selectorTripa.length; i++) { // Começa dos pais acima do alvo
      var selector = selectorTripa[i].selector;
      var node = document.querySelector(selector);
      if (!node) continue;
      var tag = (node.tagName || '').toLowerCase();
      var cls = (node.className || '').toLowerCase();
      var style = window.getComputedStyle(node);

      // Heading alto
      if (tag === 'h1' || tag === 'h2') {
        if (node.innerText.trim().length > 0) heuristicas.push(node.innerText.trim());
      }
      // Parágrafo grande
      if (tag === 'p' && parseFloat(style.fontSize) > 20) {
        if (node.innerText.trim().length > 0) heuristicas.push(node.innerText.trim());
      }
      if (cls.match(/paragraph|paragrafo/) && parseFloat(style.fontSize) > 20) {
        if (node.innerText.trim().length > 0) heuristicas.push(node.innerText.trim());
      }
      // Tag/classe especial
      if (tag.match(/session|header|menu|whatsapp|footer|modal|swipper|article|main|hero/)) {
        heuristicas.push(tag);
      }
      if (cls.match(/session|header|menu|whatsapp|footer|modal|swipper|article|main|hero/)) {
        heuristicas.push(tag + '.' + cls);
      }
    }
    return Array.from(new Set(heuristicas.filter(Boolean)));
  }

  // Carrega modal rotulagem.html/css se necessário
  function loadRotulagemPanel(callback) {
    if (document.getElementById('rotulagem-panel')) return callback();
    var cssId = 'rotulagem-css';
    if (!document.getElementById(cssId)) {
      var link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = ROTULAGEM_CSS;
      document.head.appendChild(link);
    }
    fetch(ROTULAGEM_HTML)
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild); // backdrop
        document.body.appendChild(wrapper.lastElementChild);  // painel
        callback();
      });
  }

  // Painel/modal de rotulagem
  window.openRotulagemModal = function(data, heuristicas, user, msgExtra) {
    // Consulta modelo ML backend (sugestão automática)
    fetch(BACKEND_URL + '/api/inteligencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(resp) { return resp.json(); })
    .then(function(sug) {
      var suggestedSession = (sug && sug.sessao) ? sug.sessao : '';
      var confidence       = (sug && sug.confidence) ? sug.confidence : null;

      loadRotulagemPanel(function () {
        var panel = document.getElementById('rotulagem-panel');
        var backdrop = document.getElementById('rotulagem-backdrop');
        panel.style.display = '';
        backdrop.style.display = '';

        document.getElementById('rotulagem-msg-extra').innerHTML =
          (suggestedSession ?
            '<b>Sugestão automática:</b> <span style="color: #149C3B">' + suggestedSession + (confidence ? ' (' + Math.round(confidence * 100) + '%)' : '') + '</span><br>'
            : '') +
          (msgExtra || 'Selecione ou digite o nome da sessão desse elemento.');

        document.getElementById('rotulagem_msg').textContent = '';

        // Preencher datalist: sugestão do ML + heurísticas
        var dl = document.getElementById('rotulagem_options');
        dl.innerHTML = '';
        var opts = heuristicas.slice();
        if (suggestedSession && opts.indexOf(suggestedSession) === -1) {
          opts.unshift(suggestedSession);
        }
        opts.forEach(function (opt) {
          if (opt) {
            var op = document.createElement('option');
            op.value = opt;
            dl.appendChild(op);
          }
        });

        // Preenche input (prefere modelo, senão primeira heurística)
        var inp = document.getElementById('rotulagem_input');
        inp.value = suggestedSession || opts[0] || '';
        inp.focus();

        // Cancela
        function closeModal() {
          panel.style.display = 'none';
          backdrop.style.display = 'none';
        }
        document.getElementById('rotulagem_cancelar').onclick = closeModal;
        document.onkeydown = function(ev) { if (ev.key === 'Escape') closeModal(); };
        backdrop.onclick = function(e) {}; // não fecha ao clicar fora

        // Salvar
        document.getElementById('rotulagem_salvar').onclick = function() {
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
          fetch(BACKEND_URL + '/api/rotulo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(exemplo)
          })
          .then(function(resp) { return resp.json(); })
          .then(function(resp) {
            if (resp.ok) {
              closeModal();
              var okmsg = document.createElement('div');
              okmsg.style = 'position:fixed;top:20%;left:50%;transform:translate(-50%,0);background:#149C3B;color:#fff;padding:13px 23px;border-radius:9px;font-size:1.08em;z-index:100000;';
              okmsg.textContent = 'Exemplo salvo! Total rotulados: ' + (resp.total || '');
              document.body.appendChild(okmsg);
              setTimeout(function(){ okmsg.parentNode && okmsg.parentNode.removeChild(okmsg); }, 1400);
            } else {
              document.getElementById('rotulagem_msg').textContent = resp.msg || 'Erro ao salvar.';
            }
          })
          .catch(function(e){
            document.getElementById('rotulagem_msg').textContent = 'Falha ao salvar: ' + e;
          });
        };
      });
    });
  };

  // Ativa listener de clique para rotulagem
  window.startRotulagemUX = function() {
    // Load utils.js first
    var _do = function() {
      if (window.__rotulagem_taxonomia_click) {
        document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
      }
      window.__rotulagem_taxonomia_click = function(e) {
        if (
          document.getElementById('taxo-model-missing') ||
          document.getElementById('rotulagem-panel') ||
          document.getElementById('login-panel')
        ) {
          return;
        }
        var el = e.target;
        try {
          // Usando o utils.js carregado
          var selectorTripa = window.getSelectorTripa(el);
          var data = {
            position: window.getElementRelativePosition(el),
            selectorTripa: selectorTripa,
            contextHeadingsParagraphs: window.getHeadingAndParagraphContext(selectorTripa),
            fullSelector: window.getFullSelector(el),
            text: el.innerText,
            html: el.outerHTML
          };
          // Sugestões heurísticas
          var heuristicas = getHeuristicSessions(el, selectorTripa);
          window.openRotulagemModal(data, heuristicas, window.loggedUser, 'Rotule este exemplo e salve!');
        } catch (err) {
          console.error('[Rotulagem-DEBUG] Erro ao preparar dados para rotulagem:', err);
        }
      };
      document.addEventListener('click', window.__rotulagem_taxonomia_click, true);
      console.log('%c[Labelling] Pronto! Clique em qualquer elemento da página para iniciar a rotulagem UX.', 'color:#1b751b;font-weight:bold;');
    };
    if (typeof window.getFullSelector !== 'function') {
      var script = document.createElement('script');
      script.src = UTILS_URL;
      script.onload = _do;
      document.head.appendChild(script);
    } else {
      _do();
    }
  };

  // Exporta para window (caso precise invocar manualmente)
  window.rotulagemInternals = {
    startRotulagemUX: window.startRotulagemUX,
    openRotulagemModal: window.openRotulagemModal
  };

  console.log('[Rotulagem] Script carregado.');
})();
