use crate::types::MdemgInstance;
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;

/// Config directory: ~/.config/mdemg-sidebar/
fn config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join("mdemg-sidebar")
}

/// Path to instances.json
fn registry_path() -> PathBuf {
    config_dir().join("instances.json")
}

/// Path to excluded.json
fn excluded_path() -> PathBuf {
    config_dir().join("excluded.json")
}

/// Load instances from disk.
pub fn load_instances() -> Vec<MdemgInstance> {
    let path = registry_path();
    if !path.exists() {
        return vec![];
    }
    match fs::read_to_string(&path) {
        Ok(data) => serde_json::from_str(&data).unwrap_or_default(),
        Err(_) => vec![],
    }
}

/// Save instances to disk atomically.
pub fn save_instances(instances: &[MdemgInstance]) -> Result<(), String> {
    let dir = config_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create config dir: {}", e))?;

    let data =
        serde_json::to_string_pretty(instances).map_err(|e| format!("Serialize error: {}", e))?;

    let tmp_path = dir.join("instances.tmp.json");
    fs::write(&tmp_path, &data).map_err(|e| format!("Write error: {}", e))?;
    fs::rename(&tmp_path, registry_path()).map_err(|e| format!("Rename error: {}", e))?;
    Ok(())
}

/// Add an instance, deduplicating by project directory.
pub fn add_instance(instances: &mut Vec<MdemgInstance>, instance: MdemgInstance) -> bool {
    let normalized = normalize_path(&instance.project_directory);
    if instances
        .iter()
        .any(|i| normalize_path(&i.project_directory) == normalized)
    {
        return false;
    }
    instances.push(instance);
    true
}

/// Remove an instance by ID.
pub fn remove_instance(instances: &mut Vec<MdemgInstance>, id: &str) {
    instances.retain(|i| i.id != id);
}

/// Generate a simple unique ID (nanosecond timestamp).
pub fn generate_id() -> String {
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", now.as_nanos())
}

/// Normalize a path for deduplication.
fn normalize_path(path: &str) -> String {
    let expanded = if path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            home.join(&path[2..]).to_string_lossy().to_string()
        } else {
            path.to_string()
        }
    } else {
        path.to_string()
    };
    // Canonicalize if possible, otherwise return as-is
    std::fs::canonicalize(&expanded)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or(expanded)
}
