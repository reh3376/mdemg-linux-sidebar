use std::path::Path;
use std::process::Command;

/// Docker binary path on Linux.
const DOCKER_PATH: &str = "/usr/bin/docker";
/// Neo4j container name (matches docker-compose.yml).
const NEO4J_CONTAINER: &str = "mdemg-neo4j";

/// Find the mdemg binary in common install locations.
pub fn find_mdemg_binary() -> Option<String> {
    let candidates = [
        "/usr/local/bin/mdemg",
        "/usr/bin/mdemg",
    ];
    for c in &candidates {
        if Path::new(c).is_file() {
            return Some(c.to_string());
        }
    }
    // Fallback: `which mdemg`
    let output = Command::new("which").arg("mdemg").output().ok()?;
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Some(path);
        }
    }
    None
}

/// Execute mdemg CLI with given arguments and optional working directory.
pub fn execute(args: &[&str], working_dir: Option<&str>) -> Result<String, String> {
    let binary = find_mdemg_binary().ok_or_else(|| "mdemg binary not found".to_string())?;
    let mut cmd = Command::new(&binary);
    cmd.args(args);
    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    let output = cmd.output().map_err(|e| format!("Failed to execute: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let msg = if stderr.is_empty() { stdout } else { stderr };
        return Err(msg.trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Execute docker with given arguments.
pub fn docker_exec(args: &[&str]) -> Result<String, String> {
    let docker = if Path::new(DOCKER_PATH).is_file() {
        DOCKER_PATH
    } else {
        "docker"
    };
    let output = Command::new(docker)
        .args(args)
        .output()
        .map_err(|e| format!("Docker exec failed: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let msg = if stderr.is_empty() { stdout } else { stderr };
        return Err(msg.trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Check if Neo4j container is running.
pub fn neo4j_running() -> bool {
    docker_exec(&["inspect", "--format", "{{.State.Running}}", NEO4J_CONTAINER])
        .map(|s| s.trim() == "true")
        .unwrap_or(false)
}

/// Get Neo4j container resource limits (memory_mb, cpus).
pub fn neo4j_resources() -> (Option<i64>, Option<f64>) {
    let output = docker_exec(&[
        "inspect",
        "--format",
        "{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}",
        NEO4J_CONTAINER,
    ]);
    match output {
        Ok(s) => {
            let parts: Vec<&str> = s.trim().split_whitespace().collect();
            let mem_mb = parts.first()
                .and_then(|v| v.parse::<i64>().ok())
                .filter(|&v| v > 0)
                .map(|v| v / 1_048_576);
            let cpus = parts.get(1)
                .and_then(|v| v.parse::<f64>().ok())
                .filter(|&v| v > 0.0)
                .map(|v| v / 1_000_000_000.0);
            (mem_mb, cpus)
        }
        Err(_) => (None, None),
    }
}

/// Get Neo4j container uptime in seconds.
pub fn neo4j_uptime() -> Option<f64> {
    let output = docker_exec(&[
        "inspect",
        "--format",
        "{{.State.StartedAt}}",
        NEO4J_CONTAINER,
    ]).ok()?;
    let date_str = output.trim();
    // Parse ISO8601 date
    let parsed = chrono::DateTime::parse_from_rfc3339(date_str).ok()?;
    let now = chrono::Utc::now();
    Some((now - parsed.with_timezone(&chrono::Utc)).num_seconds() as f64)
}
