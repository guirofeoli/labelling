(function() {
  var ROTULAGEM_HTML = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.html';
  var ROTULAGEM_CSS  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css';

  // Carrega CSS e HTML se necessário
  function loadRotulagemPanel(callback) {
    if (!document.getElementById('rotulagem-css')) {
      var link = document.createElement('link');
      link.id = 'rotulagem-css';
      link.rel = 'stylesheet';
      link.href = ROTULAGEM_CSS;
      document.head.appendChild(link);
    }
    // Insere HTML se não existe
    if (!document.getElementById('rotulagem-panel')) {
      fetch(ROTULAGEM_HTML)
        .then(r => r.text())
        .then(function(html) {
          var wrapper = document.createElement('div');
          wrapper.innerHTML = html;
          // Adiciona backdrop e painel
          document.body.appendChild(wrapper.firstElementChild); // backdrop
          document.body.appendChild(wrapper.lastElementChild);  // painel
          if (callback) callback();
        });
    } else {
      if (callback) callback();
    }
  }

  // Abre o modal de rotulagem
  window.openRotulagemModal = function(data, options, user, msgExtra) {
    loadRotulagemPanel(function() {
      var panel = document.getElementById('rotulagem-panel');
      var backdrop = document.getElementById('rotulagem-backdrop');
      panel.style.display = '';
      backdrop.style.display = '';

      document.getElementById('rotulagem-msg-extra').innerHTML = msgExtra || 'Selecione ou digite o nome da sessão desse elemento.';
      document.getElementById('rotulagem_msg').textContent = '';
      var dl = document.getElementById('rotulagem_options');
      dl.innerHTML = '';
      (options || []).forEach(function(opt) {
        if (opt) {
          var op = document.createElement('option');
          op.value = opt;
          dl.appendChild(op);
        }
      });
      var inp = document.getElementById('rotulagem_input');
      inp.value = '';
      inp.focus();

      // Fechar modal
      function closeModal() {
        panel.style.display = 'none';
        backdrop.style.display = 'none';
      }
      document.getElementById('rotulagem_cancelar').onclick = closeModal;
      document.onkeydown = function(ev) { if (ev.key === 'Escape') closeModal(); };
      backdrop.onclick = function() {};

      document.getElementById('rotulagem_salvar').onclick = function() {
        var sessao = inp.value.trim();
        if (!sessao) {
          document.getElementById('rotulagem_msg').textContent = 'Digite a sessão.';
          return;
        }
        var exemplo = Object.assign({}, data, {
          sessao: sessao,
          usuario: user || null,
          timestamp: new Date().toISOString()
        });
        fetch('https://labelling-production.up.railway.app/api/rotulo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exemplo)
        })
        .then(function(resp) { return resp.json(); })
        .then(function(resp) {
          if (resp.ok) {
            closeModal();
            var okmsg = document.createElement('div');
            okmsg.style = 'position:fixed;top:20%;left:50%;transform:translate(-50%,0);background:#149C3B;color:#fff;padding:13px 23px;border-radius:9px;font-size:1.08em;z-index:100000;';
            okmsg.textContent = 'Exemplo salvo! Total rotulados: ' + (resp.total || '');
            document.body.appendChild(okmsg);
            setTimeout(function(){ okmsg.parentNode && okmsg.parentNode.removeChild(okmsg); }, 1400);
          } else {
            document.getElementById('rotulagem_msg').textContent = resp.msg || 'Erro ao salvar.';
          }
        })
        .catch(function(e){
          document.getElementById('rotulagem_msg').textContent = 'Falha ao salvar: ' + e;
        });
      };
    });
  };

  console.log('[Rotulagem] Script carregado.');
})();
