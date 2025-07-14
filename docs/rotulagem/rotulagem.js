(function(){
  // Carrega HTML e CSS se não carregados ainda
  function loadRotulagemUI(callback) {
    if (document.getElementById('rotulagem-panel')) return callback();
    fetch('https://guirofeoli.github.io/labelling/rotulagem.html')
      .then(r => r.text())
      .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        var cssId = 'rotulagem-css';
        if (!document.getElementById(cssId)) {
          var link = document.createElement('link');
          link.id = cssId;
          link.rel = 'stylesheet';
          link.href = 'https://guirofeoli.github.io/labelling/rotulagem.css';
          document.head.appendChild(link);
        }
        callback();
      });
  }

  // Exibe painel de rotulagem
  window.openRotulagemModal = function(data, options, loggedUser) {
    loadRotulagemUI(function() {
      var panel = document.getElementById('rotulagem-panel');
      panel.style.display = '';
      // Monta opções únicas
      var opts = (options || []).filter(function(x, i, arr){ return x && arr.indexOf(x) === i; });
      var html = '';
      opts.forEach(function(opt, i){
        html += `<label><input type="radio" name="sessao" value="${opt}" ${(i===0?'checked':'')}/> ${opt}</label>`;
      });
      html += `<label><input type="radio" name="sessao" value="Outra"/> Outra</label>`;
      document.getElementById('rotulagem-options').innerHTML = html;

      // Mostrar quem está logado, se aplicável
      document.getElementById('rotulagem-user-info').textContent = loggedUser ? ("Usuário: " + loggedUser) : "";

      // Show/hide input de "Outra"
      var radios = panel.querySelectorAll('input[name="sessao"]');
      var outro = document.getElementById('rotulagem-outro');
      radios.forEach(function(r){
        r.onchange = function(){
          outro.style.display = (r.value === 'Outra') ? '' : 'none';
        };
      });

      // Botão salvar
      document.getElementById('rotulagem-salvar').onclick = function() {
        var sessao = panel.querySelector('input[name="sessao"]:checked').value;
        if (sessao === 'Outra') {
          if (!outro.value.trim()) { outro.focus(); return; }
          sessao = outro.value.trim();
        }
        // Envia para backend
        document.getElementById('rotulagem-status').textContent = "Salvando...";
        fetch('https://labelling-production.up.railway.app/api/rotulo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({}, data, { sessao: sessao, user: loggedUser }))
        }).then(r => r.json())
          .then(resp => {
            document.getElementById('rotulagem-status').textContent = resp.msg || "Salvo!";
            setTimeout(function(){ panel.style.display = 'none'; }, 900);
          }).catch(function(){
            document.getElementById('rotulagem-status').textContent = "Erro ao salvar.";
          });
      };

      // Botão fechar
      document.getElementById('rotulagem-fechar').onclick = function() {
        panel.style.display = 'none';
      };
    });
  };
})();
