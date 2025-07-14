(function() {
  var UTILS_URL      = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_URL  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.js';
  var LOGIN_URL      = 'https://guirofeoli.github.io/labelling/login/login.js';
  var USERS_URL      = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
  var BACKEND_URL    = 'https://labelling-production.up.railway.app';

  var loggedUser = null;
  var isLoadingUtils = false;
  var modelReady = false;

  // --- FUNÇÕES DE CARREGAMENTO DE SCRIPTS ---
  function loadScriptOnce(url, flag, callback) {
    if (window[flag]) return callback();
    if (isLoadingUtils && flag === 'utilsLoaded') return;
    if (flag === 'utilsLoaded') isLoadingUtils = true;
    var script = document.createElement('script');
    script.src = url;
    script.onload = function() {
      window[flag] = true;
      if (flag === 'utilsLoaded') isLoadingUtils = false;
      if (callback) callback();
    };
    script.onerror = function() {
      if (flag === 'utilsLoaded') isLoadingUtils = false;
      alert('Erro ao carregar script necessário: ' + url);
    };
    document.head.appendChild(script);
  }

  // --- LOGIN manual pelo console ---
  window.loginTaxonomista = function(callbackAfterLogin) {
    loadScriptOnce(LOGIN_URL, 'loginLoaded', function() {
      window.openLoginModal(function(user){
        loggedUser = user;
        if (typeof callbackAfterLogin === 'function') callbackAfterLogin(user);
        // Após login bem-sucedido, inicia fluxo de rotulagem guiada:
        window.startRotulagemUX && window.startRotulagemUX();
      }, USERS_URL);
    });
  };

  // --- RENDERIZA ROTULAGEM GUIADA ---
  window.startRotulagemUX = function() {
    // Carrega utils.js e rotulagem.js
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      loadScriptOnce(ROTULAGEM_URL, 'rotulagemLoaded', function() {
        // Aguarda clique do usuário para rotular elementos
        if (window.__rotulagem_taxonomia_click) {
          document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
        }
        window.__rotulagem_taxonomia_click = function(e) {
          // Evita rotular se clicar dentro do painel de rotulagem ou login
          if (
            (document.getElementById('rotulagem-panel') && document.getElementById('rotulagem-panel').contains(e.target)) ||
            (document.getElementById('login-panel') && document.getElementById('login-panel').contains(e.target))
          ) return;

          var el = e.target;
          try {
            var selectorTripa = getSelectorTripa(el);
            var data = {
              position: getElementRelativePosition(el),
              selectorTripa: selectorTripa,
              contextHeadingsParagraphs: getHeadingAndParagraphContext(selectorTripa),
              fullSelector: getFullSelector(el),
              text: el.innerText,
              html: el.outerHTML
            };
            // Opções sugeridas
            var options = ["header","footer","menu","main","hero","conteúdo","rodapé","aside","article","banner"];
            if (data.contextHeadingsParagraphs && data.contextHeadingsParagraphs.length > 0) {
              data.contextHeadingsParagraphs.forEach(function(ctx) {
                options = options.concat((ctx.headings || []), (ctx.paragraphs || []));
              });
            }
            options = Array.from(new Set(options.filter(Boolean)));
            window.openRotulagemModal(data, options, loggedUser, 'Rotule este exemplo e salve!');
          } catch (err) {
            console.error('Erro ao preparar dados para rotulagem:', err);
          }
        };
        document.addEventListener('click', window.__rotulagem_taxonomia_click, true);
        console.log('%c[Labelling] Pronto! Clique em qualquer elemento da página para iniciar a rotulagem UX.', 'color:#1b751b;font-weight:bold;');
      });
    });
  };

  // --- EXPORTA RÓTULOS PARA TREINAMENTO ---
  window.enviarRotulosParaTreinamento = function() {
    fetch(BACKEND_URL + '/api/treinamento', { method: 'POST' })
      .then(function(resp) { return resp.json(); })
      .then(function(ret) {
        if (ret.ok) {
          console.log('%c[TREINAMENTO] Modelo treinado com sucesso! Pronto para taxonomizar automaticamente.', 'color:#228c22;font-weight:bold;');
        } else {
          console.warn('[TREINAMENTO] Erro no treinamento:', ret);
        }
      })
      .catch(function(err) {
        console.warn('[TREINAMENTO] Falha ao treinar:', err);
      });
  };

  // --- FLUXO PRINCIPAL ---
  fetch(BACKEND_URL + '/api/model_status')
    .then(function(resp) { return resp.json(); })
    .then(function(status) {
      modelReady = !!status.model_trained;
      if (!modelReady) {
        console.log('%c[Labelling] Ainda não há modelo treinado.', 'color:#b37b00;font-weight:bold;');
        console.log('%c[Labelling] Para começar, faça login com: window.loginTaxonomista()', 'color:#1a2e6b;');
        console.log('[Labelling] Após o login, clique em qualquer elemento da página para rotular exemplos.');
        console.log('%c[Labelling] Quando terminar, envie os exemplos para treinamento com:\nwindow.enviarRotulosParaTreinamento()', 'color:#207cc7;font-weight:bold;');
      } else {
        // --- HABILITA O FLUXO AUTOMÁTICO DE TAXONOMIA POR CLIQUE ---
        document.addEventListener('click', function handleAutoTaxonomia(e) {
          if (isLoadingUtils) return;
          loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
            var el = e.target;
            try {
              var selectorTripa = getSelectorTripa(el);
              var data = {
                position: getElementRelativePosition(el),
                selectorTripa: selectorTripa,
                contextHeadingsParagraphs: getHeadingAndParagraphContext(selectorTripa),
                fullSelector: getFullSelector(el),
                text: el.innerText,
                html: el.outerHTML
              };
              fetch(BACKEND_URL + '/api/inteligencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              })
              .then(function(resp) { return resp.json(); })
              .then(function(resp) {
                if (!resp || !resp.sessao || resp.confidence < 0.8) {
                  // Sugere rotulagem manual se não confiante
                  window.loginTaxonomista(function(){
                    window.startRotulagemUX();
                  });
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
        }, true);
        console.log('%c[Orquestrador] Pronto para taxonomizar! Clique em qualquer elemento.', 'color:#1b751b;font-weight:bold;');
      }
    })
    .catch(function() {
      modelReady = false;
      console.log('%c[Labelling] Falha ao consultar status do modelo. Tente novamente mais tarde.', 'color:#d42a2a;font-weight:bold;');
    });

  console.log('[Orquestrador] Script carregado.');
})();
