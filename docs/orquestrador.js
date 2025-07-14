(function() {
  var UTILS_URL      = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_URL  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.js';
  var LOGIN_URL      = 'https://guirofeoli.github.io/labelling/login/login.js';
  var USERS_URL      = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
  var BACKEND_URL    = 'https://labelling-production.up.railway.app';

  var loggedUser = null;
  var modelReady = false;

  // Modal informativo quando não há modelo treinado
  window.showModelMissingNotice = function() {
    if (document.getElementById('taxo-model-missing')) return;
    var div = document.createElement('div');
    div.id = 'taxo-model-missing';
    div.style = 'position:fixed;top:36%;left:50%;transform:translate(-50%, -50%);background:#fffbe6;border:2px solid #e7ad00;padding:32px 34px 26px 34px;font-size:1.22em;z-index:99999;border-radius:15px;min-width:350px;text-align:center;box-shadow:0 2px 22px #4442;font-family:sans-serif;';
    div.innerHTML = "<b>⚠️ Ainda não há modelo treinado.</b><br><br>Rotule exemplos manualmente antes de treinar.<br><br><small>Clique desabilitado.</small>";
    document.body.appendChild(div);
  };
  window.hideModelMissingNotice = function() {
    var div = document.getElementById('taxo-model-missing');
    if (div) div.parentNode.removeChild(div);
  };

  // Loader
  function loadScriptOnce(url, flag, callback) {
    if (window[flag]) return callback && callback();
    var script = document.createElement('script');
    script.src = url;
    script.onload = function() {
      window[flag] = true;
      callback && callback();
    };
    script.onerror = function() {
      alert('Erro ao carregar script necessário: ' + url);
    };
    document.head.appendChild(script);
  }

  // Login + inicia rotulagem ao sucesso
  window.loginTaxonomista = function(callbackAfterLogin) {
    loadScriptOnce(LOGIN_URL, 'loginLoaded', function() {
      window.openLoginModal(function(user){
        loggedUser = user;
        window.hideModelMissingNotice && window.hideModelMissingNotice();
        window.startRotulagemUX && window.startRotulagemUX();
        if (typeof callbackAfterLogin === 'function') callbackAfterLogin(user);
      }, USERS_URL);
    });
  };

  // Ativa rotulagem manual: clique libera painel de sugestão
  window.startRotulagemUX = function() {
    window.hideModelMissingNotice && window.hideModelMissingNotice(); // Remove modelo ausente SEMPRE
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      loadScriptOnce(ROTULAGEM_URL, 'rotulagemLoaded', function() {
        if (window.__rotulagem_taxonomia_click) {
          document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
        }
        window.__rotulagem_taxonomia_click = function(e) {
          // NÃO abrir se painel/modal já está aberto
          if (
            document.getElementById('taxo-model-missing') ||
            document.getElementById('rotulagem-panel') ||
            document.getElementById('login-panel')
          ) {
            // LOG extra para debug
            if (document.getElementById('taxo-model-missing')) {
              console.log('[DEBUG] Modelo ausente ainda presente. Rotulagem bloqueada.');
            }
            if (document.getElementById('rotulagem-panel')) {
              console.log('[DEBUG] Painel de rotulagem já aberto.');
            }
            if (document.getElementById('login-panel')) {
              console.log('[DEBUG] Painel de login aberto.');
            }
            return;
          }
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
            var options = ["header", "footer", "menu", "main", "hero", "conteúdo", "rodapé", "aside", "article", "banner"];
            if (data.contextHeadingsParagraphs && data.contextHeadingsParagraphs.length > 0) {
              data.contextHeadingsParagraphs.forEach(function(ctx) {
                options = options.concat((ctx.headings || []), (ctx.paragraphs || []));
              });
            }
            options = Array.from(new Set(options.filter(Boolean)));
            console.log('[Rotulagem-DEBUG] Chamando openRotulagemModal:', {data, options, loggedUser});
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

  // Envio de exemplos para treinamento
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

  // Verifica modelo treinado ao carregar o orquestrador
  fetch(BACKEND_URL + '/api/model_status')
    .then(function(resp) { return resp.json(); })
    .then(function(status) {
      modelReady = !!status.model_trained;
      if (!modelReady) {
        window.showModelMissingNotice();
        console.log('%c[Labelling] Ainda não há modelo treinado.', 'color:#b37b00;font-weight:bold;');
        console.log('%c[Labelling] Para começar, faça login com: window.loginTaxonomista()', 'color:#1a2e6b;');
        console.log('[Labelling] Após o login, clique em qualquer elemento da página para rotular exemplos.');
        console.log('%c[Labelling] Quando terminar, envie os exemplos para treinamento com:\nwindow.enviarRotulosParaTreinamento()', 'color:#207cc7;font-weight:bold;');
      } else {
        // Quando modelo pronto, ativa taxonomia automática (caso queira no futuro)
        console.log('%c[Orquestrador] Pronto para taxonomizar! Clique em qualquer elemento.', 'color:#1b751b;font-weight:bold;');
      }
    })
    .catch(function() {
      modelReady = false;
      window.showModelMissingNotice();
      console.log('%c[Labelling] Falha ao consultar status do modelo. Tente novamente mais tarde.', 'color:#d42a2a;font-weight:bold;');
    });

  console.log('[Orquestrador] Script carregado.');
})();
