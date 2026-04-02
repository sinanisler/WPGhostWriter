use crate::db::queries;
use crate::models::site::Site;
use crate::services::wordpress::{PostType, WPTerm, WordPressClient};
use crate::AppState;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn add_site(
    state: State<'_, AppState>,
    name: String,
    url: String,
    username: String,
    app_password: String,
) -> Result<Site, String> {
    // Validate URL scheme
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Invalid URL: must start with http:// or https://".to_string());
    }

    let site = Site {
        id: Uuid::new_v4().to_string(),
        name,
        url,
        username,
        app_password,
        is_active: true,
    };

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::insert_site(&conn, &site).map_err(|e| e.to_string())?;
    Ok(site)
}

#[tauri::command]
pub async fn test_site_connection(
    url: String,
    username: String,
    app_password: String,
) -> Result<bool, String> {
    let client = WordPressClient::new();
    client.test_connection(&url, &username, &app_password).await
}

#[tauri::command]
pub async fn list_sites(state: State<'_, AppState>) -> Result<Vec<Site>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::list_sites(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_site(
    state: State<'_, AppState>,
    id: String,
    name: String,
    url: String,
    username: String,
    app_password: String,
) -> Result<Site, String> {
    let site = Site {
        id,
        name,
        url,
        username,
        app_password,
        is_active: true,
    };
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::update_site(&conn, &site).map_err(|e| e.to_string())?;
    Ok(site)
}

#[tauri::command]
pub async fn delete_site(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::delete_site(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_post_types(
    state: State<'_, AppState>,
    site_id: String,
) -> Result<Vec<PostType>, String> {
    let (url, username, app_password) = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let site = queries::get_site(&conn, &site_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Site not found".to_string())?;
        (site.url, site.username, site.app_password)
    };
    let client = WordPressClient::new();
    client.get_post_types(&url, &username, &app_password).await
}

#[tauri::command]
pub async fn get_categories(
    state: State<'_, AppState>,
    site_id: String,
) -> Result<Vec<WPTerm>, String> {
    let (url, username, app_password) = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let site = queries::get_site(&conn, &site_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Site not found".to_string())?;
        (site.url, site.username, site.app_password)
    };
    let client = WordPressClient::new();
    client.get_terms(&url, &username, &app_password, "categories").await
}

#[tauri::command]
pub async fn get_tags(
    state: State<'_, AppState>,
    site_id: String,
) -> Result<Vec<WPTerm>, String> {
    let (url, username, app_password) = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let site = queries::get_site(&conn, &site_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Site not found".to_string())?;
        (site.url, site.username, site.app_password)
    };
    let client = WordPressClient::new();
    client.get_terms(&url, &username, &app_password, "tags").await
}
