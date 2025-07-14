(function() {
  // Remove painel/backdrop de login antigo
  function removeOldLoginPanel() {
    var p = document.getElementById('login-panel');
    if (p && p.parentNode) p.parentNode.removeChild(p);
    var b = document.getElementById('login-backdrop');
    if (b && b.parentNode) b.parentNode.removeChild(b);
    document.onkeydown = null;
  }

  // Carrega login.html e login.css só uma vez
  function loadLoginPanel(callback) {
    removeOldLoginPanel();
    // CSS
    var cssId = 'login-css';
    if (!document.getElementById(cssId)) {
      var link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://guirofeoli.github.io/labelling/login/login.css';
      document.head.appendChild(link);
    }
    // HTML
    fetch('https://guirofeoli.github.io/labelling/login/login.html')
      .then(r => r.text())
      .then(html => {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild); // backdrop
        document.body.appendChild(wrapper.lastElementChild);  // painel
        callback && callback();
      });
  }

  // Abre painel de login
  window.openLoginModal = function(onSuccess, usersUrl) {
    usersUrl = usersUrl || 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
    loadLoginPanel(function() {
      var panel = document.getElementById('login-panel');
      var backdrop = document.getElementById('login-backdrop');
      panel.style.display = '';
      backdrop.style.display = '';

      var inpUser = document.getElementById('login_input_user');
      var inpPass = document.getElementById('login_input_pass');
      var msg = document.getElementById('login_msg');
      inpUser.value = '';
      inpPass.value = '';
      inpUser.focus();
      msg.textContent = '';

      // Cancela
      function closeModal() {
        removeOldLoginPanel();
      }
      document.getElementById('login_cancelar').onclick = closeModal;
      // ESC fecha
      document.onkeydown = function(ev) {
        if (ev.key === "Escape") closeModal();
      };
      backdrop.onclick = function(e) {
        // não fecha ao clicar fora
      };

      // Submete login
      document.getElementById('login_entrar').onclick = function() {
        var login = inpUser.value.trim();
        var senha = inpPass.value;
        if (!login || !senha) {
          msg.textContent = "Preencha login e senha.";
          return;
        }
        fetch(usersUrl)
          .then(r => r.json())
          .then(users => {
            // Aceita tanto "login"/"senha" quanto "user"/"pass"
            var found = users.find(function(u) {
              return (
                (u.login === login && u.senha === senha) ||
                (u.user === login && u.pass === senha)
              );
            });
            if (found) {
              closeModal();
              if (typeof onSuccess === 'function') onSuccess(login);
            } else {
              msg.textContent = 'Usuário ou senha inválidos.';
            }
          })
          .catch(function(e){
            msg.textContent = 'Erro ao validar usuário: ' + e;
          });
      };
    });
  };
})();
