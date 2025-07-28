use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Global state to track running services
#[derive(Debug, Default)]
pub struct ServiceProcesses {
    pub running: HashMap<String, u32>, // Store PIDs instead of Child processes
    pub outputs: HashMap<String, String>,
}

impl ServiceProcesses {
    pub fn new() -> Self {
        Self {
            running: HashMap::new(),
            outputs: HashMap::new(),
        }
    }
    
    pub fn add_output(&mut self, service_name: &str, content: &str) {
        let current_output = self.outputs.entry(service_name.to_string()).or_insert_with(String::new);
        current_output.push_str(content);
        
        // Keep only last 1000 lines to prevent memory issues
        let lines: Vec<&str> = current_output.lines().collect();
        if lines.len() > 1000 {
            *current_output = lines[lines.len() - 1000..].join("\n");
        }
    }
    
    pub fn clear_output(&mut self, service_name: &str) {
        self.outputs.insert(service_name.to_string(), String::new());
    }
}

pub type ServiceProcessesState = Arc<Mutex<ServiceProcesses>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceData {
    pub name: String,
    pub path: String,
    pub port: u32,
    pub full_name: String,
    pub on: bool,
    pub category: String, // "services", "justo", "delivery"
    pub config: HashMap<String, serde_json::Value>,
    pub start_command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(rename = "servicesPath")]
    pub services_path: Option<String>,
    #[serde(rename = "justoPath")]
    pub justo_path: Option<String>,
    #[serde(rename = "deliveryPath")]
    pub delivery_path: Option<String>,
    #[serde(rename = "onServices")]
    pub on_services: Option<HashMap<String, bool>>,
}

#[derive(Debug, Serialize)]
pub struct ServicesResponse {
    pub services_list: Vec<ServiceData>,
    pub justo_list: Vec<ServiceData>,
    pub delivery_list: Vec<ServiceData>,
} 