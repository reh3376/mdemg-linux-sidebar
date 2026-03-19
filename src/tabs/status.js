import { getState } from '../state.js';
import { h, infoRow, sectionHeader, divider, button, render, loading } from '../utils/dom.js';
import { formatUptime } from '../utils/formatting.js';
import * as api from '../api.js';

export function renderStatus(container) {
  const s = getState();
  const frag = document.createDocumentFragment();

  if (s.serverOnline) {
    renderRunning(frag, s);
  } else {
    renderStopped(frag);
  }

  // Lifecycle controls
  frag.appendChild(divider());
  const controls = h('div', { className: 'button-row' },
    button('Start', () => api.serverStart(selectedProjectDir()), { disabled: s.serverOnline }),
    button('Stop', () => api.serverStop(selectedProjectDir()), { disabled: !s.serverOnline }),
    button('Restart', () => api.serverRestart(selectedProjectDir()), { disabled: !s.serverOnline }),
  );
  frag.appendChild(controls);

  render(container, frag);
}

function renderRunning(frag, s) {
  const readiness = s.readinessData;
  const statusLabel = readiness
    ? (readiness.status === 'ready' ? 'ok — running' : `${readiness.status}`)
    : 'ok — running';
  frag.appendChild(infoRow('MDEMG Status', statusLabel));
  frag.appendChild(divider());

  // Services
  frag.appendChild(sectionHeader('Services'));
  const neo4jStatus = readiness?.checks?.neo4j
    ? `ok — ${readiness.checks.neo4j.status}`
    : 'loading...';
  frag.appendChild(infoRow('Neo4j', neo4jStatus));
  frag.appendChild(infoRow('Neo4j Port', '7687'));
  frag.appendChild(infoRow('Neo4j Uptime', s.neo4jUptime != null ? formatUptime(s.neo4jUptime) : '—'));
  frag.appendChild(infoRow('MDEMG Server', 'ok — running'));
  frag.appendChild(infoRow('Server Port', s.serverPort != null ? String(s.serverPort) : '—'));
  frag.appendChild(infoRow('Server Uptime', s.serverUptime != null ? formatUptime(s.serverUptime) : '—'));
  frag.appendChild(divider());

  // Models
  frag.appendChild(sectionHeader('Models'));
  const emb = s.embeddingHealth;
  if (emb) {
    frag.appendChild(infoRow('Embedding Model', emb.model || emb.provider));
    const apiKeyLabel = emb.configured_env_var ? 'yes' : (emb.provider === 'ollama' ? 'local' : 'no');
    frag.appendChild(infoRow('  API Key', apiKeyLabel));
  } else {
    frag.appendChild(infoRow('Embedding Model', '—'));
    frag.appendChild(infoRow('  API Key', '—'));
  }
  frag.appendChild(infoRow('Naming Model', configValue(s, 'emergence.model') || configValue(s, 'llm.model') || '—'));
  frag.appendChild(infoRow('Summary Model', configValue(s, 'summary.model') || configValue(s, 'llm.model') || '—'));
  frag.appendChild(infoRow('Reranker', configValue(s, 'reranker.model') || 'disabled'));
  frag.appendChild(divider());

  // Subsystems
  frag.appendChild(sectionHeader('Subsystems'));
  const checks = readiness?.checks;
  frag.appendChild(infoRow('Plugins', checks?.plugins?.message || checks?.plugins?.status || '—'));
  frag.appendChild(infoRow('Circuit Breakers', checks?.circuit_breakers?.message || checks?.circuit_breakers?.status || '—'));
  frag.appendChild(infoRow('CMS', checks?.conversation?.message || checks?.conversation?.status || '—'));
}

function renderStopped(frag) {
  frag.appendChild(infoRow('MDEMG Status', 'stopped'));
  frag.appendChild(divider());
  frag.appendChild(sectionHeader('Services'));
  frag.appendChild(infoRow('Neo4j', 'stopped'));
  frag.appendChild(infoRow('Neo4j Port', '—'));
  frag.appendChild(infoRow('Neo4j Uptime', '—'));
  frag.appendChild(infoRow('MDEMG Server', 'stopped'));
  frag.appendChild(infoRow('Server Port', '—'));
  frag.appendChild(infoRow('Server Uptime', '—'));
  frag.appendChild(divider());
  frag.appendChild(sectionHeader('Models'));
  frag.appendChild(infoRow('Embedding Model', '—'));
  frag.appendChild(infoRow('  API Key', '—'));
  frag.appendChild(infoRow('Naming Model', '—'));
  frag.appendChild(infoRow('Summary Model', '—'));
  frag.appendChild(infoRow('Reranker', '—'));
  frag.appendChild(divider());
  frag.appendChild(sectionHeader('Subsystems'));
  frag.appendChild(infoRow('Plugins', '—'));
  frag.appendChild(infoRow('Circuit Breakers', '—'));
  frag.appendChild(infoRow('CMS', '—'));
}

function configValue(state, key) {
  if (!state.configData) return null;
  try {
    const parsed = typeof state.configData === 'string' ? JSON.parse(state.configData) : state.configData;
    if (Array.isArray(parsed)) {
      const row = parsed.find((r) => r.key === key);
      return row?.value || null;
    }
  } catch { /* ignore */ }
  return null;
}

function selectedProjectDir() {
  const s = getState();
  const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
  return inst?.project_directory || null;
}
