(function(){
  var LOGIN_HTML_URL = 'https://guirofeoli.github.io/labelling/login/login.html';
  var LOGIN_CSS_URL  = 'https://guirofeoli.github.io/labelling/login/login.css';

  window.openLoginModal = function(callback, usersUrl) {
    // Remove modais antigos, se existirem
    var old = document.getElementById('login-panel');
    if (old) old.parentNode.removeChild(old);
    var oldBack = document.getElementById('login-backdrop');
    if (oldBack) oldBack.parentNode.removeChild(oldBack);

    // Carrega CSS
    if (!document.getElementById('login-css')) {
      var link = document.createElement('link');
      link.id = 'login-css';
      link.rel = 'stylesheet';
      link.href = LOGIN_CSS_URL;
      document.head.appendChild(link);
    }

    // Carrega HTML
    fetch(LOGIN_HTML_URL)
      .then(function(r) { return r.text(); })
      .then(function(html) {
        // Cria wrapper para parsear o HTML
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild); // backdrop
        document.body.appendChild(wrapper.lastElementChild);  // painel

        // Referências dos elementos
        var userInp = document.getElementById('login_input_user');
        var passInp = document.getElementById('login_input_pass');
        var btnEntrar = document.getElementById('login_btn_entrar');
        var btnCancelar = document.getElementById('login_btn_cancelar');
        var msg = document.getElementById('login_msg');

        // Foco inicial
        userInp.focus();

        btnCancelar.onclick = function(){
          var panel = document.getElementById('login-panel');
          var backdrop = document.getElementById('login-backdrop');
          if (panel) panel.parentNode.removeChild(panel);
          if (backdrop) backdrop.parentNode.removeChild(backdrop);
        };

        btnEntrar.onclick = function(){
          var login = userInp.value.trim();
          var senha = passInp.value.trim();
          msg.textContent = '';
          fetch(usersUrl)
            .then(function(r) { return r.json(); })
            .then(function(users) {
              // Garante compatibilidade com user/senha OU login/senha
              var found = users.find(function(u) {
                return (u.user || u.login) === login && u.senha === senha;
              });
              if (found) {
                // Remove modal
                var panel = document.getElementById('login-panel');
                var backdrop = document.getElementById('login-backdrop');
                if (panel) panel.parentNode.removeChild(panel);
                if (backdrop) backdrop.parentNode.removeChild(backdrop);
                if (typeof callback === 'function') callback(login);
              } else {
                msg.textContent = 'Usuário ou senha inválidos.';
              }
            })
            .catch(function(e) {
              msg.textContent = 'Falha ao validar usuário.';
            });
        };
      });
  };
})();
