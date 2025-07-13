// utils.js

function getElementRelativePosition(el) {
  if (!el || !el.getBoundingClientRect) return null;
  var rect = el.getBoundingClientRect();
  var topPct = (rect.top / window.innerHeight) * 100;
  var leftPct = (rect.left / window.innerWidth) * 100;
  var widthPct = (rect.width / window.innerWidth) * 100;
  var heightPct = (rect.height / window.innerHeight) * 100;
  return {
    topPct: Math.round(topPct * 100) / 100,
    leftPct: Math.round(leftPct * 100) / 100,
    widthPct: Math.round(widthPct * 100) / 100,
    heightPct: Math.round(heightPct * 100) / 100
  };
}

// Mais minucioso: tag, #id, todas .classes, :nth-child
function getFullSelector(el) {
  if (!(el instanceof Element)) return '';
  var path = [];
  while (el && el.nodeType === 1) {
    var selector = el.nodeName.toLowerCase();
    if (el.id) selector += '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      var cls = el.className.trim().replace(/\s+/g, '.');
      if (cls) selector += '.' + cls;
    }
    // Sempre adiciona nth-child para máxima precisão
    var sib = el, nth = 1;
    while ((sib = sib.previousElementSibling)) nth++;
    selector += ':nth-child(' + nth + ')';
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.join(' > ');
}

// selectorTripa = lista de seletores do elemento até o topo
function getSelectorTripa(el) {
  var chain = [];
  var current = el;
  while (current && current !== document) {
    var sel = getFullSelector(current);
    var textSections = [];
    if (current.parentElement) {
      var siblings = current.parentElement.children;
      for (var i = 0; i < siblings.length; i++) {
        var sib = siblings[i];
        var style = window.getComputedStyle(sib);
        if (
          ((sib.tagName.match(/^H[1-6]$/i) || sib.tagName === 'P')) &&
          (parseFloat(style.fontSize) > 16) &&
          sib.innerText.trim().length > 0
        ) {
          textSections.push({
            tag: sib.tagName,
            text: sib.innerText.trim(),
            fontSize: style.fontSize
          });
        }
      }
    }
    chain.push({selector: sel, textSections: textSections});
    current = current.parentElement;
  }
  return chain;
}

// NOVA: Dado o array de seletores (da tripa), retorna contexto headings/parágrafos > 18 caracteres
function getHeadingAndParagraphContext(selectorTripa) {
  var context = [];
  selectorTripa.forEach(function(item) {
    var selector = item.selector;
    var el = null;
    try {
      el = document.querySelector(selector);
    } catch (e) {}
    if (el) {
      var headings = [];
      var paragraphs = [];
      // Headings
      var htags = el.querySelectorAll('h1,h2,h3,h4,h5,h6');
      for (var i = 0; i < htags.length; i++) {
        var t = htags[i].innerText.trim();
        if (t.length > 0) headings.push(t);
      }
      // Parágrafos com texto > 18 caracteres
      var ps = el.querySelectorAll('p');
      for (var i = 0; i < ps.length; i++) {
        var pt = ps[i].innerText.trim();
        if (pt.length > 18) paragraphs.push(pt);
      }
      context.push({
        selector: selector,
        headings: headings,
        paragraphs: paragraphs
      });
    }
  });
  return context;
}
