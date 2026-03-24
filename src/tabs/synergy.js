import { getState } from '../state.js';
import { h, infoRow, sectionHeader, divider, render, loading } from '../utils/dom.js';

export function renderSynergy(container) {
  const s = getState();
  const frag = document.createDocumentFragment();

  const synergy = s.synergyStatus;
  if (!synergy && s.serverOnline) {
    render(container, loading('Loading synergy data...'));
    return;
  }
  if (!synergy) {
    render(container, h('div', { className: 'empty-state' }, 'Server not running'));
    return;
  }

  // Synergy Health gauge
  frag.appendChild(sectionHeader('Synergy Health'));
  const pct = Math.round(synergy.synergy_health * 100);
  const bar = h('div', { className: 'calibration-row' },
    h('div', { className: 'calibration-bar' },
      h('div', {
        className: 'calibration-fill',
        style: { width: `${pct}%`, backgroundColor: healthColor(synergy.synergy_health) },
      }),
    ),
    h('span', { className: 'calibration-pct' }, `${pct}%`),
  );
  frag.appendChild(bar);

  // Status indicators
  frag.appendChild(divider());
  const jiminyDot = h('span', {
    className: `status-dot ${synergy.jiminy_healthy ? 'online' : 'offline'}`,
    style: { display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px' },
  });
  frag.appendChild(h('div', { className: 'info-row' },
    jiminyDot,
    h('span', {}, `Jiminy: ${synergy.jiminy_healthy ? 'Healthy' : 'Unhealthy'}`),
  ));

  const migrationLabel = synergy.migration_status
    ? `${synergy.migration_status.charAt(0).toUpperCase() + synergy.migration_status.slice(1)}${synergy.migration_date ? ` (${synergy.migration_date})` : ''}`
    : 'N/A';
  const migDot = h('span', {
    className: `status-dot ${synergy.migration_status === 'complete' ? 'online' : 'offline'}`,
    style: { display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px' },
  });
  frag.appendChild(h('div', { className: 'info-row' },
    migDot,
    h('span', {}, `Migration: ${migrationLabel}`),
  ));

  // File Metrics
  frag.appendChild(divider());
  frag.appendChild(sectionHeader('File Metrics'));
  frag.appendChild(infoRow('CLAUDE.md', `${synergy.claude_md_lines} lines`));
  frag.appendChild(infoRow('MEMORY.md', `${synergy.memory_md_lines} lines`));
  frag.appendChild(infoRow('Auto-memory', `${synergy.auto_memory_files} files, ${synergy.auto_memory_lines} lines`));
  frag.appendChild(infoRow('Overflow (24h)', `${synergy.overflow_events_24h} events`));

  // Recovery Buffer
  frag.appendChild(divider());
  frag.appendChild(sectionHeader('Recovery Buffer'));
  frag.appendChild(infoRow('CMS buffer', `${synergy.recovery_buffer_space_entries} entries`));
  frag.appendChild(infoRow('Local buffer', `${synergy.recovery_buffer_local_entries} entries`));

  const totalColor = synergy.recovery_buffer_total > 0 ? '#f9e2af' : 'inherit';
  const totalRow = h('div', { className: 'info-row' },
    h('span', { className: 'info-label' }, 'Total'),
    h('span', { className: 'info-value', style: { color: totalColor } },
      `${synergy.recovery_buffer_total} pending`),
  );
  frag.appendChild(totalRow);

  render(container, frag);
}

function healthColor(score) {
  if (score >= 0.8) return '#a6e3a1'; // green
  if (score >= 0.5) return '#f9e2af'; // yellow
  return '#f38ba8'; // red
}
