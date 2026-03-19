// All invoke() calls wrapping Rust Tauri commands
const { invoke } = window.__TAURI__.core;

// ── Health / Status ─────────────────────────────────────────────────────────

export const healthCheck = (baseUrl) => invoke('health_check', { baseUrl });
export const getReadiness = (baseUrl) => invoke('get_readiness', { baseUrl });
export const getEmbeddingHealth = (baseUrl) => invoke('get_embedding_health', { baseUrl });

// ── Memory / Learning ───────────────────────────────────────────────────────

export const getNeo4jOverview = (baseUrl, spaceId) =>
  invoke('get_neo4j_overview', { baseUrl, spaceId });
export const getMemoryStats = (baseUrl, spaceId) =>
  invoke('get_memory_stats', { baseUrl, spaceId });
export const getLearningStats = (baseUrl, spaceId) =>
  invoke('get_learning_stats', { baseUrl, spaceId });
export const getDistributionStats = (baseUrl, spaceId) =>
  invoke('get_distribution_stats', { baseUrl, spaceId });
export const getFreezeStatus = (baseUrl, spaceId) =>
  invoke('get_freeze_status', { baseUrl, spaceId });
export const getStaleEdgeStats = (baseUrl, spaceId) =>
  invoke('get_stale_edge_stats', { baseUrl, spaceId });

// ── RSIC ────────────────────────────────────────────────────────────────────

export const getRsicHealth = (baseUrl) => invoke('get_rsic_health', { baseUrl });
export const getRsicHistory = (baseUrl, spaceId, limit = 10) =>
  invoke('get_rsic_history', { baseUrl, spaceId, limit });
export const getRsicCalibration = (baseUrl) => invoke('get_rsic_calibration', { baseUrl });
export const triggerRsicCycle = (baseUrl, spaceId, tier, dryRun) =>
  invoke('trigger_rsic_cycle', { baseUrl, spaceId, tier, dryRun });

// ── Actions ─────────────────────────────────────────────────────────────────

export const freezeLearning = (baseUrl, spaceId, reason) =>
  invoke('freeze_learning', { baseUrl, spaceId, reason });
export const unfreezeLearning = (baseUrl, spaceId) =>
  invoke('unfreeze_learning', { baseUrl, spaceId });
export const pruneLearning = (baseUrl, spaceId) =>
  invoke('prune_learning', { baseUrl, spaceId });

// ── System ──────────────────────────────────────────────────────────────────

export const getPoolMetrics = (baseUrl) => invoke('get_pool_metrics', { baseUrl });
export const getSpaces = (baseUrl) => invoke('get_spaces', { baseUrl });

// ── Lifecycle ───────────────────────────────────────────────────────────────

export const serverStart = (projectDir) => invoke('server_start', { projectDir });
export const serverStop = (projectDir) => invoke('server_stop', { projectDir });
export const serverRestart = (projectDir) => invoke('server_restart', { projectDir });
export const neo4jStart = () => invoke('neo4j_start');
export const neo4jStop = () => invoke('neo4j_stop');
export const neo4jRestart = () => invoke('neo4j_restart');
export const neo4jContainerInfo = () => invoke('neo4j_container_info');

// ── Config / DB ─────────────────────────────────────────────────────────────

export const configShow = (projectDir) => invoke('config_show', { projectDir });
export const dbMigrate = (projectDir) => invoke('db_migrate', { projectDir });
export const triggerBackup = (baseUrl, spaceId) =>
  invoke('trigger_backup', { baseUrl, spaceId });

// ── Export / Import ─────────────────────────────────────────────────────────

export const exportSpace = (projectDir, spaceId, profile, outputPath) =>
  invoke('export_space', { projectDir, spaceId, profile, outputPath });
export const importSpace = (projectDir, inputPath, consolidate, reEmbed) =>
  invoke('import_space', { projectDir, inputPath, consolidate, reEmbed });

// ── Teardown ───────────────────────────────────────────────────────────────

export const teardownInstance = (projectDir, doExport, keepData) =>
  invoke('teardown_instance', { projectDir, doExport, keepData });
export const teardownDryRun = (projectDir) =>
  invoke('teardown_dry_run', { projectDir });
export const defaultExportPath = (spaceId) => invoke('default_export_path', { spaceId });

// ── Discovery ───────────────────────────────────────────────────────────────

export const discoverPort = (projectDir) => invoke('cmd_discover_port', { projectDir });
export const discoverPid = (projectDir) => invoke('cmd_discover_pid', { projectDir });
export const isProcessAlive = (pid) => invoke('cmd_is_process_alive', { pid });
export const resolveEndpoint = (projectDir, overrideUrl) =>
  invoke('cmd_resolve_endpoint', { projectDir, overrideUrl });
export const readLogFile = (projectDir, maxLines) =>
  invoke('cmd_read_log_file', { projectDir, maxLines });

// ── Instances ───────────────────────────────────────────────────────────────

export const loadInstances = () => invoke('cmd_load_instances');
export const saveInstances = (instances) => invoke('cmd_save_instances', { instances });
export const scanForInstances = () => invoke('cmd_scan_for_instances');

// ── Utility ─────────────────────────────────────────────────────────────────

export const findMdemgBinary = () => invoke('cmd_find_mdemg_binary');

// ── Platform ───────────────────────────────────────────────────────────────

export const getHomeDir = () => invoke('cmd_get_home_dir');
