(function() {
  var UTILS_URL = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_URL = 'https://guirofeoli.github.io/labelling/rotulagem.js';
  var USERS_URL = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
  var BACKEND_URL = 'https://labelling-production.up.railway.app';

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

  function showLoginModal(onSuccess) {
    var modal = document.createElement('div');
    modal.style = 'background:#fff;padding:20px 24px 16px 24px;border:1.2px solid #333;position:fixed;top:30%;left:50%;transform:translateX(-50%);z-index:9999;border-radius:8px;min-width:280px;font-family:sans-serif;';
    modal.innerHTML = `
      <h3 style="margin:0 0 10px 0;">Login para rotulagem</h3>
      <input type="text" id="userLogin" placeholder="Usuário" style="display:block;margin-bottom:10px;width:98%">
      <input type="password" id="userPass" placeholder="Senha" style="display:block;margin-bottom:10px;width:98%">
      <button id="loginBtn" style="margin-top:6px;">Entrar</button>
      <button id="cancelLoginBtn" style="margin-left:10px;">Cancelar</button>
      <div id="loginMsg" style="color:red;margin-top:10px;"></div>
    `;
    document.body.appendChild(modal);

    document.getElementById('cancelLoginBtn').onclick = function() {
      document.body.removeChild(modal);
    };

    document.getElementById('loginBtn').onclick = function() {
      var login = document.getElementById('userLogin').value;
      var pass = document.getElementById('userPass').value;
      fetch(USERS_URL)
        .then(function(resp) { return resp.json(); })
        .then(function(users) {
          var found = users.find(function(u) {
            return u.user === login && u.pass === pass;
          });
          if (found) {
            loggedUser = found.user;
            document.body.removeChild(modal);
            console.log('[Orquestrador] Login realizado:', loggedUser);
            if (typeof onSuccess === 'function') onSuccess();
          } else {
            document.getElementById('loginMsg').textContent = 'Usuário ou senha inválidos.';
          }
        })
        .catch(function(e) {
          document.getElementById('loginMsg').textContent = 'Erro ao validar usuário: ' + e;
        });
    };
  }

  function getDefaultSessions() {
    return [
      "header", "footer", "menu", "main", "hero", "conteúdo", "rodapé", "aside", "article", "banner"
    ];
  }

  function suggestManualLabel(data, options, msgExtra) {
    var suggest = document.createElement('div');
    suggest.style = 'background:#ffe9b5;padding:16px 18px;border:1px solid #e7ad00;position:fixed;top:12%;left:50%;transform:translateX(-50%);z-index:9999;border-radius:8px;min-width:330px;font-family:sans-serif;';
    suggest.innerHTML = `
      <div><strong>${msgExtra ? msgExtra : 'Sessão não reconhecida com confiança suficiente.'}</strong></div>
      <div style="margin:10px 0 13px 0;">Se você for um usuário autorizado, clique abaixo para rotular manualmente.</div>
      <button id="manualLabelBtn" style="background:#149C3B;color:#fff;padding:6px 22px;border:none;border-radius:6px;">Rotular sessão</button>
      <button id="closeSuggestBtn" style="margin-left:10px;background:#aaa;color:#fff;padding:6px 18px;border:none;border-radius:6px;">Fechar</button>
    `;
    document.body.appendChild(suggest);
    document.getElementById('closeSuggestBtn').onclick = function() {
      document.body.removeChild(suggest);
    };
    document.getElementById('manualLabelBtn').onclick = function() {
      if (loggedUser) {
        document.body.removeChild(suggest);
        loadScriptOnce(ROTULAGEM_URL, 'rotulagemLoaded', function() {
          window.openRotulagemModal(data, options || [], loggedUser);
        });
      } else {
        showLoginModal(function() {
          document.body.removeChild(suggest);
          loadScriptOnce(ROTULAGEM_URL, 'rotulagemLoaded', function() {
            window.openRotulagemModal(data, options || [], loggedUser);
          });
        });
      }
    };
  }

  function handleClick(e) {
    if (isLoadingUtils) {
      console.log('[Orquestrador] Ignorando clique: utils.js ainda carregando.');
      return;
    }
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      try {
        var el = e.target;
        if (typeof getElementRelativePosition !== 'function' || typeof getSelectorTripa !== 'function' || typeof getFullSelector !== 'function' || typeof getHeadingAndParagraphContext !== 'function') {
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
          // Modelo ainda não existe: sempre rotulagem manual com opções default + headings + paragraphs do contexto
          var options = getDefaultSessions();
          if (data.contextHeadingsParagraphs && data.contextHeadingsParagraphs.length > 0) {
            data.contextHeadingsParagraphs.forEach(function(ctx) {
              options = options.concat((ctx.headings || []), (ctx.paragraphs || []));
            });
          }
          // Remove duplicados
          options = Array.from(new Set(options.filter(Boolean)));
          suggestManualLabel(data, options, "Ainda não há modelo treinado.<br>É necessário rotular exemplos antes de treinar.");
          return;
        }

        // Se modelo existe, fluxo normal:
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
    var modals = [
      document.getElementById('loginBtn')?.closest('div'),
      document.getElementById('manualLabelBtn')?.closest('div'),
      document.getElementById('fecharModal')?.closest('div')
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
