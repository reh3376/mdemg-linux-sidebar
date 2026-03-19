// MDEMG Linux Sidebar - System Tray Companion
// Entry point for the Tauri v2 application

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

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            // Hide window on close instead of quitting
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .setup(|app| {
            // Build tray menu
            let show = MenuItem::with_id(app, "show", "Show Sidebar", true, None::<&str>)?;
            let status =
                MenuItem::with_id(app, "status", "Status: Checking...", false, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &show,
                    &PredefinedMenuItem::separator(app)?,
                    &status,
                    &PredefinedMenuItem::separator(app)?,
                    &quit,
                ],
            )?;

            // Use the default window icon (embedded from bundle.icon config)
            let icon = app
                .default_window_icon()
                .cloned()
                .expect("no default icon — generate icons before building");

            let _tray = TrayIconBuilder::with_id("main")
                .icon(icon)
                .menu(&menu)
                .menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Background health polling — updates tray tooltip with server status
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                let client = api_client::ApiClient::new();
                loop {
                    let healthy = rt.block_on(client.health_check("http://localhost:9999"));
                    let status_text = if healthy {
                        "MDEMG: Running"
                    } else {
                        "MDEMG: Offline"
                    };
                    if let Some(tray) = app_handle.tray_by_id("main") {
                        let _ = tray.set_tooltip(Some(status_text));
                    }
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
            // Teardown
            commands::teardown_instance,
            commands::teardown_dry_run,
            commands::default_export_path,
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
            commands::cmd_get_home_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MDEMG Sidebar");
}
