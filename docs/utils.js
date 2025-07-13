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

// Tripa de seletores + headings/parágrafos > 16px
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

// Todos pais até o topo
function getAllParentElements(el) {
  var parents = [];
  var current = el.parentElement;
  while (current) {
    parents.push(current.outerHTML);
    current = current.parentElement;
  }
  return parents;
}

// Seletor CSS completo
function getFullSelector(el) {
  if (!(el instanceof Element)) return '';
  var path = [];
  while (el && el.nodeType === 1) {
    var selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
      path.unshift(selector);
      break;
    } else {
      var sib = el, nth = 1;
      while ((sib = sib.previousElementSibling)) nth++;
      selector += ':nth-child(' + nth + ')';
    }
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.join(' > ');
}
