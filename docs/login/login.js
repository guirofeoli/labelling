(function(){
  // Carrega HTML e CSS se não carregados ainda
  function loadLoginUI(callback) {
    if (document.getElementById('login-panel')) return callback();
    fetch('https://guirofeoli.github.io/labelling/login/login.html')
      .then(r => r.text())
      .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        var cssId = 'login-css';
        if (!document.getElementById(cssId)) {
          var link = document.createElement('link');
          link.id = cssId;
          link.rel = 'stylesheet';
          link.href = 'https://guirofeoli.github.io/labelling/login/login.css';
          document.head.appendChild(link);
        }
        callback();
      });
  }

  // Exibe painel de login e executa callback ao sucesso
  window.openLoginModal = function(onSuccess, USERS_URL) {
    loadLoginUI(function() {
      var panel = document.getElementById('login-panel');
      panel.style.display = '';
      document.getElementById('loginMsg').textContent = '';

      document.getElementById('cancelLoginBtn').onclick = function() {
        panel.style.display = 'none';
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
              panel.style.display = 'none';
              if (typeof onSuccess === 'function') onSuccess(found.user);
            } else {
              document.getElementById('loginMsg').textContent = 'Usuário ou senha inválidos.';
            }
          })
          .catch(function(e) {
            document.getElementById('loginMsg').textContent = 'Erro ao validar usuário: ' + e;
          });
      };
    });
  };
})();
