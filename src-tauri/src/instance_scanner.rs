use crate::instance_store;
use crate::types::MdemgInstance;
use std::fs;
use std::path::Path;

/// Scan ~/*/  for directories containing `.mdemg/config.yaml`.
/// Returns discovered instances (not yet added to store).
pub fn scan_home_directory() -> Vec<MdemgInstance> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return vec![],
    };

    let entries = match fs::read_dir(&home) {
        Ok(e) => e,
        Err(_) => return vec![],
    };

    let mut found = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        // Skip hidden directories
        if path
            .file_name()
            .and_then(|n| n.to_str())
            .map(|n| n.starts_with('.'))
            .unwrap_or(true)
        {
            continue;
        }

        let config_file = path.join(".mdemg").join("config.yaml");
        if !config_file.exists() {
            continue;
        }

        let (space_id, port) = parse_config(&config_file);
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        let server_url = port.map(|p| format!("http://localhost:{}", p));

        let instance = MdemgInstance {
            id: instance_store::generate_id(),
            name: name.clone(),
            project_directory: path.to_string_lossy().to_string(),
            server_url,
            space_id: space_id.unwrap_or(name),
            added_at: chrono::Utc::now().to_rfc3339(),
            source: "autoDiscovery".to_string(),
        };
        found.push(instance);
    }

    found
}

/// Basic YAML parsing to extract port and space_id from config.yaml.
fn parse_config(path: &Path) -> (Option<String>, Option<u16>) {
    let contents = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return (None, None),
    };

    let mut port: Option<u16> = None;
    let mut space_id: Option<String> = None;
    let mut in_server_block = false;

    for line in contents.lines() {
        let trimmed = line.trim();

        // Detect section headers (no leading whitespace)
        if !line.starts_with(' ') && !line.starts_with('\t') && line.contains(':') {
            in_server_block = trimmed.starts_with("server:");
        }

        // Parse port under server: section
        if in_server_block && trimmed.starts_with("port:") {
            let value = trimmed.trim_start_matches("port:").trim();
            port = value.parse().ok();
        }

        // Parse space_id at any level
        if trimmed.starts_with("space_id:") || trimmed.starts_with("space-id:") {
            let value = trimmed
                .trim_start_matches("space_id:")
                .trim_start_matches("space-id:")
                .trim()
                .trim_matches(|c| c == '"' || c == '\'');
            if !value.is_empty() {
                space_id = Some(value.to_string());
            }
        }
    }

    (space_id, port)
}
