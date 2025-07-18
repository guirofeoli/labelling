(function () {
  var UTILS_URL = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_HTML = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.html';
  var ROTULAGEM_CSS = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css';
  var BACKEND_URL = 'https://labelling-production.up.railway.app';

  var loggedUser = null;

  // Utilitário: carregar scripts externos
  function loadScriptOnce(url, flag, callback) {
    if (window[flag]) return callback && callback();
    var script = document.createElement('script');
    script.src = url;
    script.onload = function () {
      window[flag] = true;
      callback && callback();
    };
    script.onerror = function () {
      alert('Erro ao carregar script necessário: ' + url);
    };
    document.head.appendChild(script);
  }

  // Loader painel
  function loadRotulagemPanel(callback) {
    if (document.getElementById('rotulagem-panel')) return callback();
    // CSS
    var cssId = 'rotulagem-css';
    if (!document.getElementById(cssId)) {
      var link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = ROTULAGEM_CSS;
      document.head.appendChild(link);
    }
    // HTML
    fetch(ROTULAGEM_HTML)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild); // backdrop
        document.body.appendChild(wrapper.lastElementChild); // painel
        callback();
      });
  }

  // Gerar sugestões locais com heurísticas (usando utils.js)
  function gerarSugestoesLocais(data, el) {
    var options = [
      "header", "footer", "menu", "main", "hero", "conteúdo", "rodapé",
      "aside", "article", "banner", "modal", "whatsapp", "session", "swipper"
    ];

    // Adiciona headings ou parágrafos acima do elemento clicado
    if (data && data.selectorTripa) {
      // Pega o contexto mais "alto"
      for (var i = 0; i < data.selectorTripa.length; i++) {
        var ctx = data.selectorTripa[i];
        if (ctx.textSections && ctx.textSections.length) {
          ctx.textSections.forEach(function (sec) {
            if (
              (sec.tag && (sec.tag.match(/^H[12]$/))) ||
              (sec.tag === 'P' && parseFloat(sec.fontSize) >= 20) ||
              (sec.tag && sec.tag.toLowerCase().includes('paragraph'))
            ) {
              options.push(sec.text);
            }
          });
        }
      }
    }

    // Examina elemento e ancestrais por classes/tags de sessão
    var alvo = el;
    for (var j = 0; j < 7 && alvo; j++) {
      var tag = (alvo.tagName || '').toLowerCase();
      var klass = (alvo.className || '').toLowerCase();
      if (
        tag.match(/header|main|footer|menu|hero|aside|article|banner|modal|session|swipper/) ||
        klass.match(/header|main|footer|menu|hero|aside|article|banner|modal|session|swipper|paragraph|paragrafo/)
      ) {
        if (alvo.innerText && alvo.innerText.length > 2) {
          options.push(alvo.innerText.trim());
        }
      }
      alvo = alvo.parentElement;
    }
    // Remove duplicados, limpa espaços
    return Array.from(new Set(options.map(x => (x && x.trim ? x.trim() : x)).filter(Boolean)));
  }

  // Modal de rotulagem: sempre reinicia listener após fechar
  function openRotulagemModal(data, options, user, msgExtra) {
    loadRotulagemPanel(function () {
      var panel = document.getElementById('rotulagem-panel');
      var backdrop = document.getElementById('rotulagem-backdrop');
      panel.style.display = '';
      backdrop.style.display = '';
      document.getElementById('rotulagem-msg-extra').innerHTML = msgExtra || "Selecione ou digite o nome da sessão desse elemento.";
      document.getElementById('rotulagem_msg').textContent = '';
      // Popular datalist
      var dl = document.getElementById('rotulagem_options');
      dl.innerHTML = '';
      (options || []).forEach(function (opt) {
        if (opt) {
          var op = document.createElement('option');
          op.value = opt;
          dl.appendChild(op);
        }
      });
      // Limpa input e foca
      var inp = document.getElementById('rotulagem_input');
      inp.value = '';
      inp.focus();

      // Cancela
      function closeModal() {
        panel.style.display = 'none';
        backdrop.style.display = 'none';
        // Reativa rotulagem para próximos cliques!
        setTimeout(ativarRotulagemUX, 100);
      }
      document.getElementById('rotulagem_cancelar').onclick = closeModal;
      document.onkeydown = function (ev) { if (ev.key === "Escape") closeModal(); };
      backdrop.onclick = function (e) { };

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
        console.log('[Rotulagem-DEBUG] Enviando para /api/rotulo:', exemplo);
        fetch(BACKEND_URL + '/api/rotulo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exemplo)
        })
          .then(function (resp) { return resp.json(); })
          .then(function (resp) {
            if (resp.ok) {
              closeModal();
              var okmsg = document.createElement('div');
              okmsg.style = 'position:fixed;top:20%;left:50%;transform:translate(-50%,0);background:#149C3B;color:#fff;padding:13px 23px;border-radius:9px;font-size:1.08em;z-index:100000;';
              okmsg.textContent = "Exemplo salvo! Total rotulados: " + (resp.total || '');
              document.body.appendChild(okmsg);
              setTimeout(function () { okmsg.parentNode && okmsg.parentNode.removeChild(okmsg); }, 1400);
            } else {
              document.getElementById('rotulagem_msg').textContent = resp.msg || 'Erro ao salvar.';
            }
          })
          .catch(function (e) {
            document.getElementById('rotulagem_msg').textContent = 'Falha ao salvar: ' + e;
          });
      };
    });
  }
  window.openRotulagemModal = openRotulagemModal;

  // --------- Listener principal: clique ---------
  function ativarRotulagemUX() {
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function () {
      // Remove listener antigo se houver
      if (window.__rotulagem_taxonomia_click) {
        document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
      }
      window.__rotulagem_taxonomia_click = function (e) {
        var el = e.target;
        if (
          document.getElementById('rotulagem-panel') ||
          document.getElementById('login-panel')
        ) return;
        // Prepara dados
        var selectorTripa = window.getSelectorTripa ? window.getSelectorTripa(el) : [];
        var data = {
          position: window.getElementRelativePosition ? window.getElementRelativePosition(el) : {},
          selectorTripa: selectorTripa,
          contextHeadingsParagraphs: window.getHeadingAndParagraphContext ? window.getHeadingAndParagraphContext(selectorTripa) : [],
          fullSelector: window.getFullSelector ? window.getFullSelector(el) : '',
          text: el.innerText,
          html: el.outerHTML
        };
        console.log('[Rotulagem-DEBUG] Clique detectado em:', el);
        // Chama backend para sugestão
        fetch(BACKEND_URL + '/api/inteligencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function (resp) { return resp.json(); })
          .then(function (result) {
            var sugestaoBackend = (result && result.sessao) ? [result.sessao] : [];
            var opcoesLocais = gerarSugestoesLocais(data, el);
            var todas = sugestaoBackend.concat(opcoesLocais).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
            console.log('[Rotulagem-DEBUG] Chamando openRotulagemModal...', data, todas, loggedUser, result);
            openRotulagemModal(data, todas, loggedUser, 'Rotule este exemplo e salve!');
          })
          .catch(function (err) {
            console.warn('[Rotulagem-DEBUG] Erro ao consultar /api/inteligencia, caindo para sugestões locais:', err);
            var todas = gerarSugestoesLocais(data, el);
            openRotulagemModal(data, todas, loggedUser, 'Rotule este exemplo e salve!');
          });
      };
      document.addEventListener('click', window.__rotulagem_taxonomia_click, true);
      console.log('[Rotulagem] Pronto para rotular! Clique em qualquer elemento da página.');
    });
  }
  window.ativarRotulagemUX = ativarRotulagemUX;
  window.startRotulagemUX = ativarRotulagemUX;

  console.log('[Rotulagem] Script carregado.');
})();
