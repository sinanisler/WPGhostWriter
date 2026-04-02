use rusqlite::{params, Connection, Result as SqlResult};
use crate::models::{
    post::Post,
    site::Site,
    task::{Task, TaskLog, TaskStatus, TaskStep},
    usage::DailyUsage,
};

// ── Sites ──────────────────────────────────────────────────────────────────

pub fn insert_site(conn: &Connection, site: &Site) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO sites (id, name, url, username, app_password, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, datetime('now'), datetime('now'))",
        params![site.id, site.name, site.url, site.username, site.app_password],
    )?;
    Ok(())
}

pub fn list_sites(conn: &Connection) -> SqlResult<Vec<Site>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, url, username, app_password, is_active FROM sites WHERE is_active = 1 ORDER BY created_at DESC"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Site {
            id: row.get(0)?,
            name: row.get(1)?,
            url: row.get(2)?,
            username: row.get(3)?,
            app_password: row.get(4)?,
            is_active: row.get::<_, i32>(5)? != 0,
        })
    })?;
    rows.collect()
}

pub fn update_site(conn: &Connection, site: &Site) -> SqlResult<()> {
    conn.execute(
        "UPDATE sites SET name=?2, url=?3, username=?4, app_password=?5, updated_at=datetime('now') WHERE id=?1",
        params![site.id, site.name, site.url, site.username, site.app_password],
    )?;
    Ok(())
}

pub fn delete_site(conn: &Connection, id: &str) -> SqlResult<()> {
    conn.execute("UPDATE sites SET is_active=0 WHERE id=?1", params![id])?;
    Ok(())
}

pub fn get_site(conn: &Connection, id: &str) -> SqlResult<Option<Site>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, url, username, app_password, is_active FROM sites WHERE id=?1"
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(Site {
            id: row.get(0)?,
            name: row.get(1)?,
            url: row.get(2)?,
            username: row.get(3)?,
            app_password: row.get(4)?,
            is_active: row.get::<_, i32>(5)? != 0,
        })
    })?;
    Ok(rows.next().transpose()?)
}

// ── Settings ───────────────────────────────────────────────────────────────

pub fn get_all_settings(conn: &Connection) -> SqlResult<std::collections::HashMap<String, String>> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    let mut map = std::collections::HashMap::new();
    for row in rows {
        let (k, v) = row?;
        map.insert(k, v);
    }
    Ok(map)
}

pub fn upsert_setting(conn: &Connection, key: &str, value: &str) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=?2",
        params![key, value],
    )?;
    Ok(())
}

pub fn save_all_settings(conn: &Connection, settings: &std::collections::HashMap<String, String>) -> SqlResult<()> {
    for (k, v) in settings {
        upsert_setting(conn, k, v)?;
    }
    Ok(())
}

pub fn get_setting(conn: &Connection, key: &str) -> SqlResult<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key=?1")?;
    let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;
    Ok(rows.next().transpose()?)
}

// ── Tasks ──────────────────────────────────────────────────────────────────

pub fn insert_task(conn: &Connection, task: &Task) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO tasks (id, site_id, name, prompt, system_prompt, post_type, post_status, post_count,
         interval_minutes, model_override, generate_excerpt, category_ids, tag_ids, status, current_step,
         posts_completed, total_prompt_tokens, total_completion_tokens, total_estimated_cost, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,0,0,0,0.0,datetime('now'),datetime('now'))",
        params![
            task.id, task.site_id, task.name, task.prompt, task.system_prompt,
            task.post_type, task.post_status_str(), task.post_count,
            task.interval_minutes, task.model_override,
            task.generate_excerpt as i32,
            serde_json::to_string(&task.category_ids).unwrap_or_default(),
            serde_json::to_string(&task.tag_ids).unwrap_or_default(),
            task.status.to_str(), task.current_step.to_str(),
        ],
    )?;
    Ok(())
}

pub fn list_tasks(conn: &Connection) -> SqlResult<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, site_id, name, prompt, system_prompt, post_type, post_status, post_count,
         interval_minutes, model_override, generate_excerpt, category_ids, tag_ids, status, current_step,
         posts_completed, total_prompt_tokens, total_completion_tokens, total_estimated_cost,
         started_at, completed_at, error_message
         FROM tasks ORDER BY created_at DESC"
    )?;
    let rows = stmt.query_map([], task_from_row)?;
    rows.collect()
}

pub fn get_task(conn: &Connection, id: &str) -> SqlResult<Option<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, site_id, name, prompt, system_prompt, post_type, post_status, post_count,
         interval_minutes, model_override, generate_excerpt, category_ids, tag_ids, status, current_step,
         posts_completed, total_prompt_tokens, total_completion_tokens, total_estimated_cost,
         started_at, completed_at, error_message
         FROM tasks WHERE id=?1"
    )?;
    let mut rows = stmt.query_map(params![id], task_from_row)?;
    Ok(rows.next().transpose()?)
}

fn task_from_row(row: &rusqlite::Row) -> rusqlite::Result<Task> {
    let category_ids_str: String = row.get::<_, Option<String>>(11)?.unwrap_or_default();
    let tag_ids_str: String = row.get::<_, Option<String>>(12)?.unwrap_or_default();
    Ok(Task {
        id: row.get(0)?,
        site_id: row.get(1)?,
        name: row.get(2)?,
        prompt: row.get(3)?,
        system_prompt: row.get(4)?,
        post_type: row.get(5)?,
        post_status: crate::models::task::PostStatusWP::from_str(&row.get::<_, String>(6).unwrap_or_default()),
        post_count: row.get::<_, i64>(7)? as u32,
        interval_minutes: row.get::<_, i64>(8)? as u32,
        model_override: row.get(9)?,
        generate_excerpt: row.get::<_, i32>(10)? != 0,
        category_ids: serde_json::from_str(&category_ids_str).unwrap_or_default(),
        tag_ids: serde_json::from_str(&tag_ids_str).unwrap_or_default(),
        status: TaskStatus::from_str(&row.get::<_, String>(13).unwrap_or_default()),
        current_step: TaskStep::from_str(&row.get::<_, String>(14).unwrap_or_default()),
        posts_completed: row.get::<_, i64>(15)? as u32,
        total_prompt_tokens: row.get::<_, i64>(16)? as u64,
        total_completion_tokens: row.get::<_, i64>(17)? as u64,
        total_estimated_cost: row.get(18)?,
        started_at: row.get(19)?,
        completed_at: row.get(20)?,
        error_message: row.get(21)?,
    })
}

pub fn update_task_status(conn: &Connection, id: &str, status: &TaskStatus, step: &TaskStep) -> SqlResult<()> {
    conn.execute(
        "UPDATE tasks SET status=?2, current_step=?3, updated_at=datetime('now') WHERE id=?1",
        params![id, status.to_str(), step.to_str()],
    )?;
    Ok(())
}

pub fn update_task_started(conn: &Connection, id: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE tasks SET status='running', started_at=datetime('now'), updated_at=datetime('now') WHERE id=?1",
        params![id],
    )?;
    Ok(())
}

pub fn update_task_completed(conn: &Connection, id: &str, status: &str, error: Option<&str>) -> SqlResult<()> {
    conn.execute(
        "UPDATE tasks SET status=?2, completed_at=datetime('now'), error_message=?3, updated_at=datetime('now') WHERE id=?1",
        params![id, status, error],
    )?;
    Ok(())
}

pub fn increment_task_posts(conn: &Connection, id: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE tasks SET posts_completed=posts_completed+1, updated_at=datetime('now') WHERE id=?1",
        params![id],
    )?;
    Ok(())
}

pub fn add_task_tokens(conn: &Connection, id: &str, prompt: u64, completion: u64, cost: f64) -> SqlResult<()> {
    conn.execute(
        "UPDATE tasks SET total_prompt_tokens=total_prompt_tokens+?2, total_completion_tokens=total_completion_tokens+?3, total_estimated_cost=total_estimated_cost+?4, updated_at=datetime('now') WHERE id=?1",
        params![id, prompt as i64, completion as i64, cost],
    )?;
    Ok(())
}

pub fn update_task(
    conn: &Connection,
    id: &str,
    name: &str,
    prompt: &str,
    system_prompt: Option<&str>,
    post_count: u32,
    interval_minutes: u32,
    model_override: Option<&str>,
    generate_excerpt: bool,
) -> SqlResult<()> {
    conn.execute(
        "UPDATE tasks SET name=?2, prompt=?3, system_prompt=?4, post_count=?5, interval_minutes=?6, model_override=?7, generate_excerpt=?8, updated_at=datetime('now') WHERE id=?1",
        params![id, name, prompt, system_prompt, post_count as i64, interval_minutes as i64, model_override, generate_excerpt as i32],
    )?;
    Ok(())
}

pub fn reset_task_to_pending(conn: &Connection, id: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE tasks SET status='pending', current_step='idle', posts_completed=0, total_prompt_tokens=0, total_completion_tokens=0, total_estimated_cost=0.0, started_at=NULL, completed_at=NULL, error_message=NULL, updated_at=datetime('now') WHERE id=?1",
        params![id],
    )?;
    conn.execute("DELETE FROM task_logs WHERE task_id=?1", params![id])?;
    conn.execute("DELETE FROM posts WHERE task_id=?1", params![id])?;
    Ok(())
}

pub fn delete_task(conn: &Connection, id: &str) -> SqlResult<()> {
    conn.execute("DELETE FROM task_logs WHERE task_id=?1", params![id])?;
    conn.execute("DELETE FROM posts WHERE task_id=?1", params![id])?;
    conn.execute("DELETE FROM tasks WHERE id=?1", params![id])?;
    Ok(())
}

// ── Posts ──────────────────────────────────────────────────────────────────

pub fn insert_post(conn: &Connection, post: &Post) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO posts (id, task_id, sequence_number, title, status, scheduled_at, created_at)
         VALUES (?1,?2,?3,?4,'pending',?5,datetime('now'))",
        params![post.id, post.task_id, post.sequence_number as i64, post.title, post.scheduled_at],
    )?;
    Ok(())
}

pub fn get_posts_for_task(conn: &Connection, task_id: &str) -> SqlResult<Vec<Post>> {
    let mut stmt = conn.prepare(
        "SELECT id, task_id, sequence_number, title, content, excerpt, wp_post_id, status,
         prompt_tokens, completion_tokens, estimated_cost, scheduled_at, published_at, error_message
         FROM posts WHERE task_id=?1 ORDER BY sequence_number"
    )?;
    let rows = stmt.query_map(params![task_id], |row| {
        Ok(Post {
            id: row.get(0)?,
            task_id: row.get(1)?,
            sequence_number: row.get::<_, i64>(2)? as u32,
            title: row.get(3)?,
            content: row.get(4)?,
            excerpt: row.get(5)?,
            wp_post_id: row.get::<_, Option<i64>>(6)?.map(|v| v as u64),
            status: row.get::<_, String>(7)?,
            prompt_tokens: row.get::<_, i64>(8)? as u64,
            completion_tokens: row.get::<_, i64>(9)? as u64,
            estimated_cost: row.get(10)?,
            scheduled_at: row.get(11)?,
            published_at: row.get(12)?,
            error_message: row.get(13)?,
        })
    })?;
    rows.collect()
}

pub fn update_post_title(conn: &Connection, id: &str, title: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE posts SET title=?2, status='title_generated' WHERE id=?1",
        params![id, title],
    )?;
    Ok(())
}

pub fn update_post_content(conn: &Connection, id: &str, content: &str, excerpt: Option<&str>) -> SqlResult<()> {
    conn.execute(
        "UPDATE posts SET content=?2, excerpt=?3, status='content_generated' WHERE id=?1",
        params![id, content, excerpt],
    )?;
    Ok(())
}

pub fn update_post_published(conn: &Connection, id: &str, wp_post_id: u64) -> SqlResult<()> {
    conn.execute(
        "UPDATE posts SET wp_post_id=?2, status='published', published_at=datetime('now') WHERE id=?1",
        params![id, wp_post_id as i64],
    )?;
    Ok(())
}

pub fn update_post_failed(conn: &Connection, id: &str, error: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE posts SET status='failed', error_message=?2 WHERE id=?1",
        params![id, error],
    )?;
    Ok(())
}

pub fn add_post_tokens(conn: &Connection, id: &str, prompt: u64, completion: u64, cost: f64) -> SqlResult<()> {
    conn.execute(
        "UPDATE posts SET prompt_tokens=prompt_tokens+?2, completion_tokens=completion_tokens+?3, estimated_cost=estimated_cost+?4 WHERE id=?1",
        params![id, prompt as i64, completion as i64, cost],
    )?;
    Ok(())
}

// ── Task Logs ──────────────────────────────────────────────────────────────

pub fn insert_log(conn: &Connection, task_id: &str, level: &str, message: &str) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO task_logs (task_id, level, message, created_at) VALUES (?1,?2,?3,datetime('now'))",
        params![task_id, level, message],
    )?;
    Ok(())
}

pub fn get_task_logs(conn: &Connection, task_id: &str, limit: u32) -> SqlResult<Vec<TaskLog>> {
    let mut stmt = conn.prepare(
        "SELECT id, task_id, level, message, created_at FROM task_logs WHERE task_id=?1 ORDER BY id DESC LIMIT ?2"
    )?;
    let rows = stmt.query_map(params![task_id, limit as i64], |row| {
        Ok(TaskLog {
            id: row.get::<_, i64>(0)? as u64,
            task_id: row.get(1)?,
            level: row.get(2)?,
            message: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    let mut logs: Vec<TaskLog> = rows.collect::<SqlResult<_>>()?;
    logs.reverse();
    Ok(logs)
}

// ── Usage ──────────────────────────────────────────────────────────────────

pub fn upsert_daily_usage(conn: &Connection, usage: &DailyUsage) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO usage_daily (date, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost, request_count)
         VALUES (?1,?2,?3,?4,?5,?6,?7)
         ON CONFLICT(date, model) DO UPDATE SET
           prompt_tokens=prompt_tokens+?3,
           completion_tokens=completion_tokens+?4,
           total_tokens=total_tokens+?5,
           estimated_cost=estimated_cost+?6,
           request_count=request_count+?7",
        params![
            usage.date, usage.model,
            usage.prompt_tokens as i64, usage.completion_tokens as i64,
            usage.total_tokens as i64, usage.estimated_cost,
            usage.request_count as i64
        ],
    )?;
    Ok(())
}

pub fn get_daily_usage(conn: &Connection, start: &str, end: &str) -> SqlResult<Vec<DailyUsage>> {
    let mut stmt = conn.prepare(
        "SELECT date, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost, request_count
         FROM usage_daily WHERE date BETWEEN ?1 AND ?2 ORDER BY date DESC, model"
    )?;
    let rows = stmt.query_map(params![start, end], |row| {
        Ok(DailyUsage {
            date: row.get(0)?,
            model: row.get(1)?,
            prompt_tokens: row.get::<_, i64>(2)? as u64,
            completion_tokens: row.get::<_, i64>(3)? as u64,
            total_tokens: row.get::<_, i64>(4)? as u64,
            estimated_cost: row.get(5)?,
            request_count: row.get::<_, i64>(6)? as u64,
        })
    })?;
    rows.collect()
}

pub fn get_task_cost_rows(conn: &Connection) -> SqlResult<Vec<crate::models::usage::TaskCostRow>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.model_override, t.total_prompt_tokens, t.total_completion_tokens,
         t.total_estimated_cost, t.created_at
         FROM tasks t ORDER BY t.created_at DESC"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(crate::models::usage::TaskCostRow {
            task_id: row.get(0)?,
            task_name: row.get(1)?,
            model: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "default".to_string()),
            prompt_tokens: row.get::<_, i64>(3)? as u64,
            completion_tokens: row.get::<_, i64>(4)? as u64,
            estimated_cost: row.get(5)?,
            date: row.get(6)?,
        })
    })?;
    rows.collect()
}
