window.treinadorUX = {
  exportarParaTreino: function(exemplos) {
    // exemplos é um array do frontend, ou você pode puxar de window.__ux_examples
    fetch('https://labelling.railway.internal/api/treinamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exemplos: exemplos })
    })
    .then(r => r.json())
    .then(function(res) {
      alert('Treinamento solicitado!\n' + (res.msg || JSON.stringify(res)));
    })
    .catch(function(e) {
      alert('Erro ao acionar treinamento: ' + e);
    });
  }
};
