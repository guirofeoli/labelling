// rotulagem.js — painel UX incremental, IA sugere sessões
window.openRotulagemModal = function(payload, options, loggedUser) {
  var modal = document.createElement('div');
  modal.style = 'background:#fff;padding:18px 28px 22px 28px;border:1.7px solid #222;position:fixed;top:20%;left:50%;transform:translateX(-50%);z-index:9999;min-width:340px;max-width:97vw;border-radius:13px;box-shadow:0 8px 32px #0007;font-family:sans-serif;';

  var html = "<b style='font-size:1.1em'>Qual a sessão deste elemento?</b>";
  html += `<div style='font-size:0.96em;margin-bottom:7px;color:#666'>Sugestão do modelo: <b>${options[0]||''}</b></div>`;
  html += "<form id='__ux_form_modal' autocomplete='off' style='margin-top:8px'>";
  html += "<div style='margin-bottom:12px'>";
  options.forEach(function(opt, idx){
    html += `<label style="margin:7px 0;display:block;font-size:1.01em;line-height:1.4;">
      <input type="radio" name="sessao" value="${opt}" style="vertical-align:middle;margin-right:7px" ${(idx===0?'checked':'')}/> ${opt}</label>`;
  });
  html += `<label style="margin:10px 0 6px 0;display:block;font-size:1.01em;line-height:1.4;">
      <input type="radio" name="sessao" value="Outra" style="vertical-align:middle;margin-right:7px"/> Outra
      <input type="text" id="__ux_outro_text" placeholder="Digite a sessão" style="width:70%;font-size:1em;padding:2px 8px;margin-left:8px;display:none" autocomplete="off"/>
      </label>`;
  html += "</div>";
  html += '<button style="margin-top:8px;padding:6px 28px;font-size:1.07em;background:#149C3B;color:#fff;border:none;border-radius:8px;cursor:pointer" type="submit">Treinar modelo</button>';
  html += '<button type="button" id="fecharModal" style="margin-left:14px;padding:6px 18px;font-size:1.07em;background:#aaa;color:#fff;border:none;border-radius:8px;cursor:pointer">Cancelar</button>';
  html += '<div id="statusLabel" style="margin-top:14px;color:#0c831f;font-size:1em;"></div>';
  html += '</form>';
  modal.innerHTML = html;
  document.body.appendChild(modal);

  // Show/hide input "Outra"
  var outroInput = modal.querySelector('#__ux_outro_text');
  var radios = modal.querySelectorAll('input[type="radio"][name="sessao"]');
  radios.forEach(function(r){
    r.addEventListener('change', function(){
      if(this.value === 'Outra') {
        outroInput.style.display = '';
        setTimeout(function(){ outroInput.focus(); }, 100);
      } else outroInput.style.display = 'none';
    });
  });

  modal.querySelector('#__ux_form_modal').onsubmit = function(e){
    e.preventDefault();
    var value = modal.querySelector('input[type="radio"]:checked').value;
    if(value === 'Outra'){
      var txt = outroInput.value.trim();
      if(txt.length < 2){
        alert("Digite um nome para a sessão");
        outroInput.focus();
        return;
      }
      value = txt;
    }
    var fullPayload = Object.assign({}, payload, { sessao: value, user: loggedUser });
    fetch('https://labelling.railway.internal/api/treinamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload)
    }).then(function(resp) {
      if (resp.ok) {
        modal.querySelector('#statusLabel').textContent = 'Exemplo enviado para treinamento!';
        setTimeout(function() { document.body.removeChild(modal); }, 1200);
      } else {
        modal.querySelector('#statusLabel').textContent = 'Erro ao enviar. Tente novamente.';
      }
    });
  };

  modal.querySelector('#fecharModal').onclick = function() {
    document.body.removeChild(modal);
  };
}
