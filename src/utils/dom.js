// DOM helper utilities for consistent UI building

/**
 * createElement shorthand.
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes and properties
 * @param  {...(Node|string)} children - Child nodes or text
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  return el;
}

/**
 * Create a label-value info row.
 */
export function infoRow(label, value) {
  return h('div', { className: 'info-row' },
    h('span', { className: 'info-label' }, label),
    h('span', { className: 'info-value' }, value ?? '—'),
  );
}

/**
 * Create a section header.
 */
export function sectionHeader(title) {
  return h('div', { className: 'section-header' }, title);
}

/**
 * Create a styled button.
 */
export function button(label, onClick, options = {}) {
  const cls = ['btn'];
  if (options.primary) cls.push('btn-primary');
  if (options.destructive) cls.push('btn-destructive');
  if (options.disabled) cls.push('btn-disabled');
  const btn = h('button', {
    className: cls.join(' '),
    onClick: options.disabled ? undefined : onClick,
  }, label);
  if (options.disabled) btn.disabled = true;
  return btn;
}

/**
 * Create a divider element.
 */
export function divider() {
  return h('hr', { className: 'divider' });
}

/**
 * Create a loading indicator.
 */
export function loading(message = 'Loading...') {
  return h('div', { className: 'loading' }, message);
}

/**
 * Clear and render children into a container.
 */
export function render(container, ...children) {
  container.innerHTML = '';
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') {
      container.appendChild(document.createTextNode(child));
    } else {
      container.appendChild(child);
    }
  }
}
