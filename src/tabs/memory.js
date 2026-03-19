import { getState } from '../state.js';
import { h, infoRow, sectionHeader, divider, render, loading } from '../utils/dom.js';
import { formatNumber, formatPercentage, formatDecimal } from '../utils/formatting.js';

export function renderMemory(container) {
  const s = getState();
  const frag = document.createDocumentFragment();

  const stats = s.memoryStats;
  if (!stats && s.serverOnline) {
    render(container, loading('Loading memory stats...'));
    return;
  }
  if (!stats) {
    render(container, h('div', { className: 'empty-state' }, 'Server not running'));
    return;
  }

  frag.appendChild(infoRow('Total Memories', formatNumber(stats.memory_count)));
  frag.appendChild(infoRow('Observations', formatNumber(stats.observation_count)));
  frag.appendChild(infoRow('Health Score', formatPercentage(stats.health_score)));
  frag.appendChild(infoRow('Embedding Coverage', formatPercentage(stats.embedding_coverage)));

  // By Layer
  if (stats.memories_by_layer) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('By Layer'));
    const layerNames = [
      ['L0', 'Observations'],
      ['L1', 'Themes'],
      ['L2', 'Concepts'],
      ['L3', 'Abstractions'],
      ['L4', 'Meta'],
      ['L5', 'Emergent'],
    ];
    for (let i = 0; i < layerNames.length; i++) {
      const [label, name] = layerNames[i];
      const count = stats.memories_by_layer[String(i)]
        || stats.memories_by_layer[label]
        || stats.memories_by_layer[label.toLowerCase()]
        || 0;
      frag.appendChild(infoRow(`  ${label} ${name}`, formatNumber(count)));
    }
  }

  // Temporal Activity
  if (stats.temporal_distribution) {
    const t = stats.temporal_distribution;
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Activity (24h / 7d / 30d)'));
    frag.appendChild(infoRow('  Memories',
      `${formatNumber(t.last_24h)} / ${formatNumber(t.last_7d)} / ${formatNumber(t.last_30d)}`));
  }

  // Connectivity
  if (stats.connectivity) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Connectivity'));
    frag.appendChild(infoRow('  Avg Degree', formatDecimal(stats.connectivity.avg_degree, 1)));
  }

  // Learning Activity
  if (stats.learning_activity) {
    const la = stats.learning_activity;
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Learning Activity'));
    frag.appendChild(infoRow('  Co-activated Edges', formatNumber(la.co_activated_edges)));
    frag.appendChild(infoRow('  Avg Weight', formatDecimal(la.avg_weight)));
    frag.appendChild(infoRow('  Max Weight', formatDecimal(la.max_weight)));
  }

  // Active Spaces
  if (s.spacesData && s.spacesData.length > 0) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Active Spaces'));
    for (const space of s.spacesData) {
      frag.appendChild(infoRow(`  ${space.space_id}`, `${formatNumber(space.node_count)} nodes`));
    }
  }

  render(container, frag);
}
