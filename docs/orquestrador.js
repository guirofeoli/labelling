(function() {
  var UTILS_URL = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_URL = 'https://guirofeoli.github.io/labelling/rotulagem.js';
  var USERS_URL = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';

  var loggedUser = null;

  function loadScriptOnce(url, flag, callback) {
    if (window[flag]) return callback();
    var script = document.createElement('script');
    script.src = url;
    script.onload = function() {
      window[flag] = true;
      callback();
    };
    document.head.appendChild(script);
  }

  function showLoginModal(onSuccess) {
    var modal = document.createElement('div');
    modal.style = 'background:#fff;padding:20px;border:1px solid #333;position:fixed;top:30%;left:40%;z-index:9999;';
    modal.innerHTML = `
      <h3>Login para rotulagem</h3>
      <input type="text" id="userLogin" placeholder="Usuário" style="display:block;margin-bottom:10px;width:90%">
      <input type="password" id="userPass" placeholder="Senha" style="display:block;margin-bottom:10px;width:90%">
      <button id="loginBtn">Entrar</button>
      <button id="cancelLoginBtn">Cancelar</button>
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
            if (typeof onSuccess === 'function') onSuccess();
          } else {
            document.getElementById('loginMsg').textContent = 'Usuário ou senha inválidos.';
          }
        });
    };
  }

  function suggestManualLabel(data, options) {
    var suggest = document.createElement('div');
    suggest.style = 'background:#ffe9b5;padding:16px;border:1px solid #e7ad00;position:fixed;top:12%;left:35%;z-index:9999;';
    suggest.innerHTML = `
      <div><strong>Sessão não reconhecida com confiança suficiente.</strong></div>
      <div style="margin:10px 0;">Se você for um usuário autorizado, clique abaixo para rotular manualmente.</div>
      <button id="manualLabelBtn">Rotular Sessão</button>
      <button id="closeSuggestBtn" style="margin-left:10px;">Fechar</button>
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
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      var el = e.target;
      var data = {
        position: getElementRelativePosition(el),
        selectorTripa: getSelectorTripa(el),
        parentElements: getAllParentElements(el),
        fullSelector: getFullSelector(el),
        text: el.innerText,
        html: el.outerHTML
      };

      fetch('https://labelling.railway.internal/api/inteligencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(function(resp) { return resp.json(); })
      .then(function(resp) {
        if (!resp || !resp.sessao || resp.confidence < 0.8) {
          suggestManualLabel(data, resp.options || []);
        } else {
          console.log('[Taxonomia] Sessão detectada:', resp.sessao, 'Confiança:', resp.confidence);
        }
      });
    });
  }

  document.addEventListener('click', handleClick, true);

})();
