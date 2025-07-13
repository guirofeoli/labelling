// utils.js

/**
 * Retorna a posição relativa do elemento em porcentagem (top, left, width, height) com base no viewport
 */
function getElementRelativePosition(el) {
    if (!el || !el.getBoundingClientRect) return null;
    const rect = el.getBoundingClientRect();
    const topPct = (rect.top / window.innerHeight) * 100;
    const leftPct = (rect.left / window.innerWidth) * 100;
    const widthPct = (rect.width / window.innerWidth) * 100;
    const heightPct = (rect.height / window.innerHeight) * 100;
    return {
        topPct: Math.round(topPct * 100) / 100,
        leftPct: Math.round(leftPct * 100) / 100,
        widthPct: Math.round(widthPct * 100) / 100,
        heightPct: Math.round(heightPct * 100) / 100,
        absolute: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        }
    };
}

/**
 * Retorna o seletor completo do elemento
 */
function getFullSelector(el) {
    if (!(el instanceof Element)) return "";
    let path = [];
    while (el) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += "#" + el.id;
            path.unshift(selector);
            break;
        } else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() === selector) nth++;
            }
            selector += nth > 1 ? `:nth-child(${nth})` : "";
        }
        path.unshift(selector);
        el = el.parentElement;
    }
    return path.join(" > ");
}

/**
 * Retorna todos os elementos pais até o elemento mais alto
 */
function getAllParentElements(el) {
    const parents = [];
    while (el && el.parentElement) {
        el = el.parentElement;
        parents.push(el);
    }
    return parents;
}

/**
 * Retorna uma cadeia de seletores acima do elemento clicado até o topo (body)
 */
function getElementSelectorChain(el) {
    const chain = [];
    while (el && el.nodeName && el.nodeName.toLowerCase() !== "body") {
        let sel = el.nodeName.toLowerCase();
        if (el.id) sel += "#" + el.id;
        if (el.className && typeof el.className === "string" && el.className.trim()) sel += "." + el.className.trim().replace(/\s+/g, ".");
        chain.unshift(sel);
        el = el.parentElement;
    }
    return chain;
}

/**
 * Retorna todos headings (h1/h2/h3) e paragrafos (p) acima do elemento clicado, com textos maiores que 16px
 */
function getHeadingsAndParagraphsAbove(el) {
    const headings = [];
    let node = el;
    while (node && node.parentElement) {
        node = node.parentElement;
        Array.from(node.children).forEach(child => {
            if (
                ["h1", "h2", "h3", "h4", "h5", "h6", "p"].includes(child.nodeName.toLowerCase()) &&
                child.innerText &&
                getComputedStyle(child).fontSize &&
                parseInt(getComputedStyle(child).fontSize) > 16
            ) {
                headings.push({
                    selector: getFullSelector(child),
                    text: child.innerText.trim(),
                    fontSize: getComputedStyle(child).fontSize
                });
            }
        });
    }
    return headings;
}

// Exporta todas as funções em window.utils para uso dinâmico
window.utils = {
    getElementRelativePosition,
    getFullSelector,
    getAllParentElements,
    getElementSelectorChain,
    getHeadingsAndParagraphsAbove
};
