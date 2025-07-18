(function() {
  var UTILS_URL      = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_HTML = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.html';
  var ROTULAGEM_CSS  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css';
  var BACKEND_URL    = 'https://labelling-production.up.railway.app';

  var rotulagemAtiva = false;
  window.loggedUser = window.loggedUser || null;

  function debugLog() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Rotulagem-DEBUG]');
    console.log.apply(console, args);
  }

  // Carrega HTML e CSS do modal
  function loadRotulagemPanel(callback) {
    debugLog('Carregando painel de rotulagem...');
    if (document.getElementById('rotulagem-panel')) {
      debugLog('Painel de rotulagem já está no DOM.');
      return callback();
    }
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
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild); // backdrop
        document.body.appendChild(wrapper.lastElementChild);  // painel
        debugLog('Painel de rotulagem inserido no DOM.');
        callback();
      })
      .catch(function(err){
        console.error('[Rotulagem-DEBUG] Falha ao carregar rotulagem.html:', err);
      });
  }

  window.openRotulagemModal = function(data, options, user, msgExtra) {
    debugLog('Chamando openRotulagemModal...', data, options, user);
    loadRotulagemPanel(function() {
      var panel = document.getElementById('rotulagem-panel');
      var backdrop = document.getElementById('rotulagem-backdrop');
      panel.style.display = '';
      backdrop.style.display = '';

      document.getElementById('rotulagem-msg-extra').innerHTML = msgExtra || 'Selecione ou digite o nome da sessão desse elemento.';
      document.getElementById('rotulagem_msg').textContent = '';
      var dl = document.getElementById('rotulagem_options');
      dl.innerHTML = '';
      (options || []).forEach(function(opt) {
        if (opt) {
          var op = document.createElement('option');
          op.value = opt;
          dl.appendChild(op);
        }
      });
      var inp = document.getElementById('rotulagem_input');
      inp.value = '';
      inp.focus();

      function closeModal() {
        panel.style.display = 'none';
        backdrop.style.display = 'none';
      }
      document.getElementById('rotulagem_cancelar').onclick = closeModal;
      document.onkeydown = function(ev) { if (ev.key === 'Escape') closeModal(); };
      backdrop.onclick = function(e) {};

      document.getElementById('rotulagem_salvar').onclick = function() {
        var sessao = inp.value.trim();
        if (!sessao) {
          document.getElementById('rotulagem_msg').textContent = 'Digite a sessão.';
          return;
        }
        var exemplo = Object.assign({}, data, {
          sessao: sessao,
          usuario: user || window.loggedUser || null,
          timestamp: new Date().toISOString()
        });
        debugLog('Salvando exemplo rotulado...', exemplo);
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
            debugLog('Exemplo salvo no backend.');
          } else {
            document.getElementById('rotulagem_msg').textContent = resp.msg || 'Erro ao salvar.';
            debugLog('Erro ao salvar:', resp);
          }
        })
        .catch(function(e){
          document.getElementById('rotulagem_msg').textContent = 'Falha ao salvar: ' + e;
          debugLog('Falha ao salvar:', e);
        });
      };
    });
  };

  // --- ROTULAGEM UX (ATIVAÇÃO DE CLIQUE) ---
  window.startRotulagemUX = function() {
    if (rotulagemAtiva) {
      debugLog('Rotulagem já ativa, ignorando.');
      return;
    }
    rotulagemAtiva = true;
    debugLog('Ativando listener de clique para rotulagem UX.');
    // Garantir utils
    var tryCount = 0;
    function esperarUtils(cb) {
      if (typeof getSelectorTripa === 'function' &&
          typeof getElementRelativePosition === 'function' &&
          typeof getFullSelector === 'function' &&
          typeof getHeadingAndParagraphContext === 'function') {
        cb();
      } else {
        tryCount++;
        if (tryCount > 40) return debugLog('Falha ao carregar utils.js');
        setTimeout(function(){ esperarUtils(cb); }, 100);
      }
    }
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      esperarUtils(function() {
        if (window.__rotulagem_taxonomia_click) {
          document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
          debugLog('Listener antigo de clique removido.');
        }
        window.__rotulagem_taxonomia_click = function(e) {
          debugLog('Clique detectado em:', e.target);
          if (
            document.getElementById('rotulagem-panel') ||
            document.getElementById('login-panel')
          ) {
            debugLog('Painel de rotulagem/login já aberto, ignorando clique.');
            return;
          }
          try {
            var el = e.target;
            debugLog('Coletando dados do elemento clicado...');
            var selectorTripa = getSelectorTripa(el);
            var data = {
              position: getElementRelativePosition(el),
              selectorTripa: selectorTripa,
              contextHeadingsParagraphs: getHeadingAndParagraphContext(selectorTripa),
              fullSelector: getFullSelector(el),
              text: el.innerText,
              html: el.outerHTML
            };
            debugLog('Dados coletados:', data);
            var options = ["header", "footer", "menu", "main", "hero", "conteúdo", "rodapé", "aside", "article", "banner"];
            if (data.contextHeadingsParagraphs && data.contextHeadingsParagraphs.length > 0) {
              data.contextHeadingsParagraphs.forEach(function(ctx) {
                options = options.concat((ctx.headings || []), (ctx.paragraphs || []));
              });
            }
            options = Array.from(new Set(options.filter(Boolean)));
            debugLog('Abrindo painel de rotulagem com opções:', options);
            window.openRotulagemModal(data, options, window.loggedUser, 'Rotule este exemplo e salve!');
          } catch (err) {
            console.error('[Rotulagem-DEBUG] Erro ao preparar dados para rotulagem:', err);
          }
        };
        document.addEventListener('click', window.__rotulagem_taxonomia_click, true);
        debugLog('Listener de clique adicionado. Pronto para rotulagem.');
      });
    });
  };

  // --- ENVIO PARA TREINAMENTO (manual, chamar do console) ---
  window.enviarRotulosParaTreinamento = function() {
    debugLog('Enviando exemplos para treinamento...');
    fetch(BACKEND_URL + '/api/treinamento', { method: 'POST' })
      .then(function(resp) { return resp.json(); })
      .then(function(ret) {
        if (ret.ok) {
          debugLog('Modelo treinado com sucesso! Pronto para taxonomizar automaticamente.');
        } else {
          debugLog('Erro no treinamento:', ret);
        }
      })
      .catch(function(err) {
        debugLog('Falha ao treinar:', err);
      });
  };

  debugLog('Script carregado.');
})();
