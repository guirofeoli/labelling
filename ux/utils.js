// utils.js - Extração universal de contexto para Auto-UX

function getCssSelector(element) {
  if (!(element instanceof Element)) return "";
  var path = [];
  while (element && element.nodeType === 1 && element.tagName.toLowerCase() !== "html") {
    var selector = element.tagName.toLowerCase();
    if (element.id) {
      selector += "#" + element.id;
      path.unshift(selector);
      break;
    }
    if (element.className) {
      var classes = element.className.trim().split(/\s+/).join(".");
      if (classes) selector += "." + classes;
    }
    var sib = element, nth = 1;
    while ((sib = sib.previousElementSibling)) nth++;
    selector += ":nth-child(" + nth + ")";
    path.unshift(selector);
    element = element.parentElement;
  }
  return path.join(" > ");
}

function getRelativeBounding(element) {
  var rect = element.getBoundingClientRect();
  var docW = window.innerWidth || document.documentElement.clientWidth;
  var docH = window.innerHeight || document.documentElement.clientHeight;
  return {
    top: Math.round((rect.top / docH) * 100),
    left: Math.round((rect.left / docW) * 100),
    width: Math.round((rect.width / docW) * 100),
    height: Math.round((rect.height / docH) * 100)
  };
}

function getParentsContext(element, max = 5) {
  var res = [];
  var node = element.parentElement;
  while (node && node !== document.body && res.length < max) {
    res.push({
      tag: node.tagName || "",
      id: node.id || "",
      class: node.className || "",
      cssPath: getCssSelector(node),
      text: (node.innerText || "").replace(/\s+/g, " ").trim()
    });
    node = node.parentElement;
  }
  return res;
}

// Pega headings e paragrafos acima com texto > 16px
function getHeadingsAbove(element, minFont = 16, maxResults = 6) {
  var result = [];
  var used = {};
  var tags = ["h1","h2","h3","h4","h5","h6","p"];
  var node = element;
  while (node && node !== document.body && result.length < maxResults) {
    var sib = node.previousElementSibling;
    while (sib && result.length < maxResults) {
      var tag = (sib.tagName || "").toLowerCase();
      if (tags.indexOf(tag) > -1) {
        var cs = window.getComputedStyle(sib);
        var fs = parseFloat(cs.fontSize || "0");
        var txt = (sib.innerText || "").replace(/\s+/g, " ").trim();
        if (txt.length > 2 && fs >= minFont && !used[txt]) {
          result.push(txt);
          used[txt] = 1;
        }
      }
      sib = sib.previousElementSibling;
    }
    node = node.parentElement;
  }
  return result;
}

function extractElementContext(element) {
  if (!element) return null;
  var attrs = {};
  ["role", "aria-label", "name", "placeholder", "type", "title", "href"].forEach(function(attr) {
    if (element.hasAttribute && element.hasAttribute(attr))
      attrs[attr] = element.getAttribute(attr);
    else
      attrs[attr] = "";
  });
  return {
    tag: element.tagName || "",
    id: element.id || "",
    class: element.className || "",
    text: (element.innerText || element.value || "").trim(),
    cssPath: getCssSelector(element),
    bounding: getRelativeBounding(element),
    parents: getParentsContext(element),
    contextHeadings: getHeadingsAbove(element),
    clickable: typeof element.onclick === "function" || element.tagName === "BUTTON" || element.tagName === "A" ? 1 : 0,
    ...attrs
  };
}

// UMD export (compatível para usar como module ou window)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { extractElementContext };
} else {
  window.extractElementContext = extractElementContext;
}
