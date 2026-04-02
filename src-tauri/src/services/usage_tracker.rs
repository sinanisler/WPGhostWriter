use crate::db::{queries, Db};
use crate::models::usage::{DailyUsage, UsageRecord};
use chrono::Utc;

#[allow(dead_code)]
pub struct UsageTracker {
    db: Db,
}

impl UsageTracker {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    pub fn record(
        &self,
        task_id: &str,
        post_id: &str,
        usage: &UsageRecord,
    ) -> Result<(), String> {
        let conn = self.db.lock().map_err(|e| e.to_string())?;

        // Update post-level tokens
        queries::add_post_tokens(&conn, post_id, usage.prompt_tokens, usage.completion_tokens, usage.estimated_cost)
            .map_err(|e| e.to_string())?;

        // Update task-level totals
        queries::add_task_tokens(&conn, task_id, usage.prompt_tokens, usage.completion_tokens, usage.estimated_cost)
            .map_err(|e| e.to_string())?;

        // Upsert daily usage
        let today = Utc::now().format("%Y-%m-%d").to_string();
        let daily = DailyUsage {
            date: today,
            model: usage.model.clone(),
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
            estimated_cost: usage.estimated_cost,
            request_count: 1,
        };
        queries::upsert_daily_usage(&conn, &daily).map_err(|e| e.to_string())?;

        Ok(())
    }
}
