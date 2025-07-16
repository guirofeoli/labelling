(function() {
  // URLs para assets (ajustadas para raiz do GitHub Pages)
  var UTILS_URL     = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_URL = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.js';
  var LOGIN_URL     = 'https://guirofeoli.github.io/labelling/login/login.js';
  var USERS_URL     = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
  var BACKEND_URL   = 'https://labelling-production.up.railway.app';

  var loggedUser = null;
  var modelReady = false;

  // Avisa apenas via console quando o modelo ainda não foi treinado
  window.showModelMissingNotice = function() {
    console.log('[Labelling] Ainda não há modelo treinado.');
  };
  // Mantida para compatibilidade - remove painel caso alguma versão antiga tenha criado
  window.hideModelMissingNotice = function() {
    var div = document.getElementById('taxo-model-missing');
    if (div) div.parentNode.removeChild(div);
  };

  // Utilitário para carregar scripts externos uma única vez
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

  // Login do taxonomista
  window.loginTaxonomista = function(callbackAfterLogin) {
    loadScriptOnce(LOGIN_URL, 'loginLoaded', function() {
      if (typeof window.openLoginModal !== 'function') {
        console.error('[Login] Falha ao carregar login.js - openLoginModal indisponível');
        return;
      }
      window.openLoginModal(function(user){
        loggedUser = user;
        window.hideModelMissingNotice && window.hideModelMissingNotice();
        window.startRotulagemUX && window.startRotulagemUX();
        if (typeof callbackAfterLogin === 'function') callbackAfterLogin(user);
      }, USERS_URL);
    });
  };

  // Inicia fluxo de rotulagem UX (clique + sugestões)
  window.startRotulagemUX = function() {
    window.hideModelMissingNotice && window.hideModelMissingNotice();
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      loadScriptOnce(ROTULAGEM_URL, 'rotulagemLoaded', function() {
        // Evita múltiplos listeners
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
            var selectorTripa = getSelectorTripa(el);
            var data = {
              position: getElementRelativePosition(el),
              selectorTripa: selectorTripa,
              contextHeadingsParagraphs: getHeadingAndParagraphContext(selectorTripa),
              fullSelector: getFullSelector(el),
              text: el.innerText,
              html: el.outerHTML
            };
            // Sugestões default + contexto dinâmico
            var options = ["header", "footer", "menu", "main", "hero", "conteúdo", "rodapé", "aside", "article", "banner"];
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

  // Função para envio dos rótulos ao backend para treinamento
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

  // Verifica se existe modelo treinado ao carregar o orquestrador
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
