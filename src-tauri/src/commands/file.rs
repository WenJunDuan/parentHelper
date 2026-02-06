use std::fs;

#[tauri::command]
pub async fn file_read_text(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn file_write_text(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|error| error.to_string())
}

