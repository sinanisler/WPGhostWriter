use crate::services::openrouter::{ModelInfo, OpenRouterClient};

#[tauri::command]
pub async fn fetch_openrouter_models(api_key: String) -> Result<Vec<ModelInfo>, String> {
    let client = OpenRouterClient::new();
    client.fetch_models(&api_key).await
}
