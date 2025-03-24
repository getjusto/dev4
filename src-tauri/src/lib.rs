// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::RunEvent;
use std::process::Command;
use std::time::Duration;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn get_child_processes(parent_pid: u32) -> Vec<u32> {
    println!("=======================================");
    println!("[get_child_processes] Starting search for children of PID: {}", parent_pid);
    let mut all_children = Vec::new();
    let mut visited = std::collections::HashSet::new();
    
    // Get all processes at once to have consistent data
    println!("[get_child_processes] Getting all processes from system");
    let all_processes = get_all_processes();
    println!("[get_child_processes] Found {} total processes in system", all_processes.len());
    
    // Inner recursive function to collect all children using the pre-fetched process list
    fn collect_children(
        pid: u32, 
        all_children: &mut Vec<u32>, 
        visited: &mut std::collections::HashSet<u32>,
        all_processes: &[(u32, u32, String)]
    ) {
        println!("[collect_children] Collecting children for PID: {}", pid);
        // Avoid cycles
        if !visited.insert(pid) {
            println!("[collect_children] PID {} already visited, skipping", pid);
            return;
        }
        
        println!("[collect_children] Finding immediate children of PID: {}", pid);
        let immediate_children: Vec<u32> = all_processes
            .iter()
            .filter(|&&(_, ppid, _)| ppid == pid)
            .map(|&(child_pid, _, _)| child_pid)
            .collect();
            
        // Debug: Print all processes to help diagnose filtering issues
        println!("[collect_children] PID {} - Full process list contains {} processes", pid, all_processes.len());
        println!("[collect_children] Processes with PPID={}:", pid);
        
        // Find and print only processes that have this PID as parent
        let matching_processes: Vec<_> = all_processes
            .iter()
            .filter(|&&(_, ppid, _)| ppid == pid)
            .collect();
            
        println!("[collect_children] Found {} processes with PPID={}", matching_processes.len(), pid);
        
        // Print all matching processes plus a few others for context
        for (i, &(proc_pid, proc_ppid, ref cmd)) in all_processes.iter().take(700).enumerate() {
            let is_child = proc_ppid == pid;
            // Bold/highlight child processes in the log
            let prefix = if is_child { ">>> " } else { "    " };
            println!("[collect_children] {}Process {}: PID={}, PPID={}, IsChild={}, CMD={}", 
                prefix, i, proc_pid, proc_ppid, is_child, cmd);
        }
        
        println!("[collect_children] Found {} immediate children for PID: {}", immediate_children.len(), pid);
        if !immediate_children.is_empty() {
            println!("[collect_children] Children PIDs: {:?}", immediate_children);
        }
        
        for &child_pid in &immediate_children {
            println!("[collect_children] Adding child PID: {} to results", child_pid);
            all_children.push(child_pid);
            println!("[collect_children] Recursively collecting children of PID: {}", child_pid);
            collect_children(child_pid, all_children, visited, all_processes);
        }
        println!("[collect_children] Finished processing PID: {}", pid);
    }
    
    // Function to get all processes at once
    fn get_all_processes() -> Vec<(u32, u32, String)> {
        println!("[get_all_processes] Getting all processes");
        
        // Use a more reliable format specifically for macOS
        // Format: user,pid,ppid,command with fixed width columns to help parsing
        let output = Command::new("ps")
            .args(["-axww", "-o", "user=,pid=,ppid=,command="])
            .output()
            .expect("Failed to execute ps command");

        if let Ok(output_str) = String::from_utf8(output.stdout) {
            println!("[get_all_processes] Successfully parsed ps output");
            
            // Process each line with a simpler format: USER PID PPID COMMAND
            let processes: Vec<(u32, u32, String)> = output_str
                .lines()
                .filter_map(|line| {
                    let trimmed_line = line.trim();
                    if trimmed_line.is_empty() {
                        return None;
                    }
                    
                    // Split on whitespace for the first three fields, then the rest is command
                    let parts: Vec<&str> = trimmed_line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        if let (Ok(pid), Ok(ppid)) = (parts[1].parse::<u32>(), parts[2].parse::<u32>()) {
                            // Everything after the first three fields is the command
                            let cmd_start = parts[0].len() + parts[1].len() + parts[2].len() + 3; // +3 for spaces
                            let cmd = if cmd_start < trimmed_line.len() {
                                trimmed_line[cmd_start..].to_string()
                            } else {
                                "<unknown>".to_string()
                            };
                            return Some((pid, ppid, cmd));
                        }
                    }
                    None
                })
                .collect();
            
            println!("[get_all_processes] First 10 processes:");
            for (i, &(pid, ppid, ref cmd)) in processes.iter().take(10).enumerate() {
                println!("[get_all_processes] Process {}: PID={}, PPID={}, CMD={}", 
                         i, pid, ppid, cmd);
            }
            
            println!("[get_all_processes] Total processes found: {}", processes.len());
            
            // Validity check - we should have at least some processes
            if processes.is_empty() {
                println!("[get_all_processes] WARNING: No processes found, this may indicate a parsing issue");
            }
            
            processes
        } else {
            println!("[get_all_processes] Failed to parse ps output");
            Vec::new()
        }
    }
    
    // Start the recursive collection with the pre-fetched process list
    println!("[get_child_processes] Starting recursive collection for PID: {}", parent_pid);
    collect_children(parent_pid, &mut all_children, &mut visited, &all_processes);
    println!("[get_child_processes] Total descendant processes found: {}", all_children.len());
    if !all_children.is_empty() {
        println!("[get_child_processes] All descendant PIDs: {:?}", all_children);
    }
    println!("=======================================");
    all_children
}

fn kill_process(pid: u32) -> bool {
    println!("[kill_process] Attempting to kill PID: {}", pid);
    // First try SIGTERM
    println!("[kill_process] Sending SIGTERM to PID: {}", pid);
    let term_result = Command::new("kill")
        .arg(pid.to_string())
        .output();
    
    match &term_result {
        Ok(_) => println!("[kill_process] SIGTERM sent successfully to PID: {}", pid),
        Err(e) => println!("[kill_process] Failed to send SIGTERM to PID {}: {}", pid, e),
    }

    // Wait a bit to see if process terminated
    println!("[kill_process] Waiting 100ms for PID {} to terminate", pid);
    std::thread::sleep(Duration::from_millis(100));

    // Check if process is still running
    println!("[kill_process] Checking if PID {} is still running", pid);
    let is_running = Command::new("ps")
        .arg("-p")
        .arg(pid.to_string())
        .output()
        .map(|output| {
            let still_running = !output.stdout.is_empty();
            println!("[kill_process] PID {} running status: {}", pid, still_running);
            still_running
        })
        .unwrap_or_else(|e| {
            println!("[kill_process] Error checking if PID {} is running: {}", pid, e);
            false
        });

    if is_running {
        // If still running, try SIGKILL
        println!("[kill_process] PID {} still running, sending SIGKILL", pid);
        let kill_result = Command::new("kill")
            .arg("-9")
            .arg(pid.to_string())
            .output();
        
        match &kill_result {
            Ok(_) => println!("[kill_process] SIGKILL sent successfully to PID: {}", pid),
            Err(e) => println!("[kill_process] Failed to send SIGKILL to PID {}: {}", pid, e),
        }
        
        let success = kill_result.is_ok();
        println!("[kill_process] SIGKILL result for PID {}: {}", pid, success);
        success
    } else {
        let success = term_result.is_ok();
        println!("[kill_process] Process PID {} terminated with SIGTERM, result: {}", pid, success);
        success
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_pty::init())
        .invoke_handler(tauri::generate_handler![greet])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            RunEvent::Exit => {
                println!("Starting application cleanup...");

                // Get the current process ID
                let current_pid = std::process::id();
                println!("Current process ID: {}", current_pid);

                // Get all child processes
                let child_pids = get_child_processes(current_pid);
                println!("Found {} child processes", child_pids.len());

                // Kill each child process
                for &pid in &child_pids {
                    println!("Attempting to kill process {}", pid);
                    if kill_process(pid) {
                        println!("Successfully killed process {}", pid);
                    } else {
                        eprintln!("Failed to kill process {}", pid);
                    }
                }

                // Kill any remaining processes that might have been created by our children
                let remaining_pids = get_child_processes(current_pid);
                if !remaining_pids.is_empty() {
                    println!("Found {} remaining child processes, attempting to kill them", remaining_pids.len());
                    for &pid in &remaining_pids {
                        if kill_process(pid) {
                            println!("Successfully killed remaining process {}", pid);
                        } else {
                            eprintln!("Failed to kill remaining process {}", pid);
                        }
                    }
                }

                println!("Application cleanup completed");
            }
            _ => {}
        });
}
