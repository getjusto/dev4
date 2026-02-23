use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Global state used by the UI log viewer.
#[derive(Debug, Default)]
pub struct ServiceProcesses {
    pub log_clear_offsets: HashMap<String, usize>,
}

impl ServiceProcesses {
    pub fn new() -> Self {
        Self {
            log_clear_offsets: HashMap::new(),
        }
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
    pub category: String, // "services"
    pub config: HashMap<String, serde_json::Value>,
    pub start_command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(rename = "servicesPath")]
    pub services_path: Option<String>,
    #[serde(rename = "onServices")]
    pub on_services: Option<HashMap<String, bool>>,
}

#[derive(Debug, Serialize)]
pub struct ServicesResponse {
    pub services_list: Vec<ServiceData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceMetrics {
    pub cpu: f64,
    pub memory_mb: f64,
}
