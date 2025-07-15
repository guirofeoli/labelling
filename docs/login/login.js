(function() {
  var LOGIN_HTML = 'https://guirofeoli.github.io/labelling/login/login.html';
  var LOGIN_CSS  = 'https://guirofeoli.github.io/labelling/login/login.css';

  // Carrega HTML/CSS do painel de login só uma vez
  function loadLoginPanel(callback) {
    if (document.getElementById('login-panel')) return callback();
    // CSS
    var cssId = 'login-css';
    if (!document.getElementById(cssId)) {
      var link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = LOGIN_CSS;
      document.head.appendChild(link);
    }
    // HTML
    fetch(LOGIN_HTML)
      .then(r => r.text())
      .then(html => {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild); // backdrop
        document.body.appendChild(wrapper.lastElementChild);  // painel
        callback();
      });
  }

  // Exibe o modal de login
  window.openLoginModal = function(onLogin, usersUrl) {
    loadLoginPanel(function() {
      var panel = document.getElementById('login-panel');
      var backdrop = document.getElementById('login-backdrop');
      panel.style.display = 'block';
      backdrop.style.display = 'block';
      document.getElementById('login_input_user').value = '';
      document.getElementById('login_input_pass').value = '';
      document.getElementById('login_msg').textContent = '';


      // Bloqueia navegação enquanto aberto
      document.body.style.overflow = 'hidden';

      // Fechar
      function closeModal() {
        panel.style.display = 'none';
        backdrop.style.display = 'none';
        document.body.style.overflow = '';
        document.onkeydown = null;
      }
      document.getElementById('login_cancelar').onclick = closeModal;
      backdrop.onclick = function() {}; // Não fecha ao clicar fora
      document.onkeydown = function(ev) {
        if (ev.key === "Escape") closeModal();
      };
      // Login
      document.getElementById('login_form').onsubmit = function(ev) {
        ev.preventDefault();
        var login = document.getElementById('login_input_user').value.trim();
        var senha = document.getElementById('login_input_pass').value;
        if (!login || !senha) {
          document.getElementById('login_msg').textContent = 'Preencha usuário e senha.';
          return;
        }
        fetch(usersUrl)
          .then(r => r.json())
          .then(function(users) {
            // Novo padrão: [{ "login": "...", "senha": "..." }]
            var found = users.find(function(u) {
              return (
                (u.login && u.login === login) &&
                (u.senha && u.senha === senha)
              );
            });
            if (found) {
              closeModal();
              if (typeof onLogin === 'function') onLogin(found.login);
              console.log('[Login] Login realizado com sucesso:', found.login);
            } else {
              document.getElementById('login_msg').textContent = 'Usuário ou senha inválidos.';
              console.log('[Login] Falha no login - usuário/senha incorretos.');
            }
          })
          .catch(function(err) {
            document.getElementById('login_msg').textContent = 'Erro ao buscar usuários: ' + err;
            console.error('[Login] Erro ao buscar users.json:', err);
          });
      };
    });
  };


})();
