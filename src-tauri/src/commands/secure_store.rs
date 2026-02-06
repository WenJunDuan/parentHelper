use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{Manager, State};

#[derive(Default)]
pub struct SecureStoreState {
    inner: Mutex<HashMap<String, String>>,
}

#[tauri::command]
pub async fn secure_store_set(
    app_handle: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    let state: State<'_, SecureStoreState> = app_handle.state();
    let mut lock = state
        .inner
        .lock()
        .map_err(|_| "failed to lock secure store".to_string())?;
    lock.insert(key, value);
    Ok(())
}

#[tauri::command]
pub async fn secure_store_get(
    app_handle: tauri::AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    let state: State<'_, SecureStoreState> = app_handle.state();
    let lock = state
        .inner
        .lock()
        .map_err(|_| "failed to lock secure store".to_string())?;
    Ok(lock.get(&key).cloned())
}

