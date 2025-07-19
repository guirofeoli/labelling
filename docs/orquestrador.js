(function() {
  var UTILS_URL     = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_URL = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.js';
  var LOGIN_URL     = 'https://guirofeoli.github.io/labelling/login/login.js';
  var USERS_URL     = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
  var BACKEND_URL   = 'https://labelling-production.up.railway.app';

  var loggedUser = null;
  var modelReady = false;

  function loadScriptOnce(url, flag, callback) {
    if (window[flag]) return callback && callback();
    var script = document.createElement('script');
    script.src = url;
    script.onload = function() {
      window[flag] = true;
      callback && callback();
    };
    script.onerror = function() {
      alert('Erro ao carregar script: ' + url);
    };
    document.head.appendChild(script);
  }

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

  window.startRotulagemUX = function() {
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      loadScriptOnce(ROTULAGEM_URL, 'rotulagemLoaded', function() {
        if (window.__rotulagem_taxonomia_click) {
          document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
        }
        window.__rotulagem_taxonomia_click = function(e) {
          // Bloqueia se algum painel já está aberto
          if (
            document.getElementById('taxo-model-missing') ||
            document.getElementById('rotulagem-panel') ||
            document.getElementById('login-panel')
          ) {
            return;
          }
          // Manda o clique para o rotulagem.js (que precisa estar global)
          if (typeof window.openRotulagemModal !== 'function') {
            alert('Função openRotulagemModal não carregada!');
            return;
          }
          var el = e.target;
          // Sugestão inteligente via função do rotulagem.js
          window.sugerirEShowRotulagem(el, loggedUser);
        };
        document.addEventListener('click', window.__rotulagem_taxonomia_click, true);
        console.log('[Labelling] Pronto! Clique em qualquer elemento da página para iniciar a rotulagem UX.');
      });
    });
  };

  // Exibe aviso se não houver modelo treinado
  window.showModelMissingNotice = function() {
    console.log('[Labelling] Ainda não há modelo treinado.');
  };
  window.hideModelMissingNotice = function() {
    var div = document.getElementById('taxo-model-missing');
    if (div) div.parentNode.removeChild(div);
  };

  // Envio para treinamento
  window.enviarRotulosParaTreinamento = function() {
    fetch(BACKEND_URL + '/api/treinamento', { method: 'POST' })
      .then(function(resp) { return resp.json(); })
      .then(function(ret) {
        if (ret.ok) {
          console.log('[TREINAMENTO] Modelo treinado com sucesso!');
        } else {
          console.warn('[TREINAMENTO] Erro no treinamento:', ret);
        }
      })
      .catch(function(err) {
        console.warn('[TREINAMENTO] Falha ao treinar:', err);
      });
  };

  // Checa status do modelo no load
  fetch(BACKEND_URL + '/api/model_status')
    .then(function(resp) { return resp.json(); })
    .then(function(status) {
      modelReady = !!status.model_trained;
      if (!modelReady) {
        window.showModelMissingNotice();
        console.log('[Labelling] Para começar, faça login com: window.loginTaxonomista()');
      } else {
        window.startRotulagemUX();
        console.log('[Orquestrador] Pronto para taxonomizar! Clique em qualquer elemento.');
      }
    })
    .catch(function() {
      modelReady = false;
      window.showModelMissingNotice();
      console.log('[Labelling] Falha ao consultar status do modelo. Tente novamente mais tarde.');
    });

  console.log('[Orquestrador] Script carregado.');
})();
