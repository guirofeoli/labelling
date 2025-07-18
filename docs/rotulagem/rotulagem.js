(function() {
  var UTILS_URL = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_HTML = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.html';
  var ROTULAGEM_CSS  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css';
  var BACKEND_URL = 'https://labelling-production.up.railway.app';

  // Recebe usuário do login (do orquestrador)
  window.enableRotulagemUX = function(user) {
    if (!user) {
      console.error('[Rotulagem] Usuário não autenticado!');
      return;
    }
    // Loader utils.js (para helpers de DOM)
    var loadScriptOnce = function(url, flag, cb) {
      if (window[flag]) return cb && cb();
      var script = document.createElement('script');
      script.src = url;
      script.onload = function() { window[flag] = true; cb && cb(); };
      script.onerror = function() { alert('Erro ao carregar script: ' + url); };
      document.head.appendChild(script);
    };
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      if (window.__rotulagem_taxonomia_click) {
        document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
      }
      window.__rotulagem_taxonomia_click = function(e) {
        // Não interfere se painel já aberto
        if (document.getElementById('rotulagem-panel') || document.getElementById('login-panel')) return;
        var el = e.target;
        try {
          var selectorTripa = getSelectorTripa(el);
          var data = {
            position: getElementRelativePosition(el),
            selectorTripa: selectorTripa,
            contextHeadingsParagraphs: getHeadingAndParagraphContext(selectorTripa),
            fullSelector: getFullSelector(el),
            text: el.innerText,
            html: el.outerHTML
          };
          var options = ["header", "footer", "menu", "main", "hero", "conteúdo", "rodapé", "aside", "article", "banner"];
          if (data.contextHeadingsParagraphs && data.contextHeadingsParagraphs.length > 0) {
            data.contextHeadingsParagraphs.forEach(function(ctx) {
              options = options.concat((ctx.headings || []), (ctx.paragraphs || []));
            });
          }
          options = Array.from(new Set(options.filter(Boolean)));
          window.openRotulagemModal(data, options, user, 'Rotule este exemplo e salve!');
        } catch (err) {
          console.error('Erro ao preparar dados para rotulagem:', err);
        }
      };
      document.addEventListener('click', window.__rotulagem_taxonomia_click, true);
      console.log('%c[Labelling] Pronto! Clique em qualquer elemento para rotular UX.', 'color:#1b751b;font-weight:bold;');
    });
  };

  // Painel de rotulagem (mesmo que já enviado antes)
  function loadRotulagemPanel(callback) {
    if (document.getElementById('rotulagem-panel')) return callback();
    var cssId = 'rotulagem-css';
    if (!document.getElementById(cssId)) {
      var link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = ROTULAGEM_CSS;
      document.head.appendChild(link);
    }
    fetch(ROTULAGEM_HTML)
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild); // backdrop
        document.body.appendChild(wrapper.lastElementChild);  // painel
        callback();
      });
  }

  // Função chamada no clique
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

      function closeModal() {
        panel.style.display = 'none';
        backdrop.style.display = 'none';
      }
      document.getElementById('rotulagem_cancelar').onclick = closeModal;
      document.onkeydown = function(ev) { if (ev.key === 'Escape') closeModal(); };
      backdrop.onclick = function(e) {};

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
        fetch(BACKEND_URL + '/api/rotulo', {
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
