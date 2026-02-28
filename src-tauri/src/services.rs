use crate::types::{AppSettings, ServiceData};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

pub async fn get_services_in_services(settings: &AppSettings) -> Result<Vec<ServiceData>, String> {
    let services_path = match &settings.services_path {
        Some(path) => path,
        None => return Ok(vec![]),
    };

    let services_dir = format!("{}/services", services_path);
    if !Path::new(&services_dir).exists() {
        return Ok(vec![]);
    }

    let entries =
        fs::read_dir(&services_dir).map_err(|e| format!("Failed to read services directory: {}", e))?;

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
                        let port = config
                            .get("port")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(3000) as u32;

                        let full_name = format!("services.{}", service_name);
                        let on = settings
                            .on_services
                            .as_ref()
                            .and_then(|on_map| on_map.get(&full_name))
                            .copied()
                            .unwrap_or(false);

                        services.push(ServiceData {
                            name: service_name.clone(),
                            path: path.to_string_lossy().to_string(),
                            port,
                            full_name,
                            on,
                            category: "services".to_string(),
                            config,
                            start_command: format!("./dev5 start {}", service_name),
                        });
                    }
                    Err(e) => {
                        println!("Failed to parse YAML for {}: {}", service_name, e);
                    }
                }
            }
            Err(e) => {
                println!("Failed to read config for {}: {}", service_name, e);
            }
        }
    }

    services.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(services)
}
