// MDEMG Linux Sidebar - System Tray Companion
// Entry point for the Tauri application

#![cfg_attr(
    all(not(debug_assertions), target_os = "linux"),
    windows_subsystem = "windows"
)]
#![allow(dead_code)]

mod api_client;
mod cli_executor;
mod commands;
mod instance_scanner;
mod instance_store;
mod server_discovery;
mod types;

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};

fn build_tray_menu() -> SystemTrayMenu {
    let show = CustomMenuItem::new("show".to_string(), "Show Sidebar");
    let status = CustomMenuItem::new("status".to_string(), "Status: Checking...");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");

    SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(status)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit)
}

fn main() {
    let tray = SystemTray::new().with_menu(build_tray_menu());

    tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .on_window_event(|event| {
            // Hide window on close instead of quitting
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
                event.window().hide().unwrap();
                api.prevent_close();
            }
        })
        .setup(|app| {
            // Background health polling — updates tray menu status text
            let app_handle = app.handle();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                let client = api_client::ApiClient::new();
                loop {
                    let healthy = rt.block_on(client.health_check("http://localhost:9999"));
                    let status_text = if healthy {
                        "Status: Running"
                    } else {
                        "Status: Offline"
                    };
                    let _ = app_handle
                        .tray_handle()
                        .get_item("status")
                        .set_title(status_text);
                    std::thread::sleep(std::time::Duration::from_secs(10));
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Health / Status
            commands::health_check,
            commands::get_readiness,
            commands::get_embedding_health,
            // Memory / Learning
            commands::get_neo4j_overview,
            commands::get_memory_stats,
            commands::get_learning_stats,
            commands::get_distribution_stats,
            commands::get_freeze_status,
            commands::get_stale_edge_stats,
            // RSIC
            commands::get_rsic_health,
            commands::get_rsic_history,
            commands::get_rsic_calibration,
            commands::trigger_rsic_cycle,
            // Actions
            commands::freeze_learning,
            commands::unfreeze_learning,
            commands::prune_learning,
            // System
            commands::get_pool_metrics,
            commands::get_spaces,
            // Lifecycle
            commands::server_start,
            commands::server_stop,
            commands::server_restart,
            commands::neo4j_start,
            commands::neo4j_stop,
            commands::neo4j_restart,
            commands::neo4j_container_info,
            // Config / DB
            commands::config_show,
            commands::db_migrate,
            commands::trigger_backup,
            // Export / Import
            commands::export_space,
            commands::import_space,
            // Discovery
            commands::cmd_discover_port,
            commands::cmd_discover_pid,
            commands::cmd_is_process_alive,
            commands::cmd_resolve_endpoint,
            commands::cmd_read_log_file,
            // Instances
            commands::cmd_load_instances,
            commands::cmd_save_instances,
            commands::cmd_scan_for_instances,
            // Utility
            commands::cmd_find_mdemg_binary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MDEMG Sidebar");
}
