use crate::db::queries;
use crate::AppState;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<HashMap<String, String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_all_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, AppState>,
    settings: HashMap<String, String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::save_all_settings(&conn, &settings).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_openrouter_key(api_key: String) -> Result<bool, String> {
    let client = crate::services::openrouter::OpenRouterClient::new();
    client.test_api_key(&api_key).await
}
