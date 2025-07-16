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

function getHeadingAndParagraphContext(selectorTripa) {
  var context = [];
  var seenHeadings = new Set();
  var seenParagraphs = new Set();
  selectorTripa.forEach(function(item) {
    var selector = item.selector;
    var el = null;
    try { el = document.querySelector(selector); } catch (e) {}
    if (el) {
      var headings = [];
      var paragraphs = [];
      // Headings
      var htags = el.querySelectorAll('h1,h2,h3,h4,h5,h6');
      for (var i = 0; i < htags.length; i++) {
        var t = htags[i].innerText.trim();
        if (t.length > 0 && !seenHeadings.has(t)) {
          headings.push(t);
          seenHeadings.add(t);
        }
      }
      // Parágrafos com texto > 18 caracteres (únicos)
      var ps = el.querySelectorAll('p');
      for (var i = 0; i < ps.length; i++) {
        var pt = ps[i].innerText.trim();
        if (pt.length > 18 && !seenParagraphs.has(pt)) {
          paragraphs.push(pt);
          seenParagraphs.add(pt);
        }
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

// Exporte no window para máxima compatibilidade
window.getElementRelativePosition = getElementRelativePosition;
window.getFullSelector = getFullSelector;
window.getSelectorTripa = getSelectorTripa;
window.getHeadingAndParagraphContext = getHeadingAndParagraphContext;
