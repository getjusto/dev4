use crate::services::get_services_in_services;
use crate::types::{AppSettings, ServiceData, ServiceMetrics, ServiceProcessesState, ServicesResponse};
use serde::Deserialize;
use std::collections::{BTreeSet, HashMap, HashSet};
use std::fs;
use std::io;
use std::net::{Ipv4Addr, SocketAddrV4, TcpStream};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;
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

    Ok(ServicesResponse { services_list })
}

/// Prepare dev5 runtime files for the selected services.
#[tauri::command]
pub async fn prepare_services_start(services: Vec<ServiceData>) -> Result<(), String> {
    if services.is_empty() {
        return Ok(());
    }

    let repo_root = repo_root_from_services(&services)?;
    let args = vec!["setup".to_string()];
    let _ = run_dev5_command(&repo_root, &args)?;
    println!("Prepared dev5 setup at {}", repo_root.display());
    Ok(())
}

/// Ensure the correct services are running based on their 'on' state via dev5.
#[tauri::command]
pub async fn ensure_services_running(services: Vec<ServiceData>) -> Result<Vec<String>, String> {
    println!("Ensuring services are running via dev5...");

    if services.is_empty() {
        return Ok(vec![]);
    }

    let repo_root = repo_root_from_services(&services)?;
    let mut actions = Vec::new();

    let stop_selectors = collect_stop_selectors(&repo_root, &services);
    if !stop_selectors.is_empty() {
        let args = vec!["stop".to_string(), stop_selectors.join(",")];
        let _ = run_dev5_command(&repo_root, &args)?;
        actions.push(format!("yarn dev5 {}", args.join(" ")));
    }

    let start_selectors = collect_service_selectors(&services, true);
    if !start_selectors.is_empty() {
        let args = vec!["start".to_string(), start_selectors.join(",")];
        let _ = run_dev5_command(&repo_root, &args)?;
        actions.push(format!("yarn dev5 {}", args.join(" ")));
    }

    println!("Service management via dev5 completed. Actions: {:?}", actions);
    Ok(actions)
}

/// Stop all currently running services
#[tauri::command]
pub async fn stop_all_services_command() -> Result<Vec<String>, String> {
    Ok(vec![
        "dev4 no longer stops services directly. Use `yarn dev5 stop <services>`.".to_string(),
    ])
}

/// Get output for a specific service.
#[tauri::command]
pub async fn get_service_output(
    app_handle: AppHandle,
    service_name: String,
    service_path: String,
) -> Result<String, String> {
    let repo_root = repo_root_from_service_path(&service_path)?;
    let log_path = service_log_path(&repo_root, &service_name);
    let content = match fs::read_to_string(&log_path) {
        Ok(content) => content,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(String::new()),
        Err(err) => return Err(format!("Failed to read {}: {}", log_path.display(), err)),
    };

    let all_lines: Vec<&str> = content.lines().collect();
    let processes_state = app_handle.state::<ServiceProcessesState>();
    let processes = processes_state
        .lock()
        .map_err(|e| format!("Failed to lock processes state: {}", e))?;

    let clear_offset = processes
        .log_clear_offsets
        .get(&service_name)
        .copied()
        .unwrap_or(0);
    let start_at = if clear_offset > all_lines.len() {
        0
    } else {
        clear_offset
    };
    let visible_lines = &all_lines[start_at..];
    let tail_start = visible_lines.len().saturating_sub(5000);

    if visible_lines.is_empty() {
        return Ok(String::new());
    }

    let mut output = visible_lines[tail_start..].join("\n");
    output.push('\n');
    Ok(output)
}

/// Clear output for a specific service.
#[tauri::command]
pub async fn clear_service_output(
    app_handle: AppHandle,
    service_name: String,
    service_path: String,
) -> Result<(), String> {
    let repo_root = repo_root_from_service_path(&service_path)?;
    let log_path = service_log_path(&repo_root, &service_name);
    let total_lines = match fs::read_to_string(&log_path) {
        Ok(content) => content.lines().count(),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => 0,
        Err(err) => return Err(format!("Failed to read {}: {}", log_path.display(), err)),
    };

    let processes_state = app_handle.state::<ServiceProcessesState>();
    let mut processes = processes_state
        .lock()
        .map_err(|e| format!("Failed to lock processes state: {}", e))?;

    processes.log_clear_offsets.insert(service_name, total_lines);
    Ok(())
}

/// Read runtime service state from dev5-managed pids and ports.
#[tauri::command]
pub async fn get_services_runtime_status(
    services: Vec<ServiceData>,
) -> Result<HashMap<String, String>, String> {
    if services.is_empty() {
        return Ok(HashMap::new());
    }

    let repo_root = repo_root_from_services(&services)?;
    let mut statuses = HashMap::new();
    let dev5_statuses = match read_dev5_statuses(&repo_root) {
        Ok(statuses) => Some(statuses),
        Err(error) => {
            eprintln!(
                "Failed to read `dev5 status --json` in {}: {}. Falling back to local probes.",
                repo_root.display(),
                error
            );
            None
        }
    };

    for service in services {
        let status = dev5_statuses
            .as_ref()
            .and_then(|all| all.get(&service.name))
            .cloned()
            .unwrap_or_else(|| probe_service_runtime_status(&repo_root, &service.name, service.port));

        statuses.insert(service.full_name.clone(), status);
    }

    Ok(statuses)
}

/// Get CPU and memory metrics for services started by dev5.
#[tauri::command]
pub async fn get_service_metrics(
    services_path: Option<String>,
) -> Result<HashMap<String, ServiceMetrics>, String> {
    let Some(raw_path) = services_path.filter(|v| !v.trim().is_empty()) else {
        return Ok(HashMap::new());
    };

    let repo_root = repo_root_from_service_path(&raw_path)?;
    let pids_dir = repo_root.join(".local").join("pids");
    if !pids_dir.is_dir() {
        return Ok(HashMap::new());
    }

    let mut roots_by_service: HashMap<String, Vec<u32>> = HashMap::new();
    for entry in fs::read_dir(&pids_dir)
        .map_err(|e| format!("Failed to read pids dir {}: {}", pids_dir.display(), e))?
    {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        let path = entry.path();
        if path.extension().and_then(|v| v.to_str()) != Some("json") {
            continue;
        }

        let raw = match fs::read_to_string(&path) {
            Ok(raw) => raw,
            Err(_) => continue,
        };

        let state: Dev5PidState = match serde_json::from_str(&raw) {
            Ok(state) => state,
            Err(_) => continue,
        };

        if state.pid <= 0 || !is_process_alive(state.pid) {
            let _ = fs::remove_file(&path);
            continue;
        }

        let service_key = format!("services.{}", state.dir_name);
        roots_by_service
            .entry(service_key)
            .or_default()
            .push(state.pid as u32);
    }

    if roots_by_service.is_empty() {
        return Ok(HashMap::new());
    }

    let samples = read_process_samples()?;
    let mut by_pid: HashMap<u32, ProcessSample> = HashMap::new();
    let mut children_by_parent: HashMap<u32, Vec<u32>> = HashMap::new();

    for sample in samples {
        by_pid.insert(sample.pid, sample);
        children_by_parent
            .entry(sample.ppid)
            .or_default()
            .push(sample.pid);
    }

    let mut metrics: HashMap<String, ServiceMetrics> = HashMap::new();

    for (service_key, root_pids) in roots_by_service {
        let mut visited = HashSet::new();
        let mut stack = root_pids;
        let mut cpu = 0.0;
        let mut rss_kb = 0.0;

        while let Some(pid) = stack.pop() {
            if !visited.insert(pid) {
                continue;
            }

            if let Some(sample) = by_pid.get(&pid) {
                cpu += sample.cpu;
                rss_kb += sample.rss_kb;
            }

            if let Some(children) = children_by_parent.get(&pid) {
                for child in children {
                    stack.push(*child);
                }
            }
        }

        let cpu = (cpu * 10.0).round() / 10.0;
        let memory_mb = ((rss_kb / 1024.0) * 10.0).round() / 10.0;
        metrics.insert(service_key, ServiceMetrics { cpu, memory_mb });
    }

    Ok(metrics)
}

#[derive(Debug, Deserialize)]
struct Dev5PidState {
    pid: i32,
    dir_name: String,
}

#[derive(Debug, Deserialize)]
struct Dev5StatusEntry {
    dir_name: String,
    service_name: String,
    status: String,
}

#[derive(Debug, Clone, Copy)]
struct ProcessSample {
    pid: u32,
    ppid: u32,
    cpu: f64,
    rss_kb: f64,
}

fn collect_service_selectors(services: &[ServiceData], on: bool) -> Vec<String> {
    let mut selectors: BTreeSet<String> = BTreeSet::new();
    for service in services {
        if service.on == on {
            selectors.insert(service.name.clone());
        }
    }
    selectors.into_iter().collect()
}

fn collect_stop_selectors(repo_root: &Path, services: &[ServiceData]) -> Vec<String> {
    let pids_dir = repo_root.join(".local").join("pids");
    let mut selectors: BTreeSet<String> = BTreeSet::new();

    for service in services {
        if service.on {
            continue;
        }

        let pid_file = pids_dir.join(format!("{}.json", service.name));
        if pid_file.exists() {
            selectors.insert(service.name.clone());
        }
    }

    selectors.into_iter().collect()
}

fn repo_root_from_services(services: &[ServiceData]) -> Result<PathBuf, String> {
    let first = services
        .first()
        .ok_or_else(|| "No services provided".to_string())?;
    repo_root_from_service_path(&first.path)
}

fn repo_root_from_service_path(service_path: &str) -> Result<PathBuf, String> {
    let path = Path::new(service_path);
    find_repo_root(path).ok_or_else(|| {
        format!(
            "Could not find services repo root from path '{}'. Ensure it contains services/, tools/dev5 and package.json.",
            service_path
        )
    })
}

fn find_repo_root(start: &Path) -> Option<PathBuf> {
    let mut current = if start.is_dir() {
        start.to_path_buf()
    } else {
        start.parent()?.to_path_buf()
    };

    loop {
        if is_services_repo_root(&current) {
            return Some(current);
        }

        if !current.pop() {
            return None;
        }
    }
}

fn is_services_repo_root(path: &Path) -> bool {
    path.join("services").is_dir()
        && path.join("tools").is_dir()
        && path.join("tools").join("dev5").join("Cargo.toml").is_file()
        && path.join("package.json").is_file()
}

fn service_log_path(repo_root: &Path, service_full_name: &str) -> PathBuf {
    let dir_name = service_full_name
        .rsplit('.')
        .next()
        .unwrap_or(service_full_name);
    repo_root
        .join(".local")
        .join("logs")
        .join(format!("{}.log", dir_name))
}

fn read_process_samples() -> Result<Vec<ProcessSample>, String> {
    let output = Command::new("ps")
        .args(["-axww", "-o", "pid=,ppid=,pcpu=,rss="])
        .output()
        .map_err(|e| format!("Failed to run ps for metrics: {}", e))?;

    let raw = String::from_utf8_lossy(&output.stdout);
    let mut samples = Vec::new();

    for line in raw.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 {
            continue;
        }

        let (Ok(pid), Ok(ppid), Ok(cpu), Ok(rss_kb)) = (
            parts[0].parse::<u32>(),
            parts[1].parse::<u32>(),
            parts[2].parse::<f64>(),
            parts[3].parse::<f64>(),
        ) else {
            continue;
        };

        samples.push(ProcessSample {
            pid,
            ppid,
            cpu,
            rss_kb,
        });
    }

    Ok(samples)
}

fn is_process_alive(pid: i32) -> bool {
    let rc = unsafe { libc::kill(pid, 0) };
    if rc == 0 {
        return true;
    }

    match io::Error::last_os_error().raw_os_error() {
        Some(code) if code == libc::EPERM => true,
        _ => false,
    }
}

fn is_port_open(port: u16) -> bool {
    let addr = SocketAddrV4::new(Ipv4Addr::LOCALHOST, port);
    TcpStream::connect_timeout(&addr.into(), Duration::from_millis(250)).is_ok()
}

fn probe_service_runtime_status(repo_root: &Path, service_name: &str, service_port: u32) -> String {
    let pid_path = repo_root
        .join(".local")
        .join("pids")
        .join(format!("{}.json", service_name));

    let mut is_running = false;

    if let Ok(raw) = fs::read_to_string(&pid_path) {
        if let Ok(state) = serde_json::from_str::<Dev5PidState>(&raw) {
            if state.pid > 0 && is_process_alive(state.pid) {
                is_running = true;
            } else {
                let _ = fs::remove_file(&pid_path);
            }
        }
    }

    // Keep parity with dev5 status semantics for unmanaged runners.
    if !is_running && is_port_open(service_port as u16) {
        is_running = true;
    }

    if is_running {
        "on".to_string()
    } else {
        "off".to_string()
    }
}

fn normalize_dev5_status(value: &str) -> String {
    match value {
        "on" => "on".to_string(),
        "error" => "error".to_string(),
        _ => "off".to_string(),
    }
}

fn read_dev5_statuses(repo_root: &Path) -> Result<HashMap<String, String>, String> {
    let args = vec!["status".to_string(), "--json".to_string()];

    let output = match Command::new("./dev5")
        .args(&args)
        .current_dir(repo_root)
        .output()
    {
        Ok(output) => output,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            run_dev5_via_login_shell(repo_root, &args)?
        }
        Err(err) => {
            return Err(format!(
                "Failed to execute `dev5 status --json` in {}: {}",
                repo_root.display(),
                err
            ));
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !output.status.success() {
        let mut details = vec![format!(
            "`dev5 status --json` failed in {} with status {}",
            repo_root.display(),
            output.status
        )];
        details.extend(output_lines(&stdout, &stderr));
        return Err(details.join("\n"));
    }

    let entries: Vec<Dev5StatusEntry> = serde_json::from_str(&stdout).map_err(|error| {
        format!(
            "Could not parse `dev5 status --json` output: {}\nRaw output:\n{}",
            error, stdout
        )
    })?;

    let mut statuses = HashMap::new();
    for entry in entries {
        let normalized = normalize_dev5_status(&entry.status);
        if !entry.dir_name.is_empty() {
            statuses.insert(entry.dir_name, normalized.clone());
        }
        if !entry.service_name.is_empty() {
            statuses.entry(entry.service_name).or_insert(normalized);
        }
    }

    Ok(statuses)
}

fn run_dev5_command(repo_root: &Path, args: &[String]) -> Result<Vec<String>, String> {
    let direct_output = Command::new("yarn")
        .arg("dev5")
        .args(args)
        .current_dir(repo_root)
        .output();

    let output = match direct_output {
        Ok(output) => output,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            run_dev5_via_login_shell(repo_root, args)?
        }
        Err(err) => {
            return Err(format!(
                "Failed to execute `yarn dev5 {}` in {}: {}",
                args.join(" "),
                repo_root.display(),
                err
            ));
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let lines = output_lines(&stdout, &stderr);

    if output.status.success() {
        Ok(lines)
    } else {
        let mut details = vec![format!(
            "`yarn dev5 {}` failed in {} with status {}",
            args.join(" "),
            repo_root.display(),
            output.status
        )];
        details.extend(lines);
        Err(details.join("\n"))
    }
}

fn run_dev5_via_login_shell(
    repo_root: &Path,
    args: &[String],
) -> Result<std::process::Output, String> {
    let mut command = String::from("cd ");
    command.push_str(&shell_quote(&repo_root.display().to_string()));
    command.push_str(" && yarn dev5");

    for arg in args {
        command.push(' ');
        command.push_str(&shell_quote(arg));
    }

    Command::new("/bin/zsh")
        .arg("-lc")
        .arg(command)
        .output()
        .map_err(|err| format!("Failed to execute dev5 via login shell: {}", err))
}

fn shell_quote(value: &str) -> String {
    let escaped = value.replace('\'', "'\"'\"'");
    format!("'{}'", escaped)
}

fn output_lines(stdout: &str, stderr: &str) -> Vec<String> {
    stdout
        .lines()
        .chain(stderr.lines())
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect()
}
