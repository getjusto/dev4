// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::{Arc, Mutex};
use tauri::{RunEvent, Manager};

mod types;
mod processes;
mod services;
mod commands;

use types::{ServiceProcesses, ServiceProcessesState};
use commands::*;
use processes::get_child_processes;




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
            clear_service_output
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| match event {
            RunEvent::Exit => {
                println!("Starting application cleanup...");

                // First, stop all managed services cleanly with timeout
                if let Some(processes_state) = app_handle.try_state::<ServiceProcessesState>() {
                    let actions = services::stop_all_services(&processes_state);
                    println!("Service cleanup completed: {:?}", actions);
                    
                    // Give processes time to shutdown gracefully
                    std::thread::sleep(std::time::Duration::from_millis(1000));
                } else {
                    println!("No service processes state found");
                }

                // Only do fallback cleanup if we detect orphaned processes
                let current_pid = std::process::id();
                println!("Current process ID: {}", current_pid);

                // Get all child processes (with reduced logging)
                let child_pids = get_child_processes(current_pid);
                
                if !child_pids.is_empty() {
                    println!("Found {} orphaned child processes: {:?}", child_pids.len(), child_pids);
                    
                    // Kill each child process with timeout
                    for &pid in &child_pids {
                        if processes::kill_process(pid) {
                            println!("Successfully cleaned up orphaned process {}", pid);
                        } else {
                            eprintln!("Failed to clean up orphaned process {}", pid);
                        }
                    }
                } else {
                    println!("No orphaned processes found");
                }

                println!("Application cleanup completed");
            }
            _ => {}
        });
}
