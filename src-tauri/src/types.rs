use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// MARK: - Health & Readiness

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubsystemCheck {
    pub status: String,
    pub message: Option<String>,
    pub latency: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessResponse {
    pub status: String,
    pub checks: HashMap<String, SubsystemCheck>,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingHealthResponse {
    pub status: String,
    pub provider: String,
    pub model: Option<String>,
    pub dimensions: i64,
    pub latency_ms: f64,
    pub cache_enabled: bool,
    pub cache_hit_rate: Option<f64>,
    pub error_count_24h: Option<i64>,
    pub success_rate_24h: Option<f64>,
    pub circuit_breaker: Option<String>,
    pub last_error: Option<String>,
    pub last_error_at: Option<String>,
    pub configured_env_var: bool,
}

// MARK: - Neo4j

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseOverview {
    pub status: String,
    pub version: String,
    pub schema_version: i64,
    pub total_nodes: i64,
    pub total_edges: i64,
    pub total_spaces: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceOverview {
    pub space_id: String,
    pub node_count: i64,
    pub edge_count: i64,
    pub nodes_by_layer: Option<HashMap<String, i64>>,
    pub observation_count: i64,
    pub health_score: f64,
    pub last_consolidation: Option<String>,
    pub last_ingest: Option<String>,
    pub last_ingest_type: Option<String>,
    pub ingest_count: i64,
    pub is_stale: bool,
    pub learning_edges: i64,
    pub orphan_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSummary {
    pub backup_id: String,
    pub created_at: String,
    pub size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupOverview {
    pub last_full: Option<BackupSummary>,
    pub last_partial: Option<BackupSummary>,
    pub total_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Neo4jHealth {
    pub database: DatabaseOverview,
    pub spaces: Vec<SpaceOverview>,
    pub backups: BackupOverview,
    pub computed_at: String,
}

// MARK: - Memory Stats

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningActivity {
    pub co_activated_edges: i64,
    pub avg_weight: f64,
    pub max_weight: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemporalDistribution {
    pub last_24h: i64,
    pub last_7d: i64,
    pub last_30d: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connectivity {
    pub avg_degree: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub space_id: String,
    pub memory_count: i64,
    pub observation_count: i64,
    pub memories_by_layer: Option<HashMap<String, i64>>,
    pub embedding_coverage: f64,
    pub avg_embedding_dimensions: i64,
    pub learning_activity: Option<LearningActivity>,
    pub temporal_distribution: Option<TemporalDistribution>,
    pub connectivity: Option<Connectivity>,
    pub health_score: f64,
    pub computed_at: String,
}

// MARK: - Learning Stats

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FreezeState {
    pub frozen: bool,
    pub reason: Option<String>,
    pub frozen_at: Option<String>,
    pub frozen_by: Option<String>,
    pub edge_count_at_freeze: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningStatsResponse {
    pub space_id: Option<String>,
    pub decay_per_day: Option<f64>,
    pub prune_threshold: Option<f64>,
    pub max_edges_per_node: Option<i64>,
    pub freeze_state: Option<FreezeState>,
    pub total_edges: Option<i64>,
    pub avg_weight: Option<f64>,
    pub max_weight: Option<f64>,
    pub min_weight: Option<f64>,
    pub strong_edges: Option<i64>,
    pub surprising_edges: Option<i64>,
    pub edges_below_threshold: Option<i64>,
    pub avg_days_since_active: Option<f64>,
}

// MARK: - Distribution

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreDistribution {
    pub mean: f64,
    pub std_dev: f64,
    pub min: f64,
    pub max: f64,
    pub p10: f64,
    pub p25: f64,
    pub p50: f64,
    pub p75: f64,
    pub p90: f64,
    pub range: f64,
    pub count: i64,
    pub timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedStats {
    pub avg_mean: f64,
    pub avg_std_dev: f64,
    pub min_mean: f64,
    pub max_mean: f64,
    pub min_std_dev: f64,
    pub max_std_dev: f64,
    pub sample_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributionTrend {
    pub direction: Option<String>,
    pub magnitude: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertCondition {
    pub condition: Option<String>,
    pub message: Option<String>,
    pub severity: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributionStats {
    pub space_id: String,
    pub edge_count: i64,
    pub phase: String,
    pub phase_thresholds: Option<HashMap<String, i64>>,
    pub query_count: i64,
    pub latest: Option<ScoreDistribution>,
    pub aggregated: Option<AggregatedStats>,
    pub trend: Option<DistributionTrend>,
    pub alerts: Option<Vec<AlertCondition>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributionResponse {
    pub stats: Option<DistributionStats>,
    pub history: Option<Vec<ScoreDistribution>>,
}

// MARK: - Freeze Status

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FreezeStatusResponse {
    pub space_id: Option<String>,
    pub state: Option<FreezeState>,
    pub frozen_spaces: Option<HashMap<String, FreezeState>>,
    pub count: Option<i64>,
}

// MARK: - RSIC

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICWatchdog {
    pub decay_score: Option<f64>,
    pub escalation_level: Option<i64>,
    pub last_cycle_time: Option<String>,
    pub next_due: Option<String>,
    pub space_id: Option<String>,
    pub session_health_score: Option<f64>,
    pub obs_rate_per_hour: Option<f64>,
    pub active_anomalies: Option<Vec<String>>,
    pub consolidation_age_sec: Option<i64>,
    pub last_trigger_source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICPersistence {
    pub enabled: Option<bool>,
    pub dirty_keys: Option<i64>,
    pub flush_errors: Option<i64>,
    pub last_flush: Option<String>,
    pub state_nodes: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICSafetyBounds {
    pub max_nodes_affected: Option<i64>,
    pub max_edges_affected: Option<i64>,
    pub protected_spaces: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICSafetyRollback {
    pub window_sec: Option<i64>,
    pub snapshots_held: Option<i64>,
    pub oldest_snapshot_age_sec: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICSafety {
    pub enforcement_active: Option<bool>,
    pub safety_version: Option<String>,
    pub bounds: Option<RSICSafetyBounds>,
    pub rollback: Option<RSICSafetyRollback>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICHealthResponse {
    pub status: String,
    pub active_tasks: i64,
    pub watchdog: Option<RSICWatchdog>,
    pub orchestration: Option<serde_json::Value>,
    pub persistence: Option<RSICPersistence>,
    pub safety: Option<RSICSafety>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICInsight {
    pub pattern_id: Option<String>,
    pub severity: Option<String>,
    pub description: Option<String>,
    pub recommended_action: Option<String>,
    pub metric: Option<String>,
    pub value: Option<f64>,
    pub threshold: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICActionDelta {
    pub action: String,
    pub would_execute: Option<bool>,
    pub estimated_affected: Option<i64>,
    pub safety_limit: Option<i64>,
    pub within_bounds: Option<bool>,
    pub protected_space_blocked: Option<bool>,
    pub rejection_reason: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICCycleOutcome {
    pub cycle_id: String,
    pub tier: String,
    pub space_id: String,
    pub started_at: String,
    pub completed_at: String,
    pub actions_executed: i64,
    pub success_count: i64,
    pub failed_count: i64,
    pub metrics_before: Option<HashMap<String, f64>>,
    pub metrics_after: Option<HashMap<String, f64>>,
    pub calibration_delta: Option<HashMap<String, f64>>,
    pub insights: Option<Vec<RSICInsight>>,
    pub error: Option<String>,
    pub trigger_source: Option<String>,
    pub policy_version: Option<String>,
    pub dry_run: Option<bool>,
    pub safety_version: Option<String>,
    pub criteria_met: Option<bool>,
    pub criteria_detail: Option<HashMap<String, String>>,
    pub deltas: Option<Vec<RSICActionDelta>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICHistoryResponse {
    pub history: Vec<RSICCycleOutcome>,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSICCalibrationResponse {
    pub calibration: HashMap<String, f64>,
}

// MARK: - Pool Metrics

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionPool {
    pub active_connections: i64,
    pub idle_connections: i64,
    pub waiting_requests: i64,
    pub total_acquired: i64,
    pub total_created: i64,
    pub total_closed: i64,
    pub total_failed_acquire: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeMetrics {
    pub goroutines: i64,
    pub heap_alloc_mb: f64,
    pub heap_sys_mb: f64,
    pub heap_objects: i64,
    pub gc_pause_ns: i64,
    pub gc_total_pause_ms: f64,
    pub num_gc: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolMetricsResponse {
    pub connection_pool: ConnectionPool,
    pub runtime: RuntimeMetrics,
}

// MARK: - Spaces

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceInfo {
    pub space_id: String,
    pub prunable: bool,
    pub created_at: Option<String>,
    pub last_ingest_at: Option<String>,
    pub ingest_count: i64,
    pub node_count: i64,
    pub obs_count: i64,
    pub orphan_taproot: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpacesResponse {
    pub spaces: Vec<SpaceInfo>,
}

// MARK: - Action Responses

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FreezeResponse {
    pub status: String,
    pub space_id: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnfreezeResponse {
    pub status: String,
    pub space_id: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PruneResponse {
    pub space_id: String,
    pub decayed_deleted: i64,
    pub excess_deleted: i64,
    pub total_deleted: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaleEdgeResponse {
    pub coactivation_stale: i64,
    pub associated_stale: i64,
    pub nodes_with_stale_edges: i64,
    pub hidden_with_member_changes: i64,
}

// MARK: - Synergy

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SynergyStatusWrapper {
    pub data: SynergyStatusResponse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SynergyStatusResponse {
    pub jiminy_healthy: bool,
    pub claude_md_lines: i64,
    pub memory_md_lines: i64,
    pub auto_memory_files: i64,
    pub auto_memory_lines: i64,
    pub overflow_events_24h: i64,
    pub synergy_health: f64,
    pub recovery_buffer_space_entries: i64,
    pub recovery_buffer_local_entries: i64,
    pub recovery_buffer_total: i64,
    pub migration_status: String,
    pub migration_date: String,
}

// MARK: - Jiminy

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JiminyHealthResponse {
    pub status: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JiminyReadyResponse {
    pub status: String,
    pub enabled: bool,
    pub features: Option<HashMap<String, bool>>,
    pub services: Option<HashMap<String, String>>,
    pub config: Option<serde_json::Value>,
    pub stats: Option<serde_json::Value>,
    pub protocol_metrics: Option<serde_json::Value>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JiminyTierEffectivenessWrapper {
    pub data: JiminyTierEffectivenessData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JiminyTierEffectivenessData {
    pub overall_tier_comprehension: Option<Vec<f64>>,
    pub tier_outcome_count: Option<Vec<i64>>,
    pub message: Option<String>,
}

// MARK: - Instance Management

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MdemgInstance {
    pub id: String,
    pub name: String,
    pub project_directory: String,
    pub server_url: Option<String>,
    pub space_id: String,
    pub added_at: String,
    pub source: String, // "manual", "autoDiscovery", "cliInit"
}
