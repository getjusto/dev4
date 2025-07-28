use std::process::Command;
use std::time::Duration;

pub fn get_child_processes(parent_pid: u32) -> Vec<u32> {
    println!("Looking for child processes of PID: {}", parent_pid);
    let mut all_children = Vec::new();
    let mut visited = std::collections::HashSet::new();

    // Get all processes at once to have consistent data
    let all_processes = get_all_processes();
    println!("Found {} total processes in system", all_processes.len());

    // Inner recursive function to collect all children using the pre-fetched process list
    fn collect_children(
        pid: u32,
        all_children: &mut Vec<u32>,
        visited: &mut std::collections::HashSet<u32>,
        all_processes: &[(u32, u32, String)],
    ) {
        // Avoid cycles
        if !visited.insert(pid) {
            return;
        }

        let immediate_children: Vec<u32> = all_processes
            .iter()
            .filter(|&&(_, ppid, _)| ppid == pid)
            .map(|&(child_pid, _, _)| child_pid)
            .collect();

        if !immediate_children.is_empty() {
            println!("Found {} children for PID {}: {:?}", immediate_children.len(), pid, immediate_children);
        }

        for &child_pid in &immediate_children {
            all_children.push(child_pid);
            collect_children(child_pid, all_children, visited, all_processes);
        }
    }

    // Start the recursive collection with the pre-fetched process list
    collect_children(parent_pid, &mut all_children, &mut visited, &all_processes);
    
    if !all_children.is_empty() {
        println!("Total descendant processes found: {}, PIDs: {:?}", all_children.len(), all_children);
    }
    
    all_children
}

fn get_all_processes() -> Vec<(u32, u32, String)> {
    // Use a more reliable format specifically for macOS
    let output = Command::new("ps")
        .args(["-axww", "-o", "user=,pid=,ppid=,command="])
        .output()
        .expect("Failed to execute ps command");

    if let Ok(output_str) = String::from_utf8(output.stdout) {
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
                    if let (Ok(pid), Ok(ppid)) =
                        (parts[1].parse::<u32>(), parts[2].parse::<u32>())
                    {
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

        processes
    } else {
        println!("Failed to parse ps output");
        Vec::new()
    }
}

/// Check if a process is still running
fn is_process_running(pid: u32) -> bool {
    Command::new("ps")
        .arg("-p")
        .arg(pid.to_string())
        .output()
        .map(|output| !output.stdout.is_empty())
        .unwrap_or(false)
}

/// Kill a single process with signal escalation
fn kill_single_process(pid: u32, use_sigkill: bool) -> bool {
    let signal_name = if use_sigkill { "SIGKILL" } else { "SIGTERM" };
    
    println!("Sending {} to PID: {}", signal_name, pid);
    
    let result = if use_sigkill {
        Command::new("kill").arg("-9").arg(pid.to_string()).output()
    } else {
        Command::new("kill").arg(pid.to_string()).output()
    };
    
    result.is_ok()
}

/// Kill a process tree (parent and all children) with proper signal escalation
pub fn kill_process_tree(root_pid: u32) -> bool {
    println!("Terminating process tree starting from PID: {}", root_pid);
    
    // Get all child processes first
    let child_pids = get_child_processes(root_pid);
    
    // Create the full list: children + root (children first, then parent)
    let mut all_pids = child_pids;
    all_pids.push(root_pid);
    
    println!("Will terminate {} processes: {:?}", all_pids.len(), all_pids);
    
    // Step 1: Send SIGTERM to all processes (children first, then parent)
    for &pid in &all_pids {
        kill_single_process(pid, false);
    }
    
    // Step 2: Wait a bit for graceful shutdown
    std::thread::sleep(Duration::from_millis(1500));
    
    // Step 3: Check which processes are still running and SIGKILL them
    let mut any_killed = false;
    for &pid in &all_pids {
        if is_process_running(pid) {
            println!("PID {} still running after SIGTERM, sending SIGKILL", pid);
            if kill_single_process(pid, true) {
                any_killed = true;
            }
        }
    }
    
    // Step 4: Final wait if we had to SIGKILL anything
    if any_killed {
        std::thread::sleep(Duration::from_millis(500));
    }
    
    // Step 5: Check if root process is finally dead
    let success = !is_process_running(root_pid);
    
    if success {
        println!("Successfully terminated process tree for PID: {}", root_pid);
    } else {
        println!("Failed to terminate process tree for PID: {}", root_pid);
    }
    
    success
}

/// Legacy function for backward compatibility - now uses process tree termination
pub fn kill_process(pid: u32) -> bool {
    kill_process_tree(pid)
} 