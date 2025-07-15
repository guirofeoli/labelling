(function() {
  // Caminhos corretos SEM /docs
  var LOGIN_HTML_URL = 'https://guirofeoli.github.io/labelling/login/login.html';
  var LOGIN_CSS_URL  = 'https://guirofeoli.github.io/labelling/login/login.css';

  function loadLoginPanel(callback) {
    if (document.getElementById('login-panel')) return callback && callback();
    // CSS
    var cssId = 'login-css';
    if (!document.getElementById(cssId)) {
      var link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = LOGIN_CSS_URL;
      document.head.appendChild(link);
    }
    // HTML
    fetch(LOGIN_HTML_URL)
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild); // backdrop
        document.body.appendChild(wrapper.lastElementChild);  // painel
        callback && callback();
      });
  }

  // Expor função global para abrir o modal
  window.openLoginModal = function(callback, usersUrl) {
    loadLoginPanel(function() {
      var panel = document.getElementById('login-panel');
      var backdrop = document.getElementById('login-backdrop');
      panel.style.display = '';
      backdrop.style.display = '';

      var msg = document.getElementById('login_msg');
      msg.textContent = '';

      function closeLogin() {
        panel.style.display = 'none';
        backdrop.style.display = 'none';
      }
      document.getElementById('login_cancelar').onclick = closeLogin;

      // Fechar com ESC
      document.onkeydown = function(ev) {
        if (ev.key === "Escape") closeLogin();
      };
      backdrop.onclick = function(e) {
        // não fecha ao clicar fora
      };

      document.getElementById('login_entrar').onclick = function() {
        var login = document.getElementById('login_input').value.trim();
        var senha = document.getElementById('login_senha').value.trim();
        if (!login || !senha) {
          msg.textContent = "Digite usuário e senha.";
          return;
        }
        fetch(usersUrl)
          .then(function(r) { return r.json(); })
          .then(function(users) {
            var found = users.find(function(u) {
              return (u.login === login && u.senha === senha);
            });
            if (found) {
              closeLogin();
              if (typeof callback === 'function') callback(found.login);
            } else {
              msg.textContent = "Usuário ou senha inválidos.";
            }
          })
          .catch(function() {
            msg.textContent = "Erro ao buscar usuários.";
          });
      };
    });
  };
})();
