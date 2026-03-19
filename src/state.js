// Simple pub/sub reactive state management

const state = {
  // Server health
  serverOnline: false,
  baseUrl: 'http://localhost:9999',
  spaceId: 'mdemg-dev',
  lastUpdated: null,

  // API data
  readinessData: null,
  embeddingHealth: null,
  neo4jHealth: null,
  memoryStats: null,
  learningStats: null,
  distributionData: null,
  freezeStatus: null,
  poolMetrics: null,
  configData: null,
  spacesData: null,
  logLines: [],
  rsicHealth: null,
  rsicHistory: [],
  rsicCalibration: {},

  // Neo4j container
  neo4jRunning: false,
  neo4jUptime: null,
  neo4jMemoryMB: null,
  neo4jCPUs: null,

  // Server process
  serverPid: null,
  serverUptime: null,
  serverPort: null,

  // Instances
  instances: [],
  selectedInstanceId: null,

  // UI
  activeTab: 'status',

  // Action state
  isRSICCycleRunning: false,
  isExportImportRunning: false,
  exportImportStatus: '',

  // Teardown wizard
  teardownWizardOpen: false,
  teardownWizardStep: 'confirm',
  teardownWizardDryRun: null,
  teardownWizardResult: null,
  teardownWizardError: null,
  teardownWizardExportStatus: '',
  teardownWizardExportComplete: false,
};

const subscribers = {};

export function getState() {
  return state;
}

export function setState(patch) {
  const changedKeys = [];
  for (const [key, value] of Object.entries(patch)) {
    if (state[key] !== value) {
      state[key] = value;
      changedKeys.push(key);
    }
  }
  // Notify subscribers
  for (const key of changedKeys) {
    if (subscribers[key]) {
      for (const cb of subscribers[key]) {
        cb(state[key], state);
      }
    }
  }
  // Also notify wildcard subscribers
  if (changedKeys.length > 0 && subscribers['*']) {
    for (const cb of subscribers['*']) {
      cb(state);
    }
  }
}

export function subscribe(key, callback) {
  if (!subscribers[key]) {
    subscribers[key] = [];
  }
  subscribers[key].push(callback);
  return () => {
    subscribers[key] = subscribers[key].filter((cb) => cb !== callback);
  };
}
