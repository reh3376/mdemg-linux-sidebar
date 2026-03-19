import { getState } from '../state.js';
import { h, infoRow, sectionHeader, divider, button, render, loading } from '../utils/dom.js';
import { formatNumber, formatDecimal, formatUptime } from '../utils/formatting.js';
import * as api from '../api.js';

export function renderNeo4j(container) {
  const s = getState();
  const frag = document.createDocumentFragment();

  const neo4j = s.neo4jHealth;
  if (neo4j) {
    frag.appendChild(infoRow('Status', capitalize(neo4j.database.status)));
    frag.appendChild(infoRow('Version', neo4j.database.version));
    frag.appendChild(infoRow('Schema', `v${neo4j.database.schema_version}`));
    frag.appendChild(infoRow('Total Nodes', formatNumber(neo4j.database.total_nodes)));
    frag.appendChild(infoRow('Total Edges', formatNumber(neo4j.database.total_edges)));
    frag.appendChild(infoRow('Spaces', String(neo4j.database.total_spaces)));

    // Per-space
    if (neo4j.spaces && neo4j.spaces.length > 0) {
      frag.appendChild(divider());
      frag.appendChild(sectionHeader('Spaces'));
      for (const space of neo4j.spaces) {
        frag.appendChild(infoRow(`  ${space.space_id}`, `${formatNumber(space.node_count)} nodes`));
      }
    }

    // Connection Pool
    if (s.poolMetrics) {
      frag.appendChild(divider());
      frag.appendChild(sectionHeader('Connection Pool'));
      frag.appendChild(infoRow('  Active', String(s.poolMetrics.connection_pool.active_connections)));
      frag.appendChild(infoRow('  Idle', String(s.poolMetrics.connection_pool.idle_connections)));
      frag.appendChild(divider());
      frag.appendChild(sectionHeader('Runtime'));
      frag.appendChild(infoRow('  Goroutines', String(s.poolMetrics.runtime.goroutines)));
      frag.appendChild(infoRow('  Heap', `${formatDecimal(s.poolMetrics.runtime.heap_alloc_mb, 1)} MB`));
      frag.appendChild(infoRow('  GC Pauses', `${formatDecimal(s.poolMetrics.runtime.gc_total_pause_ms, 1)} ms`));
    }
  } else if (s.serverOnline) {
    frag.appendChild(loading('Loading...'));
  } else {
    frag.appendChild(infoRow('Status', s.neo4jRunning ? 'Running (server offline)' : 'Stopped'));
  }

  // Container resources
  if (s.neo4jRunning) {
    frag.appendChild(divider());
    frag.appendChild(sectionHeader('Container Resources'));
    if (s.neo4jMemoryMB != null) {
      const display = s.neo4jMemoryMB >= 1024
        ? `${(s.neo4jMemoryMB / 1024).toFixed(1)} GB`
        : `${s.neo4jMemoryMB} MB`;
      frag.appendChild(infoRow('  Memory Limit', display));
    } else {
      frag.appendChild(infoRow('  Memory Limit', 'unlimited'));
    }
    frag.appendChild(infoRow('  CPUs', s.neo4jCPUs != null ? formatDecimal(s.neo4jCPUs, 1) : 'unlimited'));
  }

  // Neo4j controls
  frag.appendChild(divider());
  const controls = h('div', { className: 'button-row' },
    button('Start', () => api.neo4jStart(), { disabled: s.neo4jRunning }),
    button('Stop', () => api.neo4jStop(), { disabled: !s.neo4jRunning }),
    button('Restart', () => api.neo4jRestart(), { disabled: !s.neo4jRunning }),
  );
  frag.appendChild(controls);

  render(container, frag);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
