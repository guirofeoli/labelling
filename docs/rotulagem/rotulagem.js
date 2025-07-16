(function() {
  var UTILS_URL      = 'https://guirofeoli.github.io/labelling/utils.js';
  var ROTULAGEM_URL  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.js';
  var LOGIN_URL      = 'https://guirofeoli.github.io/labelling/login/login.js';
  var USERS_URL      = 'https://raw.githubusercontent.com/guirofeoli/labelling/refs/heads/main/docs/users.json';
  var BACKEND_URL    = 'https://labelling-production.up.railway.app';

  var loggedUser = null;
  var modelReady = false;

  // Painel: apenas console quando modelo ausente
  window.showModelMissingNotice = function() {
    console.log('[Labelling] Ainda não há modelo treinado.');
  };
  // Mantida para compatibilidade com versões antigas
  window.hideModelMissingNotice = function() {
    var div = document.getElementById('taxo-model-missing');
    if (div) div.parentNode.removeChild(div);
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
  var ROTULAGEM_HTML_URL = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.html';
  var ROTULAGEM_CSS_URL  = 'https://guirofeoli.github.io/labelling/rotulagem/rotulagem.css';

  window.openRotulagemModal = function(data, options, user, extraMsg) {
    // Remove instâncias anteriores
    var old = document.getElementById('rotulagem-panel');
    if (old) old.parentNode.removeChild(old);
    var oldBack = document.getElementById('rotulagem-backdrop');
    if (oldBack) oldBack.parentNode.removeChild(oldBack);

    // Carrega CSS se necessário
    if (!document.getElementById('rotulagem-css')) {
      var link = document.createElement('link');
      link.id = 'rotulagem-css';
      link.rel = 'stylesheet';
      link.href = ROTULAGEM_CSS_URL;
      document.head.appendChild(link);
    }

    // Carrega HTML do modal
    fetch(ROTULAGEM_HTML_URL)
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        var backdrop = wrapper.firstElementChild;
        var panel = wrapper.lastElementChild;
        document.body.appendChild(backdrop);
        document.body.appendChild(panel);

        var input = document.getElementById('rotulagem_input');
        var datalist = document.getElementById('rotulagem_options');
        var msg = document.getElementById('rotulagem_msg');
        var extra = document.getElementById('rotulagem-msg-extra');

        extra.innerHTML = extraMsg || '';
        input.value = '';
        datalist.innerHTML = '';

        if (Array.isArray(options)) {
          options.forEach(function(opt) {
            var optEl = document.createElement('option');
            optEl.value = opt;
            datalist.appendChild(optEl);
          });
        }

        document.getElementById('rotulagem_cancelar').onclick = function() {
          panel.parentNode.removeChild(panel);
          backdrop.parentNode.removeChild(backdrop);
        };

        document.getElementById('rotulagem_salvar').onclick = function() {
          var sessao = input.value.trim();
          if (!sessao) {
            msg.textContent = 'Informe a sessão.';
            return;
          }
          msg.textContent = '';
          var payload = Object.assign({}, data, {
            sessao: sessao,
            user: user
          });
          fetch(BACKEND_URL + '/api/rotulo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          .then(function(resp) { return resp.json(); })
          .then(function(resp) {
            console.log('[ROTULAGEM] Salvo:', resp);
            panel.parentNode.removeChild(panel);
            backdrop.parentNode.removeChild(backdrop);
          })
          .catch(function() {
            msg.textContent = 'Falha ao salvar rótulo.';
          });
        };

        backdrop.style.display = 'block';
        panel.style.display = 'block';
        input.focus();
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
      // GARANTA QUE O PAINEL FOI REMOVIDO
      setTimeout(function() {
        var panel = document.getElementById('taxo-model-missing');
        if (panel) {
          panel.parentNode.removeChild(panel);
          console.log('[DEBUG][loginTaxonomista] Painel modelo ausente removido após login.');
        }
        // Inicia listeners de clique só agora!
        startRotulagemUX();
        if (typeof callbackAfterLogin === 'function') {
          console.log('[DEBUG][loginTaxonomista] Chamando callbackAfterLogin.');
          callbackAfterLogin(user);
        }
      }, 100); // Pequeno delay para garantir DOM atualizado
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
    window.hideModelMissingNotice && window.hideModelMissingNotice();
    loadScriptOnce(UTILS_URL, 'utilsLoaded', function() {
      loadScriptOnce(ROTULAGEM_URL, 'rotulagemLoaded', function() {
        if (window.__rotulagem_taxonomia_click) {
          document.removeEventListener('click', window.__rotulagem_taxonomia_click, true);
        }
        window.__rotulagem_taxonomia_click = function(e) {
          // NÃO abrir se painel/modal já está aberto
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

  // ----------- EXPORTS -----------
  window.rotulagemInternals = {
    startRotulagemUX: startRotulagemUX,
    enviarRotulosParaTreinamento: window.enviarRotulosParaTreinamento
  };
  console.log('[Rotulagem] Script carregado.');
})();
