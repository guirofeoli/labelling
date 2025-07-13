// utils.js - Exemplo (exporta uma função principal que reúne tudo)

window.extractElementContext = function(el) {
  if (!el) return {};

  // 1. Posição relativa na tela (0-100%)
  function getElementRelativePosition(element) {
    var rect = element.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var percX = Math.round((x / window.innerWidth) * 100);
    var percY = Math.round((y / window.innerHeight) * 100);
    return { x: percX, y: percY };
  }

  // 2. Árvore de seletores acima
  function getSelectorPath(element) {
    var path = [];
    while (element && element.nodeType === 1 && element !== document.body) {
      var selector = element.tagName.toLowerCase();
      if (element.id) selector += "#" + element.id;
      if (element.className) selector += "." + Array.from(element.classList).join(".");
      path.unshift(selector);
      element = element.parentElement;
    }
    return path.join(" > ");
  }

  // 3. Todos pais até topo
  function getParentElements(element) {
    var parents = [];
    while (element && element !== document.body) {
      parents.push(element);
      element = element.parentElement;
    }
    return parents;
  }

  // 4. Seletores completos (de body até clicado)
  function getFullSelector(element) {
    if (!element) return "";
    var path = [];
    while (element && element.nodeType === 1 && element !== document.body) {
      var sel = element.tagName.toLowerCase();
      if (element.id) sel += "#" + element.id;
      if (element.className) sel += "." + Array.from(element.classList).join(".");
      path.unshift(sel);
      element = element.parentElement;
    }
    return "body > " + path.join(" > ");
  }

  // 5. Headings/parágrafos acima (texto > 16px)
  function getContextHeadingsAndParagraphs(element) {
    var context = [];
    var parent = element.parentElement;
    while (parent && parent !== document.body) {
      var children = Array.from(parent.children);
      children.forEach(function(child){
        if (/^h[1-6]$/i.test(child.tagName) || child.tagName === "P") {
          var style = window.getComputedStyle(child);
          if (parseInt(style.fontSize) >= 16 && child.textContent.trim().length > 3) {
            context.push({tag: child.tagName, text: child.textContent.trim(), fontSize: style.fontSize});
          }
        }
      });
      parent = parent.parentElement;
    }
    return context;
  }

  // Consolidado
  return {
    tag: el.tagName,
    id: el.id,
    class: el.className,
    text: el.textContent.trim(),
    position: getElementRelativePosition(el),
    selectorPath: getSelectorPath(el),
    fullSelector: getFullSelector(el),
    parents: getParentElements(el).map(function(e){
      return {
        tag: e.tagName,
        id: e.id,
        class: e.className,
        selector: getFullSelector(e),
        text: e.textContent.trim()
      };
    }),
    contextHeadings: getContextHeadingsAndParagraphs(el)
  };
};

// Outras funções auxiliares também podem ser exportadas se desejar
