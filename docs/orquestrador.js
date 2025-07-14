(function() {
  var UTILS_URL      = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_URL  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.js';
  var LOGIN_URL      = 'https://guirofeoli.github.io/labelling/login/login.js';
  var USERS_URL      = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
  var BACKEND_URL    = 'https://labelling-production.up.railway.app';

  var loggedUser = null;
  var isLoadingUtils = false;
  var modelReady = false;

  console.log('[Orquestrador] Script carregado.');

  function loadScriptOnce(url, flag, callback) {
    if (window[flag]) return callback();
    if (isLoadingUtils && flag === 'utilsLoaded') return;
    if (flag === 'utilsLoaded') isLoadingUtils = true;
    var script = document.createElement('script');
    script.src = url;
    script.onload = function() {
      window[flag] = true;
      if (flag === 'utilsLoaded') isLoadingUtils = false;
      console.log('[Orquestrador] Script carregado:', url);
      callback();
    };
    script.onerror = function() {
      if (flag === 'utilsLoaded') isLoadingUtils = false;
      console.error('[Orquestrador] Falha ao carregar script:', url);
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
    // Sempre carrega rotulagem.js que carrega o HTML e CSS do painel
    loadScriptOnce(ROTULAGEM_URL, 'rotulagemLoaded', function() {
      window.openRotulagemModal(data, options || [], loggedUser, msgExtra);
    });
  }

  function askForLogin(onSuccess) {
    loadScriptOnce(LOGIN_URL, 'loginLoaded', function() {
      window.openLoginModal(function(user){
        loggedUser = user;
        if (typeof onSuccess === 'function') onSuccess();
      }, USERS_URL);
    });
  }

  function suggestManualLabel(data, options, msgExtra) {
    // Modal apenas pergunta login se não autenticado, depois rotulagem!
    if (loggedUser) {
      openManualLabelling(data, options, msgExtra);
    } else {
      askForLogin(function() {
        openManualLabelling(data, options, msgExtra);
      });
    }
  }

  function handleClick(e) {
    if (isLoadingUtils) {
      console.log('[Orquestrador] Ignorando clique: utils.js ainda carregando.');
      return;
    }
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
        console.log('[Orquestrador] Dados coletados do clique:', data);

        if (!modelReady) {
          var options = getDefaultSessions();
          if (data.contextHeadingsParagraphs && data.contextHeadingsParagraphs.length > 0) {
            data.contextHeadingsParagraphs.forEach(function(ctx) {
              options = options.concat((ctx.headings || []), (ctx.paragraphs || []));
            });
          }
          options = Array.from(new Set(options.filter(Boolean)));
          suggestManualLabel(data, options, "Ainda não há modelo treinado.<br>É necessário rotular exemplos antes de treinar.");
          return;
        }

        fetch(BACKEND_URL + '/api/inteligencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function(resp) { return resp.json(); })
        .then(function(resp) {
          console.log('[Orquestrador] Resposta backend:', resp);
          if (!resp || !resp.sessao || resp.confidence < 0.8) {
            suggestManualLabel(data, resp.options || []);
          } else {
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
    // Não dispara rotulagem/login se clicou em painel/modal
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
        console.warn('[Orquestrador] Nenhum modelo treinado, fluxos automáticos desativados até treinamento!');
      }
      document.addEventListener('click', window.__orquestrador_clickHandler, true);
    })
    .catch(function() {
      modelReady = false;
      document.addEventListener('click', window.__orquestrador_clickHandler, true);
    });

  console.log('[Orquestrador] Pronto para taxonomizar! Clique em qualquer elemento.');
})();
