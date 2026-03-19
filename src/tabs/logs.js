import { getState, setState } from '../state.js';
import { h, render } from '../utils/dom.js';
import * as api from '../api.js';

export function renderLogs(container) {
  const s = getState();

  const wrapper = h('div', { className: 'logs-container' });

  // Search bar
  const searchInput = h('input', {
    type: 'text',
    className: 'log-search',
    placeholder: 'Filter logs...',
  });

  const refreshBtn = h('button', {
    className: 'btn btn-icon',
    onClick: () => refreshLogs(),
    title: 'Refresh logs',
  }, '\u21BB');

  const searchBar = h('div', { className: 'log-search-bar' },
    searchInput,
    refreshBtn,
  );
  wrapper.appendChild(searchBar);

  // Log content
  const logContent = h('div', { className: 'log-content' });

  if (s.logLines.length === 0) {
    logContent.appendChild(h('div', { className: 'empty-state' }, 'No log data'));
  } else {
    const lines = s.logLines;
    for (const line of lines) {
      const lineEl = h('div', { className: `log-line ${logClass(line)}` }, line);
      logContent.appendChild(lineEl);
    }
    // Auto-scroll to bottom
    requestAnimationFrame(() => {
      logContent.scrollTop = logContent.scrollHeight;
    });
  }

  wrapper.appendChild(logContent);

  // Filter on input
  searchInput.addEventListener('input', () => {
    const filter = searchInput.value.toLowerCase();
    const lineEls = logContent.querySelectorAll('.log-line');
    for (const el of lineEls) {
      el.style.display = !filter || el.textContent.toLowerCase().includes(filter) ? '' : 'none';
    }
  });

  render(container, wrapper);

  // Load logs on first render
  if (s.logLines.length === 0) refreshLogs();
}

async function refreshLogs() {
  const s = getState();
  const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
  if (!inst) return;
  try {
    const lines = await api.readLogFile(inst.project_directory, 500);
    setState({ logLines: lines });
  } catch (e) {
    console.error('Failed to read logs:', e);
  }
}

function logClass(line) {
  if (line.includes('level=error') || line.includes('ERROR')) return 'log-error';
  if (line.includes('level=warn') || line.includes('WARN')) return 'log-warn';
  return '';
}
