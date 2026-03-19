use crate::api_client::ApiClient;
use crate::cli_executor;
use crate::instance_scanner;
use crate::instance_store;
use crate::server_discovery;
use crate::types::*;
use std::collections::HashMap;

// Lazy-init a global API client
fn client() -> ApiClient {
    ApiClient::new()
}

// ── Health / Status ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn health_check(base_url: String) -> bool {
    client().health_check(&base_url).await
}

#[tauri::command]
pub async fn get_readiness(base_url: String) -> Result<ReadinessResponse, String> {
    client()
        .get::<ReadinessResponse>(&base_url, "/readyz", None)
        .await
}

#[tauri::command]
pub async fn get_embedding_health(base_url: String) -> Result<EmbeddingHealthResponse, String> {
    client()
        .get::<EmbeddingHealthResponse>(&base_url, "/v1/embedding/health", None)
        .await
}

// ── Memory / Learning ───────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_neo4j_overview(
    base_url: String,
    space_id: String,
) -> Result<Neo4jHealth, String> {
    client()
        .get::<Neo4jHealth>(&base_url, "/v1/neo4j/overview", Some(&[("space_id", &space_id)]))
        .await
}

#[tauri::command]
pub async fn get_memory_stats(
    base_url: String,
    space_id: String,
) -> Result<MemoryStats, String> {
    client()
        .get::<MemoryStats>(&base_url, "/v1/memory/stats", Some(&[("space_id", &space_id)]))
        .await
}

#[tauri::command]
pub async fn get_learning_stats(
    base_url: String,
    space_id: String,
) -> Result<LearningStatsResponse, String> {
    client()
        .get::<LearningStatsResponse>(
            &base_url,
            "/v1/learning/stats",
            Some(&[("space_id", &space_id)]),
        )
        .await
}

#[tauri::command]
pub async fn get_distribution_stats(
    base_url: String,
    space_id: String,
) -> Result<DistributionResponse, String> {
    client()
        .get::<DistributionResponse>(
            &base_url,
            "/v1/memory/distribution",
            Some(&[("space_id", &space_id)]),
        )
        .await
}

#[tauri::command]
pub async fn get_freeze_status(
    base_url: String,
    space_id: String,
) -> Result<FreezeStatusResponse, String> {
    client()
        .get::<FreezeStatusResponse>(
            &base_url,
            "/v1/learning/freeze/status",
            Some(&[("space_id", &space_id)]),
        )
        .await
}

#[tauri::command]
pub async fn get_stale_edge_stats(
    base_url: String,
    space_id: String,
) -> Result<StaleEdgeResponse, String> {
    client()
        .get::<StaleEdgeResponse>(
            &base_url,
            "/v1/memory/edges/stale/stats",
            Some(&[("space_id", &space_id)]),
        )
        .await
}

// ── RSIC ────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_rsic_health(base_url: String) -> Result<RSICHealthResponse, String> {
    client()
        .get::<RSICHealthResponse>(&base_url, "/v1/self-improve/health", None)
        .await
}

#[tauri::command]
pub async fn get_rsic_history(
    base_url: String,
    space_id: String,
    limit: Option<i64>,
) -> Result<RSICHistoryResponse, String> {
    let l = limit.unwrap_or(10).to_string();
    client()
        .get::<RSICHistoryResponse>(
            &base_url,
            "/v1/self-improve/history",
            Some(&[("space_id", &space_id), ("limit", &l)]),
        )
        .await
}

#[tauri::command]
pub async fn get_rsic_calibration(base_url: String) -> Result<RSICCalibrationResponse, String> {
    client()
        .get::<RSICCalibrationResponse>(&base_url, "/v1/self-improve/calibration", None)
        .await
}

#[tauri::command]
pub async fn trigger_rsic_cycle(
    base_url: String,
    space_id: String,
    tier: String,
    dry_run: bool,
) -> Result<RSICCycleOutcome, String> {
    let mut body = HashMap::new();
    body.insert("space_id".into(), serde_json::json!(space_id));
    body.insert("tier".into(), serde_json::json!(tier));
    body.insert("dry_run".into(), serde_json::json!(dry_run));
    body.insert("trigger_source".into(), serde_json::json!("manual_api"));
    client()
        .post::<RSICCycleOutcome>(&base_url, "/v1/self-improve/cycle", &body)
        .await
}

// ── Actions ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn freeze_learning(
    base_url: String,
    space_id: String,
    reason: String,
) -> Result<FreezeResponse, String> {
    let mut body = HashMap::new();
    body.insert("space_id".into(), serde_json::json!(space_id));
    body.insert("reason".into(), serde_json::json!(reason));
    body.insert("frozen_by".into(), serde_json::json!("sidebar"));
    client()
        .post::<FreezeResponse>(&base_url, "/v1/learning/freeze", &body)
        .await
}

#[tauri::command]
pub async fn unfreeze_learning(
    base_url: String,
    space_id: String,
) -> Result<UnfreezeResponse, String> {
    let mut body = HashMap::new();
    body.insert("space_id".into(), serde_json::json!(space_id));
    client()
        .post::<UnfreezeResponse>(&base_url, "/v1/learning/unfreeze", &body)
        .await
}

#[tauri::command]
pub async fn prune_learning(
    base_url: String,
    space_id: String,
) -> Result<PruneResponse, String> {
    let mut body = HashMap::new();
    body.insert("space_id".into(), serde_json::json!(space_id));
    client()
        .post::<PruneResponse>(&base_url, "/v1/learning/prune", &body)
        .await
}

// ── System ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_pool_metrics(base_url: String) -> Result<PoolMetricsResponse, String> {
    client()
        .get::<PoolMetricsResponse>(&base_url, "/v1/system/pool-metrics", None)
        .await
}

#[tauri::command]
pub async fn get_spaces(base_url: String) -> Result<Vec<SpaceInfo>, String> {
    let resp: SpacesResponse = client()
        .get::<SpacesResponse>(&base_url, "/v1/admin/spaces", None)
        .await?;
    Ok(resp.spaces)
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn server_start(project_dir: Option<String>) -> Result<String, String> {
    cli_executor::execute(&["start", "--auto-migrate"], project_dir.as_deref())
}

#[tauri::command]
pub async fn server_stop(project_dir: Option<String>) -> Result<String, String> {
    cli_executor::execute(&["stop"], project_dir.as_deref())
}

#[tauri::command]
pub async fn server_restart(project_dir: Option<String>) -> Result<String, String> {
    cli_executor::execute(&["restart", "--auto-migrate"], project_dir.as_deref())
}

#[tauri::command]
pub async fn neo4j_start() -> Result<String, String> {
    cli_executor::docker_exec(&["start", "mdemg-neo4j"])
}

#[tauri::command]
pub async fn neo4j_stop() -> Result<String, String> {
    cli_executor::docker_exec(&["stop", "mdemg-neo4j"])
}

#[tauri::command]
pub async fn neo4j_restart() -> Result<String, String> {
    cli_executor::docker_exec(&["restart", "mdemg-neo4j"])
}

#[tauri::command]
pub async fn neo4j_container_info() -> Result<serde_json::Value, String> {
    let running = cli_executor::neo4j_running();
    let (mem_mb, cpus) = cli_executor::neo4j_resources();
    let uptime = cli_executor::neo4j_uptime();
    Ok(serde_json::json!({
        "running": running,
        "memory_mb": mem_mb,
        "cpus": cpus,
        "uptime_seconds": uptime,
    }))
}

// ── Config / DB ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn config_show(project_dir: Option<String>) -> Result<String, String> {
    cli_executor::execute(&["config", "show", "--json"], project_dir.as_deref())
}

#[tauri::command]
pub async fn db_migrate(project_dir: Option<String>) -> Result<String, String> {
    cli_executor::execute(&["db", "migrate"], project_dir.as_deref())
}

#[tauri::command]
pub async fn trigger_backup(base_url: String, space_id: String) -> Result<serde_json::Value, String> {
    let mut body = HashMap::new();
    body.insert("space_id".into(), serde_json::json!(space_id));
    client()
        .post::<serde_json::Value>(&base_url, "/v1/backup", &body)
        .await
}

// ── Export / Import ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn export_space(
    project_dir: Option<String>,
    space_id: String,
    profile: String,
    output_path: String,
) -> Result<String, String> {
    cli_executor::execute(
        &[
            "space",
            "export",
            "--space-id",
            &space_id,
            "--profile",
            &profile,
            "--output",
            &output_path,
        ],
        project_dir.as_deref(),
    )
}

#[tauri::command]
pub async fn import_space(
    project_dir: Option<String>,
    input_path: String,
    consolidate: bool,
    re_embed: bool,
) -> Result<String, String> {
    let mut args = vec!["space", "import", "--input", &input_path];
    if consolidate {
        args.push("--consolidate");
    }
    if re_embed {
        args.push("--re-embed");
    }
    cli_executor::execute(&args, project_dir.as_deref())
}

// ── Discovery ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn cmd_discover_port(project_dir: String) -> Option<u16> {
    server_discovery::discover_port(&project_dir)
}

#[tauri::command]
pub async fn cmd_discover_pid(project_dir: String) -> Option<u32> {
    server_discovery::discover_pid(&project_dir)
}

#[tauri::command]
pub async fn cmd_is_process_alive(pid: u32) -> bool {
    server_discovery::is_process_alive(pid)
}

#[tauri::command]
pub async fn cmd_resolve_endpoint(
    project_dir: String,
    override_url: Option<String>,
) -> String {
    server_discovery::resolve_endpoint(&project_dir, override_url.as_deref())
}

#[tauri::command]
pub async fn cmd_read_log_file(project_dir: String, max_lines: Option<usize>) -> Vec<String> {
    server_discovery::read_log_tail(&project_dir, max_lines.unwrap_or(200))
}

// ── Instances ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn cmd_load_instances() -> Vec<MdemgInstance> {
    instance_store::load_instances()
}

#[tauri::command]
pub async fn cmd_save_instances(instances: Vec<MdemgInstance>) -> Result<(), String> {
    instance_store::save_instances(&instances)
}

#[tauri::command]
pub async fn cmd_scan_for_instances() -> Vec<MdemgInstance> {
    instance_scanner::scan_home_directory()
}

// ── Utility ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn cmd_find_mdemg_binary() -> Option<String> {
    cli_executor::find_mdemg_binary()
}

#[tauri::command]
pub fn cmd_get_home_dir() -> String {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/home/user".to_string())
}
