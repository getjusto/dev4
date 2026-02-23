// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::{Arc, Mutex};

mod types;
mod services;
mod commands;

use types::{ServiceProcesses, ServiceProcessesState};
use commands::*;




#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_pty::init())
        .manage(Arc::new(Mutex::new(ServiceProcesses::new())) as ServiceProcessesState)
        .invoke_handler(tauri::generate_handler![
            greet,
            get_services_list,
            prepare_services_start,
            ensure_services_running,
            stop_all_services_command,
            get_service_output,
            clear_service_output,
            get_services_runtime_status,
            get_service_metrics
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_, _| {});
}
