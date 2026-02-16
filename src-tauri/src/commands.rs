use crate::types::{AppSettings, ServiceData, ServiceProcessesState, ServicesResponse};
use crate::services::{get_services_in_services, start_service_with_output_capture, stop_all_services};
use std::collections::HashMap;
use std::fs;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Get all services from the services monorepo folder.
#[tauri::command]
pub async fn get_services_list(settings: AppSettings) -> Result<ServicesResponse, String> {
    println!("Getting services list with settings: {:?}", settings);
    
    let services_list = get_services_in_services(&settings).await?;
    
    Ok(ServicesResponse {
        services_list,
    })
}

/// Prepare start scripts for all services
#[tauri::command]
pub async fn prepare_services_start(services: Vec<ServiceData>) -> Result<(), String> {
    println!("Preparing start scripts for {} services", services.len());
    
    for service in services {
        let script = format!(
            r#"#!/bin/bash
# Justo Runner V4.1

# Source shell configuration to access yarn
source ~/.zshrc 2>/dev/null || true

export LOCAL_NETWORK_NAME=host.docker.internal
export MONGO_URL=mongodb://host.docker.internal:3003/{}
export KAFKA_BROKERS=host.docker.internal:30092
export REDIS_URL=redis://host.docker.internal:6379/0
export JUSTO_ENV=local
export ORION_ENV_SECRET_KEY=l/sfhfgkQLSzkJvlIXvdzMk/N2THomjPm3P8oEpmaSM=
export ORION_ENV_FILE_PATH=.env.local.yml
export SERVICE_NAME={}
export PORT={}

# Only install dependencies if package.json exists and node_modules is missing or outdated
if [ -f "package.json" ]; then
  if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "Installing dependencies for {}"
    if ! yarn --frozen-lockfile; then
      echo "Warning: yarn --frozen-lockfile failed, trying regular yarn install"
      if ! yarn install; then
        echo "Error: Both yarn commands failed, proceeding anyway"
      fi
    fi
  else
    echo "Dependencies already up to date for {}"
  fi
else
  echo "No package.json found, skipping dependency installation"
fi

# Check if a process is running on the specified port (TCP)
PID=$(lsof -ti tcp:"$PORT" 2>/dev/null)

if [ -n "$PID" ]; then
  echo "Process already running on port $PORT, PID(s): $PID"
  if kill -TERM $PID 2>/dev/null; then
    echo "Sent TERM signal to PID(s): $PID"
    sleep 2
    # Check if process is still running
    if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
      echo "Process still running, sending KILL signal"
      kill -KILL $PID 2>/dev/null || true
    fi
  else
    echo "Failed to kill process(es) with PID(s): $PID"
  fi
else
  echo "No process running on port $PORT"
fi

exec sh start.sh 
"#,
            service.config.get("dbName")
                .and_then(|v| v.as_str())
                .unwrap_or(&service.name),
            service.name,
            service.port,
            service.name,
            service.name
        );
        
        let script_path = format!("{}/.start.run.sh", service.path);
        fs::write(&script_path, script)
            .map_err(|e| format!("Failed to write start script for {}: {}", service.name, e))?;
            
        println!("Created start script for service: {}", service.name);
    }
    
    Ok(())
}

/// Ensure the correct services are running based on their 'on' state
#[tauri::command]
pub async fn ensure_services_running(
    app_handle: AppHandle,
    services: Vec<ServiceData>,
) -> Result<Vec<String>, String> {
    println!("Ensuring services are running correctly...");
    
    let processes_state = app_handle.state::<ServiceProcessesState>();
    let mut actions = Vec::new();
    
    // First, collect which services should be running
    let should_be_running: HashMap<String, &ServiceData> = services
        .iter()
        .filter(|s| s.on)
        .map(|s| (s.full_name.clone(), s))
        .collect();
    
    // Get currently running services (scope the lock)
    let currently_running: Vec<String> = {
        let processes = processes_state.lock().map_err(|e| format!("Failed to lock processes state: {}", e))?;
        processes.running.keys().cloned().collect()
    };
    
    println!("Services that should be running: {:?}", should_be_running.keys().collect::<Vec<_>>());
    println!("Services currently running: {:?}", currently_running);
    
    // Stop services that shouldn't be running
    for service_name in &currently_running {
        if !should_be_running.contains_key(service_name) {
            println!("Stopping service: {}", service_name);
            
            // Scope the lock to avoid holding it across operations
            let pid_opt = {
                let mut processes = processes_state.lock().map_err(|e| format!("Failed to lock processes state: {}", e))?;
                processes.running.remove(service_name)
            };
            
            if let Some(pid) = pid_opt {
                match crate::processes::kill_process(pid) {
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
    }
    
    // Start services that should be running but aren't
    for (service_name, service) in &should_be_running {
        // Check if service is already running (scope the lock)
        let is_running = {
            let processes = processes_state.lock().map_err(|e| format!("Failed to lock processes state: {}", e))?;
            processes.running.contains_key(service_name)
        };
        
        if !is_running {
            println!("Starting service: {}", service_name);
            
            match start_service_with_output_capture(service, processes_state.inner().clone()).await {
                Ok(pid) => {
                    // Add to running processes (scope the lock)
                    {
                        let mut processes = processes_state.lock().map_err(|e| format!("Failed to lock processes state: {}", e))?;
                        processes.running.insert(service_name.clone(), pid);
                    }
                    actions.push(format!("Started: {}", service_name));
                    println!("Successfully started service: {}", service_name);
                }
                Err(e) => {
                    println!("Failed to start service {}: {}", service_name, e);
                    actions.push(format!("Failed to start: {} ({})", service_name, e));
                }
            }
        } else {
            println!("Service {} is already running", service_name);
        }
    }
    
    println!("Service management completed. Actions: {:?}", actions);
    Ok(actions)
}

/// Stop all currently running services
#[tauri::command]
pub async fn stop_all_services_command(app_handle: AppHandle) -> Result<Vec<String>, String> {
    println!("Manual stop all services requested");
    
    let processes_state = app_handle.state::<ServiceProcessesState>();
    let actions = stop_all_services(&processes_state);
    
    Ok(actions)
}

/// Get output for a specific service
#[tauri::command]
pub async fn get_service_output(app_handle: AppHandle, service_name: String) -> Result<String, String> {
    let processes_state = app_handle.state::<ServiceProcessesState>();
    let processes = processes_state.lock().map_err(|e| format!("Failed to lock processes state: {}", e))?;
    
    Ok(processes.outputs.get(&service_name).cloned().unwrap_or_default())
}

/// Clear output for a specific service
#[tauri::command]
pub async fn clear_service_output(app_handle: AppHandle, service_name: String) -> Result<(), String> {
    let processes_state = app_handle.state::<ServiceProcessesState>();
    let mut processes = processes_state.lock().map_err(|e| format!("Failed to lock processes state: {}", e))?;
    
    processes.clear_output(&service_name);
    Ok(())
} 
