(function(){
  // Carrega HTML e CSS do modal de rotulagem, só 1 vez
  function loadRotulagemPanel(callback) {
    if (document.getElementById('rotulagem-panel')) return callback();
    // CSS
    var cssId = 'rotulagem-css';
    if (!document.getElementById(cssId)) {
      var link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css';
      document.head.appendChild(link);
    }
    // HTML
    fetch('https://guirofeoli.github.io/labelling/rotulagem/rotulagem.html')
      .then(r => r.text())
      .then(html => {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild); // backdrop
        document.body.appendChild(wrapper.lastElementChild);  // painel
        callback();
      });
  }

  window.openRotulagemModal = function(data, options, loggedUser, msgExtra) {
    window.hideModelMissingNotice && window.hideModelMissingNotice();

    loadRotulagemPanel(function() {
      var panel = document.getElementById('rotulagem-panel');
      var backdrop = document.getElementById('rotulagem-backdrop');
      panel.style.display = '';
      backdrop.style.display = '';

      document.getElementById('rotulagem-msg-extra').innerHTML = msgExtra || "Selecione ou digite o nome da sessão desse elemento.";
      document.getElementById('rotulagem_msg').textContent = '';
      // Popular datalist
      var dl = document.getElementById('rotulagem_options');
      dl.innerHTML = '';
      (options || []).forEach(function(opt) {
        if (opt) {
          var op = document.createElement('option');
          op.value = opt;
          dl.appendChild(op);
        }
      });
      // Limpa input e foca
      var inp = document.getElementById('rotulagem_input');
      inp.value = '';
      inp.focus();

      // Cancela
      function closeModal() {
        panel.style.display = 'none';
        backdrop.style.display = 'none';
      }
      document.getElementById('rotulagem_cancelar').onclick = closeModal;
      // Fechar com ESC
      document.onkeydown = function(ev) {
        if (ev.key === "Escape") closeModal();
      };
      // Bloqueia clique no backdrop (opcional: se quiser fechar ao clicar fora, use closeModal)
      backdrop.onclick = function(e) {
        // nada (não fecha ao clicar fora)
      };

      document.getElementById('rotulagem_salvar').onclick = function() {
        var sessao = inp.value.trim();
        if (!sessao) {
          document.getElementById('rotulagem_msg').textContent = 'Digite a sessão.';
          return;
        }
        var exemplo = Object.assign({}, data, {
          sessao: sessao,
          usuario: loggedUser || null,
          timestamp: new Date().toISOString()
        });
        fetch('https://labelling-production.up.railway.app/api/rotulo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exemplo)
        })
        .then(resp => resp.json())
        .then(resp => {
          if (resp.ok) {
            closeModal();
            // Feedback
            var okmsg = document.createElement('div');
            okmsg.style = 'position:fixed;top:20%;left:50%;transform:translate(-50%,0);background:#149C3B;color:#fff;padding:13px 23px;border-radius:9px;font-size:1.08em;z-index:100000;';
            okmsg.textContent = "Exemplo salvo! Total rotulados: " + (resp.total || '');
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
})();
