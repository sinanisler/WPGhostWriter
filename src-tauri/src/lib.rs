mod commands;
mod db;
mod engine;
mod models;
mod services;

use engine::task_runner::TaskEngine;
use db::Db;
use tauri::{Emitter, Manager};

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

            // Collect IDs of tasks that were running/paused when the app last closed
            // so the background ticker can restart them automatically.
            let interrupted_ids: Vec<String> = {
                let conn = db.lock().unwrap();
                db::queries::get_interrupted_task_ids(&conn).unwrap_or_default()
            };

            // Reset those tasks to pending so the ticker can pick them up
            {
                let conn = db.lock().unwrap();
                match db::queries::reset_interrupted_tasks(&conn) {
                    Ok(n) if n > 0 => log::info!("Reset {} interrupted task(s) to pending on startup", n),
                    _ => {}
                }
            }

            let engine = TaskEngine::new(db.clone());

            app.manage(AppState { db, engine });

            // ── Background Ticker ───────────────────────────────────────────────
            // Spawns a background async task that:
            //   1. On startup: auto-restarts any tasks that were interrupted.
            //   2. Every 30 s: emits an `app-tick` event so the frontend refreshes.
            let ticker_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Brief delay so the window and frontend can finish initialising
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;

                let state = ticker_handle.state::<AppState>();

                // Auto-restart interrupted tasks from the previous session
                for id in interrupted_ids {
                    if !state.engine.is_task_active(&id) {
                        log::info!("[TICKER] Auto-restarting interrupted task {}", id);
                        if let Err(e) = state.engine.start_task(id, ticker_handle.clone()) {
                            log::error!("[TICKER] Failed to auto-restart task: {}", e);
                        }
                    }
                }

                // Periodic tick – frontend listens for this to refresh task state
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(30)).await;
                    let _ = ticker_handle.emit("app-tick", ());
                    log::debug!("[TICKER] tick emitted");
                }
            });

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
