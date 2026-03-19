import { getState, setState } from '../state.js';
import { h, infoRow, sectionHeader, divider, button, render, loading } from '../utils/dom.js';
import { formatNumber, formatDecimal } from '../utils/formatting.js';
import * as api from '../api.js';

export function renderLearning(container) {
  const s = getState();
  const frag = document.createDocumentFragment();

  // Distribution phase
  if (s.distributionData?.stats) {
    const stats = s.distributionData.stats;
    frag.appendChild(sectionHeader('Graph Overview'));
    frag.appendChild(infoRow('  Phase', capitalize(stats.phase)));
    frag.appendChild(infoRow('  All Edges', formatNumber(stats.edge_count)));
    frag.appendChild(infoRow('  Query Count', formatNumber(stats.query_count)));
    if (stats.trend?.direction) {
      const arrow = stats.trend.direction === 'improving' ? ' \u25B2' : (stats.trend.direction === 'declining' ? ' \u25BC' : '');
      frag.appendChild(infoRow('  Trend', `${capitalize(stats.trend.direction)}${arrow}`));
    }
  } else if (s.serverOnline) {
    frag.appendChild(loading('Loading...'));
    render(container, frag);
    return;
  }

  // Hebbian learning edges
  const learning = s.learningStats;
  if (learning) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Hebbian Learning Edges'));
    if (learning.total_edges != null) frag.appendChild(infoRow('  Co-activated', formatNumber(learning.total_edges)));
    if (learning.strong_edges != null) frag.appendChild(infoRow('  Strong', formatNumber(learning.strong_edges)));
    if (learning.surprising_edges != null) frag.appendChild(infoRow('  Surprising', formatNumber(learning.surprising_edges)));
    if (learning.edges_below_threshold != null) frag.appendChild(infoRow('  Below Threshold', formatNumber(learning.edges_below_threshold)));
    if (learning.avg_weight != null) frag.appendChild(infoRow('  Avg Weight', formatDecimal(learning.avg_weight)));
    if (learning.max_weight != null) frag.appendChild(infoRow('  Max Weight', formatDecimal(learning.max_weight)));
    if (learning.avg_days_since_active != null) frag.appendChild(infoRow('  Avg Days Inactive', formatDecimal(learning.avg_days_since_active, 1)));

    // Configuration
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Configuration'));
    if (learning.decay_per_day != null) frag.appendChild(infoRow('  Decay/Day', formatDecimal(learning.decay_per_day, 2)));
    if (learning.prune_threshold != null) frag.appendChild(infoRow('  Prune Threshold', formatDecimal(learning.prune_threshold, 2)));
    if (learning.max_edges_per_node != null) frag.appendChild(infoRow('  Max Edges/Node', String(learning.max_edges_per_node)));

    // Freeze state
    if (learning.freeze_state) {
      frag.appendChild(divider());
      frag.appendChild(sectionHeader('Freeze State'));
      frag.appendChild(infoRow('  Frozen', learning.freeze_state.frozen ? 'Yes' : 'No'));
      if (learning.freeze_state.reason) frag.appendChild(infoRow('  Reason', learning.freeze_state.reason));
    }

    // Actions
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Actions'));
    const isFrozen = learning.freeze_state?.frozen;
    const actionRow = h('div', { className: 'button-row' });
    if (isFrozen) {
      actionRow.appendChild(button('Unfreeze', () => doUnfreeze()));
    } else {
      actionRow.appendChild(button('Freeze', () => doFreeze()));
    }
    actionRow.appendChild(button('Prune Edges', () => doPrune(), { destructive: true }));
    frag.appendChild(actionRow);
  }

  if (!s.serverOnline && !s.distributionData) {
    frag.appendChild(h('div', { className: 'empty-state' }, 'Server not running'));
  }

  render(container, frag);
}

async function doFreeze() {
  const s = getState();
  try {
    await api.freezeLearning(s.baseUrl, s.spaceId, 'sidebar');
  } catch (e) { console.error('Freeze failed:', e); }
}

async function doUnfreeze() {
  const s = getState();
  try {
    await api.unfreezeLearning(s.baseUrl, s.spaceId);
  } catch (e) { console.error('Unfreeze failed:', e); }
}

async function doPrune() {
  const s = getState();
  try {
    await api.pruneLearning(s.baseUrl, s.spaceId);
  } catch (e) { console.error('Prune failed:', e); }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
