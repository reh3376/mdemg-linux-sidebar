// MDEMG Linux Sidebar - System Tray Companion
// Entry point for the Tauri application

#![cfg_attr(
    all(not(debug_assertions), target_os = "linux"),
    windows_subsystem = "windows"
)]

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
        .run(tauri::generate_context!())
        .expect("error while running MDEMG Sidebar");
}
