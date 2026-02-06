use serde_json::Value;

#[tauri::command]
pub async fn db_execute(_sql: String, _params: Option<Vec<Value>>) -> Result<Value, String> {
    Ok(serde_json::json!({
        "status": "ok",
        "message": "TODO: implement db_execute"
    }))
}

