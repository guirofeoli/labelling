// rotulagem.js

window.openRotulagemModal = function(payload, options, loggedUser) {
  var modal = document.createElement('div');
  modal.style = 'background:#fff;padding:16px;border:1px solid #ddd;position:fixed;top:18%;left:30%;z-index:9999;width:350px;';
  modal.innerHTML = `
    <h3>Rotular sessão</h3>
    <div style="margin-bottom:8px;">Selecione o tipo de sessão:</div>
    <select id="sessaoSelect" style="width:90%;">
      ${options.map(function(o){ return '<option value="'+o+'">'+o+'</option>'; }).join('')}
    </select>
    <br><br>
    <button id="enviarSessao">Treinar modelo</button>
    <button id="fecharModal" style="margin-left:8px;">Cancelar</button>
    <div id="statusLabel" style="margin-top:12px;color:#0c831f;"></div>
  `;
  document.body.appendChild(modal);

  document.getElementById('enviarSessao').onclick = function() {
    var sessao = document.getElementById('sessaoSelect').value;
    var fullPayload = Object.assign({}, payload, { sessao: sessao, user: loggedUser });
    fetch('https://labelling.railway.internal/api/treinamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload)
    }).then(function(resp) {
      if (resp.ok) {
        document.getElementById('statusLabel').textContent = 'Exemplo enviado para treinamento!';
        setTimeout(function() { document.body.removeChild(modal); }, 1300);
      } else {
        document.getElementById('statusLabel').textContent = 'Erro ao enviar. Tente novamente.';
      }
    });
  };

  document.getElementById('fecharModal').onclick = function() {
    document.body.removeChild(modal);
  };
}
