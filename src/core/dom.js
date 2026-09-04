// Piccole utility DOM per evitare una dipendenza da framework.

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  appendChildren(node, children);
  return node;
}

export function appendChildren(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === true) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// --- Componenti "dashboard" condivisi ---

export function pill(text, color) {
  return el('span', { class: `pill${color ? ` pill--${color}` : ''}` }, text);
}

export function dashCard(opts = {}, ...children) {
  const { icon = '•', iconColor = 'blue', title = '', badge = null } = opts;
  const head = el(
    'div',
    { class: 'dash-card__head' },
    el('span', { class: `dash-icon dash-icon--${iconColor}` }, icon),
    el('span', { class: 'dash-card__title' }, title),
    badge,
  );
  return el('div', { class: `dash-card${opts.hero ? ' dash-card--hero' : ''}` }, head, ...children);
}

export function dashRow(label, value, opts = {}) {
  return el(
    'div',
    { class: 'dash-row' },
    el(
      'span',
      { class: 'dash-row__label' },
      opts.icon ? el('span', { class: 'dash-row__ico' }, opts.icon) : null,
      label,
    ),
    el(
      'span',
      { class: `dash-row__value${opts.color ? ` is-${opts.color}` : ''}${opts.wrap ? ' dash-row__value--wrap' : ''}` },
      value,
    ),
  );
}

export function fmtBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
