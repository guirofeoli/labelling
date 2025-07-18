(function() {
  var UTILS_URL      = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_HTML = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.html';
  var ROTULAGEM_CSS  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css';
  var LOGIN_URL      = 'https://guirofeoli.github.io/labelling/login/login.js';
  var USERS_URL      = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
  var BACKEND_URL    = 'https://labelling-production.up.railway.app';

  var loggedUser = null;
  var modelReady = false;
  var rotulagemAtiva = false;

  // Painel: apenas console quando modelo ausente
  window.showModelMissingNotice = function() {
    console.log('[Labelling] Ainda não há modelo treinado.');
  };
  window.hideModelMissingNotice = function() {
    var div = document.getElementById('taxo-model-missing');
    if (div) {
      div.parentNode.removeChild(div);
      console.log('[DEBUG][hideModelMissingNotice] Painel modelo ausente removido.');
    }
  };

  function loadScriptOnce(url, flag, callback) {
    if (window[flag]) return callback && callback();
    var script = document.createElement('script');
    script.src = url;
    script.onload = function() {
      window[flag] = true;
      callback && callback();
    };
    script.onerror = function() {
      alert('Erro ao carregar script necessário: ' + url);
    };
    document.head.appendChild(script);
  }

  // ----------- MODAL DE ROTULAGEM -----------
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

  // ----------- LOGIN -----------
  window.loginTaxonomista = function(callbackAfterLogin) {
    console.log('[DEBUG][loginTaxonomista] Chamado loginTaxonomista()');
    loadScriptOnce(LOGIN_URL, 'loginLoaded', function() {
      console.log('[DEBUG][loginTaxonomista] login.js carregado, chamando openLoginModal');
      window.openLoginModal(function(user){
        loggedUser = user;
        console.log('[DEBUG][loginTaxonomista] Login realizado com usuário:', user);
        window.hideModelMissingNotice && window.hideModelMissingNotice();
        setTimeout(function() {
          var panel = document.getElementById('taxo-model-missing');
          if (panel) {
            panel.parentNode.removeChild(panel);
            console.log('[DEBUG][loginTaxonomista] Painel modelo ausente removido após login.');
          }
          startRotulagemUX();
          if (typeof callbackAfterLogin === 'function') {
            console.log('[DEBUG][loginTaxonomista] Chamando callbackAfterLogin.');
            callbackAfterLogin(user);
          }
        }, 100);
      }, USERS_URL);
    });
  };

  // ----------- ROTULAGEM MANUAL / AUTOMÁTICA -----------
  function rotulagemManual(el, extraMsg) {
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
      console.log('[DEBUG][rotulagemManual] Abrindo painel de rotulagem com opções:', options);
      window.openRotulagemModal(data, options, loggedUser, extraMsg || 'Rotule este exemplo e salve!');
    } catch (err) {
      console.error('[DEBUG][rotulagemManual] Erro ao preparar dados para rotulagem:', err);
    }
  }

  function rotulagemAutomatica(el) {
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
      fetch(BACKEND_URL + '/api/inteligencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(function(resp) { return resp.json(); })
      .then(function(resp) {
        if (resp && resp.sessao && resp.confidence >= 0.8) {
          alert('Sessão detectada: ' + resp.sessao + ' (confiança: ' + Math.round(resp.confidence*100) + '%)');
        } else {
          rotulagemManual(el, "Confiança baixa ou sessão não encontrada.<br>Rotule manualmente.");
        }
      })
      .catch(function(err) {
        rotulagemManual(el, "Erro ao consultar backend.<br>Rotule manualmente.");
      });
    } catch (err) {
      rotulagemManual(el, "Falha inesperada.<br>Rotule manualmente.");
    }
  }

  // Inicia listeners de clique conforme status do modelo
  function startRotulagemUX() {
    if (rotulagemAtiva) {
      console.log('[DEBUG][startRotulagemUX] Rotulagem já ativa, ignorando.');
      return;
    }
    rotulagemAtiva = true;
    window.hideModelMissingNotice && window.hideModelMissingNotice();
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      if (window.__rotulagem_taxonomia_click) {
        document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
      }
      window.__rotulagem_taxonomia_click = function(e) {
        if (
          document.getElementById('taxo-model-missing') ||
          document.getElementById('rotulagem-panel') ||
          document.getElementById('login-panel')
        ) {
          return;
        }
        if (!modelReady) {
          rotulagemManual(e.target);
        } else {
          rotulagemAutomatica(e.target);
        }
      };
      document.addEventListener('click', window.__rotulagem_taxonomia_click, true);
      console.log('%c[Labelling] Pronto! Clique em qualquer elemento da página para rotular ou taxonomizar UX.', 'color:#1b751b;font-weight:bold;');
    });
  }
  window.startRotulagemUX = startRotulagemUX;

  // ----------- ENVIO DE TREINAMENTO -----------
  window.enviarRotulosParaTreinamento = function() {
    fetch(BACKEND_URL + '/api/treinamento', { method: 'POST' })
      .then(function(resp) { return resp.json(); })
      .then(function(ret) {
        if (ret.ok) {
          console.log('%c[TREINAMENTO] Modelo treinado com sucesso! Pronto para taxonomizar automaticamente.', 'color:#228c22;font-weight:bold;');
          modelReady = true;
        } else {
          console.warn('[TREINAMENTO] Erro no treinamento:', ret);
        }
      })
      .catch(function(err) {
        console.warn('[TREINAMENTO] Falha ao treinar:', err);
      });
  };

  // ----------- STATUS DO MODELO NO LOAD -----------
  fetch(BACKEND_URL + '/api/model_status')
    .then(function(resp) { return resp.json(); })
    .then(function(status) {
      modelReady = !!status.model_trained;
      if (!modelReady) {
        window.showModelMissingNotice();
        console.log('%c[Labelling] Ainda não há modelo treinado.', 'color:#b37b00;font-weight:bold;');
        console.log('%c[Labelling] Para começar, faça login com: window.loginTaxonomista()', 'color:#1a2e6b;');
        console.log('[Labelling] Após o login, clique em qualquer elemento da página para rotular exemplos.');
        console.log('%c[Labelling] Quando terminar, envie os exemplos para treinamento com:\nwindow.enviarRotulosParaTreinamento()', 'color:#207cc7;font-weight:bold;');
      } else {
        window.hideModelMissingNotice();
        startRotulagemUX();
        console.log('%c[Orquestrador] Pronto para taxonomizar! Clique em qualquer elemento.', 'color:#1b751b;font-weight:bold;');
      }
    })
    .catch(function() {
      modelReady = false;
      window.showModelMissingNotice();
      console.log('%c[Labelling] Falha ao consultar status do modelo. Tente novamente mais tarde.', 'color:#d42a2a;font-weight:bold;');
    });

  console.log('[Rotulagem] Script carregado.');
})();
