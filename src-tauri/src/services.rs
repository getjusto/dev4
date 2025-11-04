use crate::types::{AppSettings, ServiceData, ServiceProcessesState};
use crate::processes::kill_process;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use serde_yaml;

pub async fn get_services_in_services(settings: &AppSettings) -> Result<Vec<ServiceData>, String> {
    let services_path = match &settings.services_path {
        Some(path) => path,
        None => return Ok(vec![]),
    };
    
    let services_dir = format!("{}/services", services_path);
    
    if !Path::new(&services_dir).exists() {
        return Ok(vec![]);
    }
    
    let entries = fs::read_dir(&services_dir)
        .map_err(|e| format!("Failed to read services directory: {}", e))?;
    
    let mut services = Vec::new();
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Error reading directory entry: {}", e))?;
        let path = entry.path();
        
        if !path.is_dir() {
            continue;
        }
        
        let service_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };
        
        let config_path = path.join(".run.local.yaml");
        if !config_path.exists() {
            continue;
        }
        
        match fs::read_to_string(&config_path) {
            Ok(config_content) => {
                match serde_yaml::from_str::<HashMap<String, serde_json::Value>>(&config_content) {
                    Ok(config) => {
                        let port = config.get("port")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(3000) as u32;
                        
                        let full_name = format!("services.{}", service_name);
                        let on = settings.on_services
                            .as_ref()
                            .and_then(|on_map| on_map.get(&full_name))
                            .copied()
                            .unwrap_or(false);
                        
                        // Get Node version from settings or config file
                        let node_version = settings.node_versions
                            .as_ref()
                            .and_then(|node_map| node_map.get(&full_name).cloned())
                            .or_else(|| {
                                config.get("nodeVersion")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string())
                            });
                        
                        services.push(ServiceData {
                            name: service_name.clone(),
                            path: path.to_string_lossy().to_string(),
                            port,
                            full_name,
                            on,
                            category: "services".to_string(),
                            config,
                            start_command: "sh .start.run.sh".to_string(),
                            node_version,
                        });
                    }
                    Err(e) => {
                        println!("Failed to parse YAML for {}: {}", service_name, e);
                        continue;
                    }
                }
            }
            Err(e) => {
                println!("Failed to read config for {}: {}", service_name, e);
                continue;
            }
        }
    }
    
    // Sort services by name
    services.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(services)
}

pub fn get_services_in_justo(settings: &AppSettings) -> Vec<ServiceData> {
    let justo_path = match &settings.justo_path {
        Some(path) => path,
        None => return vec![],
    };
    
    let on_services = settings.on_services.as_ref();
    
    vec![
        ServiceData {
            name: "main".to_string(),
            path: format!("{}/server", justo_path),
            port: 3000,
            full_name: "justo.main".to_string(),
            on: on_services
                .and_then(|on_map| on_map.get("justo.main"))
                .copied()
                .unwrap_or(false),
            category: "justo".to_string(),
            config: HashMap::new(),
            start_command: "sh start.sh".to_string(),
            node_version: settings.node_versions
                .as_ref()
                .and_then(|node_map| node_map.get("justo.main").cloned()),
        },
        ServiceData {
            name: "web".to_string(),
            path: format!("{}/web", justo_path),
            port: 3010,
            full_name: "justo.web".to_string(),
            on: on_services
                .and_then(|on_map| on_map.get("justo.web"))
                .copied()
                .unwrap_or(false),
            category: "justo".to_string(),
            config: HashMap::new(),
            start_command: "yarn start".to_string(),
            node_version: settings.node_versions
                .as_ref()
                .and_then(|node_map| node_map.get("justo.web").cloned()),
        },
    ]
}

pub fn get_services_in_delivery(settings: &AppSettings) -> Vec<ServiceData> {
    let delivery_path = match &settings.delivery_path {
        Some(path) => path,
        None => return vec![],
    };
    
    let on_services = settings.on_services.as_ref();
    
    vec![
        ServiceData {
            name: "main".to_string(),
            path: format!("{}/server", delivery_path),
            port: 3410,
            full_name: "delivery.main".to_string(),
            on: on_services
                .and_then(|on_map| on_map.get("delivery.main"))
                .copied()
                .unwrap_or(false),
            category: "delivery".to_string(),
            config: HashMap::new(),
            start_command: "sh start.sh".to_string(),
            node_version: settings.node_versions
                .as_ref()
                .and_then(|node_map| node_map.get("delivery.main").cloned()),
        },
        ServiceData {
            name: "web".to_string(),
            path: format!("{}/web", delivery_path),
            port: 3420,
            full_name: "delivery.web".to_string(),
            on: on_services
                .and_then(|on_map| on_map.get("delivery.web"))
                .copied()
                .unwrap_or(false),
            category: "delivery".to_string(),
            config: HashMap::new(),
            start_command: "yarn start".to_string(),
            node_version: settings.node_versions
                .as_ref()
                .and_then(|node_map| node_map.get("delivery.web").cloned()),
        },
    ]
}

pub async fn start_service_with_output_capture(service: &ServiceData, processes_state: ServiceProcessesState) -> Result<u32, String> {
    println!("Starting service {} at path {}", service.name, service.path);
    
    // Ensure the service directory exists
    if !Path::new(&service.path).exists() {
        return Err(format!("Service path does not exist: {}", service.path));
    }
    
    // Determine the command to run based on the service category
    let (command, args) = match service.category.as_str() {
        "services" => {
            // For services, run the .start.run.sh script directly (it has #!/bin/bash shebang)
            let script_path = format!("{}/.start.run.sh", service.path);
            if !Path::new(&script_path).exists() {
                return Err(format!("Start script not found: {}", script_path));
            }
            // Make sure the script is executable and run it directly
            ("./.start.run.sh", vec![])
        }
        "justo" | "delivery" => {
            // For justo and delivery, run the start command directly
            if service.start_command.starts_with("sh ") {
                let script_name = service.start_command.strip_prefix("sh ").unwrap_or("start.sh");
                ("bash", vec![script_name.to_string()])
            } else if service.start_command.starts_with("yarn ") {
                let yarn_command = service.start_command.strip_prefix("yarn ").unwrap_or("start");
                ("yarn", vec![yarn_command.to_string()])
            } else {
                return Err(format!("Unsupported start command: {}", service.start_command));
            }
        }
        _ => return Err(format!("Unknown service category: {}", service.category)),
    };
    
    println!("Executing command: {} {:?} in directory: {}", command, args, service.path);
    
    // Clear any existing output for this service
    {
        let mut processes = processes_state.lock().unwrap();
        processes.clear_output(&service.full_name);
        processes.add_output(&service.full_name, &format!("🚀 Starting {} service...\n", service.name));
        processes.add_output(&service.full_name, &format!("Directory: {}\n", service.path));
        processes.add_output(&service.full_name, &format!("Command: {} {}\n", command, args.join(" ")));
        processes.add_output(&service.full_name, &format!("Port: {}\n", service.port));
        processes.add_output(&service.full_name, "Loading environment...\n");
    }
    
    // Build the command string
    let command_string = if args.is_empty() {
        command.to_string()
    } else {
        format!("{} {}", command, args.join(" "))
    };
    
    // Start with tokio::process using user's login shell to load environment
    // Source multiple shell configuration files for better compatibility and ensure we stay in the correct directory
    let node_setup = if let Some(node_version) = &service.node_version {
        format!(
            "export NVM_DIR=\"$HOME/.nvm\"; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; [ -s \"$NVM_DIR/bash_completion\" ] && . \"$NVM_DIR/bash_completion\"; if command -v nvm >/dev/null 2>&1; then echo 'Using Node.js version: {}'; nvm use {} 2>/dev/null || nvm install {} 2>/dev/null || echo 'Warning: Could not switch to Node.js version {}'; else echo 'NVM not found, using system Node.js'; fi",
            node_version, node_version, node_version, node_version
        )
    } else {
        "echo 'Using default Node.js version'".to_string()
    };
    
    // Execute with bash login shell to properly inherit environment
    let shell_command = format!(
        "cd '{}' && {}",
        service.path, command_string
    );
    
    let mut tokio_child = TokioCommand::new("/bin/zsh")
        .arg("-l")  // Login shell - loads user environment from .zshrc
        .arg("-c")
        .arg(&shell_command)
        .current_dir(&service.path)
        .env("HOME", std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string()))
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn process for {}: {}", service.name, e))?;
    
    let service_name = service.full_name.clone();
    let pid = tokio_child.id().unwrap_or(0);
    
    // Capture stdout
    if let Some(stdout) = tokio_child.stdout.take() {
        let stdout_reader = BufReader::new(stdout);
        let mut stdout_lines = stdout_reader.lines();
        let processes_state_clone = processes_state.clone();
        let service_name_clone = service_name.clone();
        
        tokio::spawn(async move {
            while let Ok(Some(line)) = stdout_lines.next_line().await {
                if let Ok(mut processes) = processes_state_clone.lock() {
                    processes.add_output(&service_name_clone, &format!("{}\n", line));
                }
            }
        });
    }
    
    // Capture stderr
    if let Some(stderr) = tokio_child.stderr.take() {
        let stderr_reader = BufReader::new(stderr);
        let mut stderr_lines = stderr_reader.lines();
        let processes_state_clone = processes_state.clone();
        let service_name_clone = service_name.clone();
        
        tokio::spawn(async move {
            while let Ok(Some(line)) = stderr_lines.next_line().await {
                if let Ok(mut processes) = processes_state_clone.lock() {
                    processes.add_output(&service_name_clone, &format!("ERROR: {}\n", line));
                }
            }
        });
    }
    
    // Spawn a task to wait for the process and log when it exits
    let processes_state_clone = processes_state.clone();
    let service_name_clone = service_name.clone();
    tokio::spawn(async move {
        match tokio_child.wait().await {
            Ok(exit_status) => {
                if let Ok(mut processes) = processes_state_clone.lock() {
                    if exit_status.success() {
                        processes.add_output(&service_name_clone, &format!("\n✅ Process completed successfully: {}\n", exit_status));
                    } else {
                        processes.add_output(&service_name_clone, &format!("\n❌ Process failed with exit status: {}\n", exit_status));
                        if let Some(code) = exit_status.code() {
                            processes.add_output(&service_name_clone, &format!("Exit code: {}\n", code));
                            match code {
                                1 => processes.add_output(&service_name_clone, "Common causes: Missing dependencies, syntax errors, or permission issues\n"),
                                127 => processes.add_output(&service_name_clone, "Command not found - check if the required tools (node, yarn, etc.) are installed\n"),
                                130 => processes.add_output(&service_name_clone, "Process interrupted (Ctrl+C)\n"),
                                _ => processes.add_output(&service_name_clone, &format!("See above logs for details about exit code {}\n", code)),
                            }
                        }
                    }
                }
            }
            Err(e) => {
                if let Ok(mut processes) = processes_state_clone.lock() {
                    processes.add_output(&service_name_clone, &format!("\nProcess wait error: {}\n", e));
                }
            }
        }
    });
    
    println!("Service {} started with PID: {}", service.name, pid);
    
    // Add initial success message
    {
        let mut processes = processes_state.lock().unwrap();
        processes.add_output(&service.full_name, &format!("Service started successfully with PID: {}\n", pid));
    }
    
    Ok(pid)
}

/// Stop all managed services
pub fn stop_all_services(processes_state: &ServiceProcessesState) -> Vec<String> {
    println!("Stopping all managed services...");
    
    let mut processes = match processes_state.lock() {
        Ok(processes) => processes,
        Err(e) => {
            println!("Failed to lock processes state during shutdown: {}", e);
            return vec!["Failed to access process state".to_string()];
        }
    };
    
    let mut actions = Vec::new();
    let service_names: Vec<String> = processes.running.keys().cloned().collect();
    
    println!("Found {} services to stop: {:?}", service_names.len(), service_names);
    
    for service_name in service_names {
        if let Some(pid) = processes.running.remove(&service_name) {
            println!("Stopping service: {} (PID: {})", service_name, pid);
            
            // Use kill command to terminate the process
            match kill_process(pid) {
                true => {
                    actions.push(format!("Stopped: {} (PID: {})", service_name, pid));
                    println!("Successfully stopped service: {} with PID: {}", service_name, pid);
                }
                false => {
                    println!("Failed to stop service {}: PID {}", service_name, pid);
                    actions.push(format!("Failed to stop: {} (PID: {})", service_name, pid));
                }
            }
        }
    }
    
    println!("Finished stopping all services. Actions: {:?}", actions);
    actions
} 