// MDEMG Linux Sidebar — Main entry point
import { getState, setState, subscribe } from './state.js';
import * as api from './api.js';
import { renderStatus } from './tabs/status.js';
import { renderMemory } from './tabs/memory.js';
import { renderLearning } from './tabs/learning.js';
import { renderNeo4j } from './tabs/neo4j.js';
import { renderConfig } from './tabs/config.js';
import { renderLogs } from './tabs/logs.js';
import { renderRSIC } from './tabs/rsic.js';
import { timeAgo } from './utils/formatting.js';

const TAB_RENDERERS = {
  status: renderStatus,
  memory: renderMemory,
  learning: renderLearning,
  neo4j: renderNeo4j,
  config: renderConfig,
  logs: renderLogs,
  rsic: renderRSIC,
};

// ── Initialization ──────────────────────────────────────────────────────────

async function init() {
  setupTabs();
  await loadInstances();
  pollHealth();
  startPolling();
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const content = document.getElementById('content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      setState({ activeTab: tab.dataset.tab });
      renderActiveTab();
    });
  });

  // Subscribe to state changes that should trigger re-render
  subscribe('serverOnline', () => renderActiveTab());
  subscribe('readinessData', () => { if (getState().activeTab === 'status') renderActiveTab(); });
  subscribe('memoryStats', () => { if (getState().activeTab === 'memory') renderActiveTab(); });
  subscribe('learningStats', () => { if (getState().activeTab === 'learning') renderActiveTab(); });
  subscribe('distributionData', () => { if (getState().activeTab === 'learning') renderActiveTab(); });
  subscribe('neo4jHealth', () => { if (getState().activeTab === 'neo4j') renderActiveTab(); });
  subscribe('configData', () => { if (getState().activeTab === 'config') renderActiveTab(); });
  subscribe('logLines', () => { if (getState().activeTab === 'logs') renderActiveTab(); });
  subscribe('rsicHealth', () => { if (getState().activeTab === 'rsic') renderActiveTab(); });
  subscribe('rsicHistory', () => { if (getState().activeTab === 'rsic') renderActiveTab(); });
  subscribe('rsicCalibration', () => { if (getState().activeTab === 'rsic') renderActiveTab(); });
  subscribe('poolMetrics', () => { if (getState().activeTab === 'neo4j') renderActiveTab(); });
  subscribe('spacesData', () => { if (getState().activeTab === 'memory') renderActiveTab(); });

  // Update footer timestamp
  subscribe('lastUpdated', () => updateFooter());
}

function renderActiveTab() {
  const content = document.getElementById('content');
  const tab = getState().activeTab;
  const renderer = TAB_RENDERERS[tab];
  if (renderer) {
    renderer(content);
  }
}

function updateFooter() {
  const footer = document.getElementById('footer-time');
  if (footer) {
    const s = getState();
    footer.textContent = s.lastUpdated ? `Updated ${timeAgo(s.lastUpdated)}` : '';
  }
}

// ── Instance Management ─────────────────────────────────────────────────────

async function loadInstances() {
  try {
    let instances = await api.loadInstances();

    // If no instances, try scanning
    if (instances.length === 0) {
      const discovered = await api.scanForInstances();
      if (discovered.length > 0) {
        instances = discovered;
        await api.saveInstances(instances);
      }
    }

    // Default instance if still empty
    if (instances.length === 0) {
      const homeDir = await getHomeDir();
      instances = [{
        id: '1',
        name: 'mdemg',
        project_directory: `${homeDir}/mdemg`,
        server_url: 'http://localhost:9999',
        space_id: 'mdemg-dev',
        added_at: new Date().toISOString(),
        source: 'autoDiscovery',
      }];
    }

    setState({
      instances,
      selectedInstanceId: instances[0]?.id || null,
      baseUrl: instances[0]?.server_url || 'http://localhost:9999',
      spaceId: instances[0]?.space_id || 'mdemg-dev',
    });

    updateInstancePicker();
  } catch (e) {
    console.error('Failed to load instances:', e);
  }
}

async function getHomeDir() {
  try {
    const { homeDir } = window.__TAURI__.path;
    return await homeDir();
  } catch {
    return '/home/user';
  }
}

function updateInstancePicker() {
  const picker = document.getElementById('instance-picker');
  if (!picker) return;
  const s = getState();
  if (s.instances.length <= 1) {
    picker.style.display = 'none';
    return;
  }
  picker.style.display = 'block';
  picker.innerHTML = '';
  const select = document.createElement('select');
  select.className = 'instance-select';
  for (const inst of s.instances) {
    const opt = document.createElement('option');
    opt.value = inst.id;
    opt.textContent = inst.name;
    if (inst.id === s.selectedInstanceId) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => switchInstance(select.value));
  picker.appendChild(select);
}

function switchInstance(instanceId) {
  const s = getState();
  const inst = s.instances.find((i) => i.id === instanceId);
  if (!inst) return;

  // Resolve endpoint
  const baseUrl = inst.server_url || 'http://localhost:9999';
  setState({
    selectedInstanceId: instanceId,
    baseUrl,
    spaceId: inst.space_id || 'mdemg-dev',
    // Reset data
    readinessData: null,
    embeddingHealth: null,
    neo4jHealth: null,
    memoryStats: null,
    learningStats: null,
    distributionData: null,
    poolMetrics: null,
    configData: null,
    spacesData: null,
    logLines: [],
    rsicHealth: null,
    rsicHistory: [],
    rsicCalibration: {},
  });

  // Immediate poll
  pollHealth();
}

// ── Polling ─────────────────────────────────────────────────────────────────

let healthInterval = null;
let statsInterval = null;
let backoffMs = 10000;

function startPolling() {
  healthInterval = setInterval(pollHealth, 10000);
  statsInterval = setInterval(pollStats, 30000);
}

async function pollHealth() {
  const s = getState();
  try {
    const online = await api.healthCheck(s.baseUrl);
    const wasOffline = !s.serverOnline;
    setState({ serverOnline: online, lastUpdated: new Date() });

    // Update status dot
    const dot = document.getElementById('status-dot');
    if (dot) {
      dot.className = `status-dot ${online ? 'online' : 'offline'}`;
    }

    if (online) {
      backoffMs = 10000;
      // Fetch readiness + embedding health
      try {
        const [readiness, embHealth] = await Promise.all([
          api.getReadiness(s.baseUrl),
          api.getEmbeddingHealth(s.baseUrl).catch(() => null),
        ]);
        setState({ readinessData: readiness, embeddingHealth: embHealth });
      } catch { /* ignore */ }

      // Fetch server discovery info
      const inst = s.instances.find((i) => i.id === s.selectedInstanceId);
      if (inst) {
        try {
          const [port, pid, uptime] = await Promise.all([
            api.discoverPort(inst.project_directory),
            api.discoverPid(inst.project_directory),
            Promise.resolve(null), // uptime computed from pid file, done server-side
          ]);
          setState({ serverPort: port, serverPid: pid });
        } catch { /* ignore */ }
      }

      // Fetch neo4j container info
      try {
        const info = await api.neo4jContainerInfo();
        setState({
          neo4jRunning: info.running,
          neo4jUptime: info.uptime_seconds,
          neo4jMemoryMB: info.memory_mb,
          neo4jCPUs: info.cpus,
        });
      } catch { /* ignore */ }

      // If we just came online, do a full stats poll
      if (wasOffline) pollStats();
    }
  } catch {
    setState({ serverOnline: false, lastUpdated: new Date() });
  }
}

async function pollStats() {
  const s = getState();
  if (!s.serverOnline) return;

  try {
    const results = await Promise.allSettled([
      api.getNeo4jOverview(s.baseUrl, s.spaceId),
      api.getMemoryStats(s.baseUrl, s.spaceId),
      api.getLearningStats(s.baseUrl, s.spaceId),
      api.getDistributionStats(s.baseUrl, s.spaceId),
      api.getPoolMetrics(s.baseUrl),
      api.getSpaces(s.baseUrl),
      api.getRsicHealth(s.baseUrl),
      api.getRsicHistory(s.baseUrl, s.spaceId, 10),
      api.getRsicCalibration(s.baseUrl),
    ]);

    const patch = {};
    if (results[0].status === 'fulfilled') patch.neo4jHealth = results[0].value;
    if (results[1].status === 'fulfilled') patch.memoryStats = results[1].value;
    if (results[2].status === 'fulfilled') patch.learningStats = results[2].value;
    if (results[3].status === 'fulfilled') patch.distributionData = results[3].value;
    if (results[4].status === 'fulfilled') patch.poolMetrics = results[4].value;
    if (results[5].status === 'fulfilled') patch.spacesData = results[5].value;
    if (results[6].status === 'fulfilled') patch.rsicHealth = results[6].value;
    if (results[7].status === 'fulfilled') patch.rsicHistory = results[7].value.history || [];
    if (results[8].status === 'fulfilled') patch.rsicCalibration = results[8].value.calibration || {};

    setState(patch);
  } catch (e) {
    console.error('Stats poll failed:', e);
  }
}

// ── Boot ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
