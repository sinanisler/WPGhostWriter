mod commands;
mod db;
mod engine;
mod models;
mod services;

use engine::task_runner::TaskEngine;
use db::Db;
use tauri::Manager;

pub struct AppState {
    pub db: Db,
    pub engine: TaskEngine,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            let db = db::open(&app_data_dir).expect("Failed to open database");
            let engine = TaskEngine::new(db.clone());

            app.manage(AppState { db, engine });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Site commands
            commands::sites::add_site,
            commands::sites::test_site_connection,
            commands::sites::list_sites,
            commands::sites::update_site,
            commands::sites::delete_site,
            commands::sites::get_post_types,
            commands::sites::get_categories,
            commands::sites::get_tags,
            // Settings commands
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::test_openrouter_key,
            // Model commands
            commands::models::fetch_openrouter_models,
            // Task commands
            commands::tasks::create_task,
            commands::tasks::list_tasks,
            commands::tasks::get_task,
            commands::tasks::start_task,
            commands::tasks::pause_task,
            commands::tasks::resume_task,
            commands::tasks::cancel_task,
            commands::tasks::delete_task,
            commands::tasks::update_task,
            commands::tasks::restart_task,
            commands::tasks::get_task_logs,
            // Usage commands
            commands::usage::get_usage_summary,
            commands::usage::get_daily_usage,
            commands::usage::get_task_costs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
