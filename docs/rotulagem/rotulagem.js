(function() {
  var UTILS_URL      = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_URL  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.js';
  var LOGIN_URL      = 'https://guirofeoli.github.io/labelling/login/login.js';
  var USERS_URL      = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
  var BACKEND_URL    = 'https://labelling-production.up.railway.app';

  var loggedUser = null;
  var isLoadingUtils = false;
  var modelReady = false;

  // Adiciona painel de aviso se não houver modelo
  function showModelMissingNotice() {
    if (document.getElementById('taxo-model-missing')) return;
    var div = document.createElement('div');
    div.id = 'taxo-model-missing';
    div.style = 'position:fixed;top:36%;left:50%;transform:translate(-50%, -50%);background:#fffbe6;border:2px solid #e7ad00;padding:32px 34px 26px 34px;font-size:1.25em;z-index:99999;border-radius:15px;min-width:350px;text-align:center;box-shadow:0 2px 22px #4442;font-family:sans-serif;';
    div.innerHTML = "<b>⚠️ Ainda não há modelo treinado.</b><br><br>Rotule exemplos manualmente antes de treinar.<br><br><small>Clique desabilitado.</small>";
    document.body.appendChild(div);
  }

  function hideModelMissingNotice() {
    var div = document.getElementById('taxo-model-missing');
    if (div) div.parentNode.removeChild(div);
  }

  function loadScriptOnce(url, flag, callback) {
    if (window[flag]) return callback();
    if (isLoadingUtils && flag === 'utilsLoaded') return;
    if (flag === 'utilsLoaded') isLoadingUtils = true;
    var script = document.createElement('script');
    script.src = url;
    script.onload = function() {
      window[flag] = true;
      if (flag === 'utilsLoaded') isLoadingUtils = false;
      callback();
    };
    script.onerror = function() {
      if (flag === 'utilsLoaded') isLoadingUtils = false;
      alert('Erro ao carregar script necessário: ' + url);
    };
    document.head.appendChild(script);
  }

  function getDefaultSessions() {
    return [
      "header", "footer", "menu", "main", "hero", "conteúdo", "rodapé", "aside", "article", "banner"
    ];
  }

  function openManualLabelling(data, options, msgExtra) {
    loadScriptOnce(ROTULAGEM_URL, 'rotulagemLoaded', function() {
      window.openRotulagemModal(data, options || [], loggedUser, msgExtra);
    });
  }

  // Função global de login manual
  window.loginTaxonomista = function(cb) {
    loadScriptOnce(LOGIN_URL, 'loginLoaded', function() {
      window.openLoginModal(function(user){
        loggedUser = user;
        if (typeof cb === 'function') cb(loggedUser);
      }, USERS_URL);
    });
  };

  function suggestManualLabel(data, options, msgExtra) {
    // Só pede login se tentar salvar e não estiver logado (feito dentro do painel de rotulagem)
    openManualLabelling(data, options, msgExtra);
  }

  function handleClick(e) {
    if (!modelReady) {
      // Bloqueia cliques se não há modelo
      return;
    }
    if (isLoadingUtils) return;
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      try {
        var el = e.target;
        if (typeof getElementRelativePosition !== 'function' ||
            typeof getSelectorTripa !== 'function' ||
            typeof getFullSelector !== 'function' ||
            typeof getHeadingAndParagraphContext !== 'function') {
          alert('[Orquestrador] utils.js não carregado corretamente.');
          return;
        }
        var selectorTripa = getSelectorTripa(el);
        var data = {
          position: getElementRelativePosition(el),
          selectorTripa: selectorTripa,
          contextHeadingsParagraphs: getHeadingAndParagraphContext(selectorTripa),
          fullSelector: getFullSelector(el),
          text: el.innerText,
          html: el.outerHTML
        };
        if (!modelReady) return; // Extra segurança

        fetch(BACKEND_URL + '/api/inteligencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function(resp) { return resp.json(); })
        .then(function(resp) {
          if (!resp || !resp.sessao || resp.confidence < 0.8) {
            suggestManualLabel(data, resp.options || []);
          } else {
            // Aqui pode exibir um feedback visual, se quiser
            console.log('[Taxonomia] Sessão detectada:', resp.sessao, 'Confiança:', resp.confidence);
          }
        })
        .catch(function(err) {
          alert('Erro ao consultar backend: ' + err);
        });
      } catch (e) {
        console.error('[Orquestrador] Erro ao processar clique:', e);
      }
    });
  }

  // Evita múltiplos listeners
  document.removeEventListener('click', window.__orquestrador_clickHandler, true);
  window.__orquestrador_clickHandler = function(e) {
    var modals = [
      document.getElementById('login-panel'),
      document.getElementById('rotulagem-panel')
    ];
    for (var i=0; i<modals.length; i++) {
      if (modals[i] && modals[i].contains(e.target)) {
        return;
      }
    }
    handleClick(e);
  };

  // Checa modelo treinado ao carregar
  fetch(BACKEND_URL + '/api/model_status')
    .then(function(resp) { return resp.json(); })
    .then(function(status) {
      modelReady = !!status.model_trained;
      if (!modelReady) {
        showModelMissingNotice();
        document.removeEventListener('click', window.__orquestrador_clickHandler, true);
      } else {
        hideModelMissingNotice();
        document.addEventListener('click', window.__orquestrador_clickHandler, true);
      }
    })
    .catch(function() {
      modelReady = false;
      showModelMissingNotice();
      document.removeEventListener('click', window.__orquestrador_clickHandler, true);
    });

  console.log('[Orquestrador] Pronto para taxonomizar! Clique em qualquer elemento.');
})();
