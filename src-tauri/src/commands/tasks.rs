use crate::db::queries;
use crate::models::task::{CreateTaskInput, Task, TaskLog, TaskStatus, TaskStep, TaskWithPosts, UpdateTaskInput};
use crate::AppState;
use tauri::{AppHandle, State};
use uuid::Uuid;

#[tauri::command]
pub async fn create_task(
    state: State<'_, AppState>,
    input: CreateTaskInput,
) -> Result<Task, String> {
    let task = Task {
        id: Uuid::new_v4().to_string(),
        site_id: input.site_id,
        name: input.name,
        prompt: input.prompt,
        system_prompt: input.system_prompt,
        post_type: input.post_type,
        post_status: crate::models::task::PostStatusWP::from_str(&input.post_status),
        post_count: input.post_count,
        interval_minutes: input.interval_minutes,
        model_override: input.model_override,
        generate_excerpt: input.generate_excerpt,
        category_ids: input.category_ids,
        tag_ids: input.tag_ids,
        status: TaskStatus::Pending,
        current_step: TaskStep::Idle,
        posts_completed: 0,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_estimated_cost: 0.0,
        started_at: None,
        completed_at: None,
        error_message: None,
    };

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::insert_task(&conn, &task).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
pub async fn list_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::list_tasks(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task(state: State<'_, AppState>, id: String) -> Result<TaskWithPosts, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let task = queries::get_task(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Task not found".to_string())?;
    let posts = queries::get_posts_for_task(&conn, &id).map_err(|e| e.to_string())?;
    Ok(TaskWithPosts { task, posts })
}

#[tauri::command]
pub async fn start_task(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    id: String,
) -> Result<(), String> {
    state.engine.start_task(id, app_handle)
}

#[tauri::command]
pub async fn pause_task(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.engine.pause_task(&id)
}

#[tauri::command]
pub async fn resume_task(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.engine.resume_task(&id)
}

#[tauri::command]
pub async fn cancel_task(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.engine.cancel_task(&id)
}

#[tauri::command]
pub async fn delete_task(state: State<'_, AppState>, id: String) -> Result<(), String> {
    // Cancel if running
    let _ = state.engine.cancel_task(&id);
    state.engine.remove_task(&id);
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::delete_task(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task(
    state: State<'_, AppState>,
    id: String,
    input: UpdateTaskInput,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::update_task(
        &conn,
        &id,
        &input.name,
        &input.prompt,
        input.system_prompt.as_deref(),
        input.post_count,
        input.interval_minutes,
        input.model_override.as_deref(),
        input.generate_excerpt,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restart_task(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    id: String,
) -> Result<(), String> {
    let _ = state.engine.cancel_task(&id);
    state.engine.remove_task(&id);
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        queries::reset_task_to_pending(&conn, &id).map_err(|e| e.to_string())?;
    }
    state.engine.start_task(id, app_handle)
}

#[tauri::command]
pub async fn get_task_logs(
    state: State<'_, AppState>,
    task_id: String,
    limit: Option<u32>,
) -> Result<Vec<TaskLog>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_task_logs(&conn, &task_id, limit.unwrap_or(200)).map_err(|e| e.to_string())
}
