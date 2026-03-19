use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Reads `.mdemg.port` file and parses the port number.
pub fn discover_port(project_dir: &str) -> Option<u16> {
    let path = Path::new(project_dir).join(".mdemg.port");
    let contents = fs::read_to_string(path).ok()?;
    contents.trim().parse().ok()
}

/// Reads `.mdemg/mdemg.pid` file and parses the PID.
pub fn discover_pid(project_dir: &str) -> Option<u32> {
    let path = Path::new(project_dir).join(".mdemg").join("mdemg.pid");
    let contents = fs::read_to_string(path).ok()?;
    contents.trim().parse().ok()
}

/// Check if a process is alive using kill(pid, 0).
pub fn is_process_alive(pid: u32) -> bool {
    unsafe { libc::kill(pid as i32, 0) == 0 }
}

/// Compute process uptime from PID file modification time (seconds).
pub fn process_uptime(project_dir: &str) -> Option<f64> {
    let path = Path::new(project_dir).join(".mdemg").join("mdemg.pid");
    let metadata = fs::metadata(path).ok()?;
    let modified = metadata.modified().ok()?;
    let elapsed = SystemTime::now().duration_since(modified).ok()?;
    Some(elapsed.as_secs_f64())
}

/// Resolve the MDEMG server endpoint URL using the discovery chain:
/// 1. Override URL (if provided)
/// 2. .mdemg.port file
/// 3. PID file liveness check → localhost:9999
/// 4. Fallback: localhost:9999
pub fn resolve_endpoint(project_dir: &str, override_url: Option<&str>) -> String {
    // Chain 1: explicit override
    if let Some(url) = override_url {
        if !url.is_empty() {
            return url.to_string();
        }
    }
    // Chain 2: port file
    if let Some(port) = discover_port(project_dir) {
        return format!("http://localhost:{}", port);
    }
    // Chain 3: PID file liveness
    if let Some(pid) = discover_pid(project_dir) {
        if is_process_alive(pid) {
            return "http://localhost:9999".to_string();
        }
    }
    // Fallback
    "http://localhost:9999".to_string()
}

/// Read the last N lines from the MDEMG log file.
pub fn read_log_tail(project_dir: &str, max_lines: usize) -> Vec<String> {
    let path = Path::new(project_dir)
        .join(".mdemg")
        .join("logs")
        .join("mdemg.log");
    let contents = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let lines: Vec<&str> = contents.lines().collect();
    let start = if lines.len() > max_lines {
        lines.len() - max_lines
    } else {
        0
    };
    lines[start..].iter().map(|s| s.to_string()).collect()
}

/// Path to the MDEMG config file.
pub fn config_file_path(project_dir: &str) -> PathBuf {
    Path::new(project_dir).join(".mdemg").join("config.yaml")
}

/// Path to the MDEMG log file.
pub fn log_file_path(project_dir: &str) -> PathBuf {
    Path::new(project_dir)
        .join(".mdemg")
        .join("logs")
        .join("mdemg.log")
}
