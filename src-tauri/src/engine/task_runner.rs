use crate::db::{queries, Db};
use crate::models::task::{PostStatusWP, TaskStatus, TaskStep};
use crate::models::usage::UsageRecord;
use crate::services::openrouter::OpenRouterClient;
use crate::services::usage_tracker::UsageTracker;
use crate::services::wordpress::WordPressClient;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};
use tokio::sync::Notify;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskProgressPayload {
    pub task_id: String,
    pub status: String,
    pub current_step: String,
    pub posts_completed: u32,
    pub total_posts: u32,
    pub current_post_title: Option<String>,
    pub cost_so_far: f64,
    pub log_message: Option<String>,
    // Debug fields
    pub debug_api_key_set: bool,
    pub debug_model: String,
    pub debug_site_url: String,
}

struct TaskHandle {
    cancel_token: CancellationToken,
    pause_flag: Arc<AtomicBool>,
    pause_notify: Arc<Notify>,
    #[allow(dead_code)]
    task_join: JoinHandle<()>,
}

pub struct TaskEngine {
    db: Db,
    active_tasks: Arc<DashMap<String, TaskHandle>>,
    usage_tracker: Arc<UsageTracker>,
    openrouter: Arc<OpenRouterClient>,
    wordpress: Arc<WordPressClient>,
}

impl TaskEngine {
    pub fn new(db: Db) -> Self {
        let usage_tracker = Arc::new(UsageTracker::new(db.clone()));
        Self {
            db,
            active_tasks: Arc::new(DashMap::new()),
            usage_tracker,
            openrouter: Arc::new(OpenRouterClient::new()),
            wordpress: Arc::new(WordPressClient::new()),
        }
    }

    pub fn openrouter(&self) -> Arc<OpenRouterClient> {
        self.openrouter.clone()
    }

    pub fn start_task(&self, task_id: String, app_handle: AppHandle) -> Result<(), String> {
        if self.active_tasks.contains_key(&task_id) {
            return Err("Task already running".to_string());
        }

        let db = self.db.clone();
        let usage_tracker = self.usage_tracker.clone();
        let openrouter = self.openrouter.clone();
        let wordpress = self.wordpress.clone();
        let cancel_token = CancellationToken::new();
        let pause_flag = Arc::new(AtomicBool::new(false));
        let pause_notify = Arc::new(Notify::new());

        let ct = cancel_token.clone();
        let pf = pause_flag.clone();
        let pn = pause_notify.clone();
        let tid = task_id.clone();

        let handle = tokio::spawn(async move {
            run_task(tid, db, usage_tracker, openrouter, wordpress, ct, pf, pn, app_handle).await;
        });

        self.active_tasks.insert(
            task_id,
            TaskHandle {
                cancel_token,
                pause_flag,
                pause_notify,
                task_join: handle,
            },
        );

        Ok(())
    }

    pub fn pause_task(&self, task_id: &str) -> Result<(), String> {
        if let Some(handle) = self.active_tasks.get(task_id) {
            handle.pause_flag.store(true, Ordering::SeqCst);
            Ok(())
        } else {
            Err("Task not running".to_string())
        }
    }

    pub fn resume_task(&self, task_id: &str) -> Result<(), String> {
        if let Some(handle) = self.active_tasks.get(task_id) {
            handle.pause_flag.store(false, Ordering::SeqCst);
            handle.pause_notify.notify_one();
            Ok(())
        } else {
            Err("Task not active".to_string())
        }
    }

    pub fn cancel_task(&self, task_id: &str) -> Result<(), String> {
        if let Some((_, handle)) = self.active_tasks.remove(task_id) {
            handle.cancel_token.cancel();
            Ok(())
        } else {
            Err("Task not running".to_string())
        }
    }

    pub fn remove_task(&self, task_id: &str) {
        self.active_tasks.remove(task_id);
    }
}

async fn run_task(
    task_id: String,
    db: Db,
    _usage_tracker: Arc<UsageTracker>,
    openrouter: Arc<OpenRouterClient>,
    wordpress: Arc<WordPressClient>,
    cancel_token: CancellationToken,
    pause_flag: Arc<AtomicBool>,
    pause_notify: Arc<Notify>,
    app_handle: AppHandle,
) {
    // Load task and settings
    let (task, settings, site) = {
        let conn = db.lock().unwrap();
        let task = match queries::get_task(&conn, &task_id) {
            Ok(Some(t)) => t,
            _ => {
                log::error!("Task {} not found", task_id);
                return;
            }
        };
        let settings = queries::get_all_settings(&conn).unwrap_or_default();
        let site = match queries::get_site(&conn, &task.site_id) {
            Ok(Some(s)) => s,
            _ => {
                log::error!("Site not found for task {}", task_id);
                return;
            }
        };
        (task, settings, site)
    };

    // Mark task as running
    {
        let conn = db.lock().unwrap();
        let _ = queries::update_task_started(&conn, &task_id);
    }

    let api_key = settings.get("openrouter_api_key").cloned().unwrap_or_default();
    let model = task
        .model_override
        .clone()
        .or_else(|| settings.get("default_model").cloned())
        .unwrap_or_else(|| "openai/gpt-4o-mini".to_string());

    // ── DEBUG: log startup config ──────────────────────────────────────────
    let api_key_set = !api_key.is_empty();
    let debug_site_url = site.url.clone();
    let debug_model = model.clone();
    log::info!("[TASK {}] Starting: model={} api_key_set={} site={} posts={} interval={}s",
        task_id, model, api_key_set, site.url, task.post_count, task.interval_seconds);
    if !api_key_set {
        log::error!("[TASK {}] ERROR: OpenRouter API key is empty! Task will fail.", task_id);
    }

    let temperature: f64 = settings
        .get("default_temperature")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0.7);
    let max_tokens: u32 = settings
        .get("default_max_tokens")
        .and_then(|v| v.parse().ok())
        .unwrap_or(4096);
    let top_p: f64 = settings
        .get("default_top_p")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0.9);
    let frequency_penalty: f64 = settings
        .get("default_frequency_penalty")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0.0);
    let presence_penalty: f64 = settings
        .get("default_presence_penalty")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0.0);

    let system_prompt = task
        .system_prompt
        .clone()
        .or_else(|| settings.get("default_system_prompt").cloned())
        .unwrap_or_else(|| crate::models::settings::BUILT_IN_DEFAULT_SYSTEM_PROMPT.to_string());

    let emit_progress = |step: &str, completed: u32, title: Option<String>, cost: f64, log: Option<String>| {
        let payload = TaskProgressPayload {
            task_id: task_id.clone(),
            status: "running".to_string(),
            current_step: step.to_string(),
            posts_completed: completed,
            total_posts: task.post_count,
            current_post_title: title,
            cost_so_far: cost,
            log_message: log,
            debug_api_key_set: !api_key.is_empty(),
            debug_model: model.clone(),
            debug_site_url: debug_site_url.clone(),
        };
        log::debug!("[TASK {}] emit task-progress: step={} completed={}/{}", task_id, step, completed, task.post_count);
        if let Err(e) = app_handle.emit("task-progress", &payload) {
            log::warn!("[TASK {}] Failed to emit progress event: {}", task_id, e);
        }
    };

    let log_db = |level: &str, message: &str| {
        let conn = db.lock().unwrap();
        let _ = queries::insert_log(&conn, &task_id, level, message);
    };

    // Check pause/cancel
    macro_rules! check_cancel {
        () => {
            if cancel_token.is_cancelled() {
                let conn = db.lock().unwrap();
                let _ = queries::update_task_completed(&conn, &task_id, "cancelled", None);
                emit_progress("idle", 0, None, 0.0, Some("Task cancelled".to_string()));
                return;
            }
            while pause_flag.load(Ordering::SeqCst) {
                {
                    let conn = db.lock().unwrap();
                    let _ = queries::update_task_status(&conn, &task_id, &TaskStatus::Paused, &TaskStep::Idle);
                }
                emit_progress("idle", 0, None, 0.0, Some("Task paused".to_string()));
                pause_notify.notified().await;
                {
                    let conn = db.lock().unwrap();
                    let _ = queries::update_task_status(&conn, &task_id, &TaskStatus::Running, &TaskStep::Idle);
                }
            }
        };
    }

    // ── Step 1: Generate Titles ───────────────────────────────────────────
    {
        let conn = db.lock().unwrap();
        let _ = queries::update_task_status(&conn, &task_id, &TaskStatus::Running, &TaskStep::GeneratingTitles);
    }
    emit_progress("generating_titles", 0, None, 0.0, Some("Generating titles...".to_string()));
    log_db("info", "Starting title generation");
    log::info!("[TASK {}] Calling OpenRouter: model={} api_key_len={}", task_id, model, api_key.len());

    if api_key.is_empty() {
        let err = "OpenRouter API key is not configured. Go to Settings > API and save your key.".to_string();
        log_db("error", &err);
        let conn = db.lock().unwrap();
        let _ = queries::update_task_completed(&conn, &task_id, "failed", Some(&err));
        emit_progress("idle", 0, None, 0.0, Some(format!("FAILED: {}", err)));
        return;
    }

    let title_prompt = format!(
        "Generate exactly {} unique, SEO-friendly article titles about the following topic. \
         Return ONLY a valid JSON array of strings, no other text.\n\nTopic: {}",
        task.post_count, task.prompt
    );

    let title_resp = match openrouter
        .complete(
            &api_key, &model, &system_prompt, &title_prompt,
            temperature, top_p, max_tokens, frequency_penalty, presence_penalty,
        )
        .await
    {
        Ok(r) => {
            log::info!("[TASK {}] Title response OK: tokens={}", task_id, r.usage.total_tokens);
            r
        }
        Err(e) => {
            log::error!("[TASK {}] OpenRouter error: {}", task_id, e);
            log_db("error", &format!("Title generation failed: {}", e));
            let conn = db.lock().unwrap();
            let _ = queries::update_task_completed(&conn, &task_id, "failed", Some(&e));
            emit_progress("idle", 0, None, 0.0, Some(format!("Failed: {}", e)));
            return;
        }
    };

    // Parse titles JSON - strip markdown code blocks if present
    let raw = title_resp.content.trim();
    let clean = if raw.starts_with("```") {
        raw.lines()
            .skip(1)
            .take_while(|l| !l.starts_with("```"))
            .collect::<Vec<_>>()
            .join("\n")
    } else {
        raw.to_string()
    };

    let titles: Vec<String> = match serde_json::from_str(&clean) {
        Ok(t) => t,
        Err(e) => {
            let err = format!("Failed to parse titles JSON: {}. Raw: {}", e, clean);
            log_db("error", &err);
            let conn = db.lock().unwrap();
            let _ = queries::update_task_completed(&conn, &task_id, "failed", Some(&err));
            return;
        }
    };

    // Calculate title gen cost split across posts
    let title_cost = openrouter.calculate_cost(&model, title_resp.usage.prompt_tokens, title_resp.usage.completion_tokens);
    let cost_per_post = if task.post_count > 0 { title_cost / task.post_count as f64 } else { 0.0 };
    let title_tokens_per_post = title_resp.usage.prompt_tokens / task.post_count.max(1) as u64;
    let completion_tokens_per_post = title_resp.usage.completion_tokens / task.post_count.max(1) as u64;

    // Create post rows
    let base_time = chrono::Utc::now();
    let mut post_ids: Vec<(String, String)> = Vec::new(); // (post_id, title)

    {
        let conn = db.lock().unwrap();
        let _ = queries::add_task_tokens(&conn, &task_id, title_resp.usage.prompt_tokens, title_resp.usage.completion_tokens, title_cost);
    }

    for (i, title) in titles.iter().enumerate().take(task.post_count as usize) {
        let post_id = Uuid::new_v4().to_string();
        let scheduled_at = {
            let offset = chrono::Duration::seconds((i as i64) * (task.interval_seconds as i64));
            (base_time + offset).format("%Y-%m-%dT%H:%M:%S").to_string()
        };

        let post = crate::models::post::Post {
            id: post_id.clone(),
            task_id: task_id.clone(),
            sequence_number: (i + 1) as u32,
            title: Some(title.clone()),
            content: None,
            excerpt: None,
            wp_post_id: None,
            status: "title_generated".to_string(),
            prompt_tokens: title_tokens_per_post,
            completion_tokens: completion_tokens_per_post,
            estimated_cost: cost_per_post,
            scheduled_at: Some(scheduled_at.clone()),
            published_at: None,
            error_message: None,
        };

        {
            let conn = db.lock().unwrap();
            let _ = queries::insert_post(&conn, &post);
            let _ = queries::update_post_title(&conn, &post_id, title);
            let _ = queries::add_post_tokens(&conn, &post_id, title_tokens_per_post, completion_tokens_per_post, cost_per_post);
        }

        post_ids.push((post_id, title.clone()));
    }

    log_db("info", &format!("Generated {} titles", post_ids.len()));

    // ── Step 2: Generate Content & Publish ────────────────────────────────
    let mut total_cost = title_cost;

    for (idx, (post_id, title)) in post_ids.iter().enumerate() {
        check_cancel!();

        {
            let conn = db.lock().unwrap();
            let _ = queries::update_task_status(&conn, &task_id, &TaskStatus::Running, &TaskStep::GeneratingContent);
        }

        emit_progress(
            "generating_content",
            idx as u32,
            Some(title.clone()),
            total_cost,
            Some(format!("Generating content for: {}", title)),
        );
        log_db("info", &format!("[{}/{}] Generating content: {}", idx + 1, task.post_count, title));

        let content_prompt = format!(
            "Write a comprehensive, well-structured article for the following title.\n\
             Use HTML formatting with <h2>, <h3> headings, <p> paragraphs, and lists where appropriate.\n\
             Do not include the title as an <h1>.\n\n\
             Title: {}\n\
             Original topic context: {}",
            title, task.prompt
        );

        // Retry up to 3 times
        let mut content_result = None;
        for attempt in 0..3 {
            check_cancel!();
            match openrouter
                .complete(&api_key, &model, &system_prompt, &content_prompt, temperature, top_p, max_tokens, frequency_penalty, presence_penalty)
                .await
            {
                Ok(r) => {
                    content_result = Some(r);
                    break;
                }
                Err(e) => {
                    log_db("warn", &format!("Content gen attempt {} failed: {}", attempt + 1, e));
                    if attempt < 2 {
                        tokio::time::sleep(std::time::Duration::from_secs(2u64.pow(attempt))).await;
                    }
                }
            }
        }

        let content_resp = match content_result {
            Some(r) => r,
            None => {
                let err = "Content generation failed after 3 attempts".to_string();
                log_db("error", &err);
                let conn = db.lock().unwrap();
                let _ = queries::update_post_failed(&conn, post_id, &err);
                continue;
            }
        };

        let content = content_resp.content.clone();
        let content_cost = openrouter.calculate_cost(&model, content_resp.usage.prompt_tokens, content_resp.usage.completion_tokens);
        total_cost += content_cost;

        // Step 2b: Generate Excerpt (if enabled)
        let excerpt = if task.generate_excerpt {
            check_cancel!();
            let excerpt_context: String = content.chars().take(500).collect();
            let excerpt_prompt = format!(
                "Write a concise 1-2 sentence excerpt/summary for the following article.\n\
                 Return only the plain text excerpt, no HTML tags.\n\n\
                 Title: {}\nArticle: {}",
                title, excerpt_context
            );
            match openrouter
                .complete(&api_key, &model, &system_prompt, &excerpt_prompt, 0.5, 0.9, 256, 0.0, 0.0)
                .await
            {
                Ok(exc_resp) => {
                    let exc_cost = openrouter.calculate_cost(&model, exc_resp.usage.prompt_tokens, exc_resp.usage.completion_tokens);
                    total_cost += exc_cost;
                    let conn = db.lock().unwrap();
                    let _ = queries::add_post_tokens(&conn, post_id, exc_resp.usage.prompt_tokens, exc_resp.usage.completion_tokens, exc_cost);
                    let _ = queries::add_task_tokens(&conn, &task_id, exc_resp.usage.prompt_tokens, exc_resp.usage.completion_tokens, exc_cost);
                    Some(exc_resp.content)
                }
                Err(e) => {
                    log_db("warn", &format!("Excerpt generation failed: {}", e));
                    None
                }
            }
        } else {
            None
        };

        // Update post content in DB
        {
            let conn = db.lock().unwrap();
            let _ = queries::update_post_content(&conn, post_id, &content, excerpt.as_deref());
            let _ = queries::add_post_tokens(&conn, post_id, content_resp.usage.prompt_tokens, content_resp.usage.completion_tokens, content_cost);
            let _ = queries::add_task_tokens(&conn, &task_id, content_resp.usage.prompt_tokens, content_resp.usage.completion_tokens, content_cost);
        }

        // Record usage
        let usage_rec = UsageRecord {
            prompt_tokens: content_resp.usage.prompt_tokens,
            completion_tokens: content_resp.usage.completion_tokens,
            total_tokens: content_resp.usage.total_tokens,
            estimated_cost: content_cost,
            model: model.clone(),
        };
        // Usage tracker already called add_post/task_tokens above; just do daily upsert
        {
            let conn = db.lock().unwrap();
            let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
            let daily = crate::models::usage::DailyUsage {
                date: today,
                model: model.clone(),
                prompt_tokens: usage_rec.prompt_tokens,
                completion_tokens: usage_rec.completion_tokens,
                total_tokens: usage_rec.total_tokens,
                estimated_cost: usage_rec.estimated_cost,
                request_count: 1,
            };
            let _ = queries::upsert_daily_usage(&conn, &daily);
        }

        // ── Step 3: Publish ──────────────────────────────────────────────
        check_cancel!();
        {
            let conn = db.lock().unwrap();
            let _ = queries::update_task_status(&conn, &task_id, &TaskStatus::Running, &TaskStep::Publishing);
        }
        emit_progress("publishing", idx as u32, Some(title.clone()), total_cost, Some(format!("Publishing: {}", title)));
        log_db("info", &format!("[{}/{}] Publishing: {}", idx + 1, task.post_count, title));

        // Determine rest_base for the post type
        let rest_base = if task.post_type == "post" {
            "posts".to_string()
        } else if task.post_type == "page" {
            "pages".to_string()
        } else {
            task.post_type.clone()
        };

        let scheduled_at = {
            let offset = chrono::Duration::seconds((idx as i64) * (task.interval_seconds as i64));
            (base_time + offset).format("%Y-%m-%dT%H:%M:%S").to_string()
        };

        let wp_status = task.post_status.to_wp_str();
        let scheduled_opt = if task.post_status == PostStatusWP::Future {
            Some(scheduled_at.as_str())
        } else {
            None
        };

        match wordpress
            .create_post(
                &site.url, &site.username, &site.app_password,
                &rest_base, title, &content, excerpt.as_deref(),
                wp_status, scheduled_opt,
                &task.category_ids, &task.tag_ids,
            )
            .await
        {
            Ok(wp_id) => {
                let conn = db.lock().unwrap();
                let _ = queries::update_post_published(&conn, post_id, wp_id);
                let _ = queries::increment_task_posts(&conn, &task_id);
                log_db("info", &format!("Published post #{} (WP ID: {})", idx + 1, wp_id));
            }
            Err(e) => {
                log_db("error", &format!("Publish failed for post #{}: {}", idx + 1, e));
                let conn = db.lock().unwrap();
                let _ = queries::update_post_failed(&conn, post_id, &e);
            }
        }

        emit_progress("publishing", (idx + 1) as u32, Some(title.clone()), total_cost, Some(format!("Published: {}", title)));

        // ── Step 4: Wait (except after last post) ───────────────────────
        if idx + 1 < post_ids.len() {
            check_cancel!();
            {
                let conn = db.lock().unwrap();
                let _ = queries::update_task_status(&conn, &task_id, &TaskStatus::Running, &TaskStep::Waiting);
            }
            emit_progress("waiting", (idx + 1) as u32, None, total_cost, Some(format!("Waiting {} seconds before next post...", task.interval_seconds)));
            log_db("info", &format!("Waiting {} seconds before next post", task.interval_seconds));
            log::info!("[TASK {}] Waiting {} seconds before post #{}", task_id, task.interval_seconds, idx + 2);

            let wait_secs = task.interval_seconds as u64;
            let mut elapsed = 0u64;
            while elapsed < wait_secs {
                if cancel_token.is_cancelled() {
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                elapsed += 5;
                if pause_flag.load(Ordering::SeqCst) {
                    {
                        let conn = db.lock().unwrap();
                        let _ = queries::update_task_status(&conn, &task_id, &TaskStatus::Paused, &TaskStep::Waiting);
                    }
                    emit_progress("waiting", (idx + 1) as u32, None, total_cost, Some("Paused".to_string()));
                    pause_notify.notified().await;
                    {
                        let conn = db.lock().unwrap();
                        let _ = queries::update_task_status(&conn, &task_id, &TaskStatus::Running, &TaskStep::Waiting);
                    }
                }
            }
        }
    }

    // ── Finalize ──────────────────────────────────────────────────────────
    if cancel_token.is_cancelled() {
        let conn = db.lock().unwrap();
        let _ = queries::update_task_completed(&conn, &task_id, "cancelled", None);
        emit_progress("idle", task.post_count, None, total_cost, Some("Task cancelled".to_string()));
    } else {
        let conn = db.lock().unwrap();
        let _ = queries::update_task_completed(&conn, &task_id, "completed", None);
        emit_progress("idle", task.post_count, None, total_cost, Some("Task completed successfully!".to_string()));
        log_db("info", "Task completed successfully");
    }
}
