use crate::db::queries;
use crate::models::usage::{DailyUsage, ModelUsageSummary, TaskCostRow, UsageSummary};
use crate::AppState;
use chrono::Utc;
use tauri::State;

#[tauri::command]
pub async fn get_usage_summary(
    state: State<'_, AppState>,
    range: String,
) -> Result<UsageSummary, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let start = match range.as_str() {
        "7d" => chrono::Utc::now()
            .checked_sub_signed(chrono::Duration::days(7))
            .unwrap()
            .format("%Y-%m-%d")
            .to_string(),
        "30d" => chrono::Utc::now()
            .checked_sub_signed(chrono::Duration::days(30))
            .unwrap()
            .format("%Y-%m-%d")
            .to_string(),
        "90d" => chrono::Utc::now()
            .checked_sub_signed(chrono::Duration::days(90))
            .unwrap()
            .format("%Y-%m-%d")
            .to_string(),
        _ => "2000-01-01".to_string(),
    };

    let daily = queries::get_daily_usage(&conn, &start, &today).map_err(|e| e.to_string())?;

    let total_cost: f64 = daily.iter().map(|d| d.estimated_cost).sum();
    let total_tokens: u64 = daily.iter().map(|d| d.total_tokens).sum();
    let total_requests: u64 = daily.iter().map(|d| d.request_count).sum();

    // Build model breakdown
    let mut model_map: std::collections::HashMap<String, ModelUsageSummary> =
        std::collections::HashMap::new();
    for d in &daily {
        let entry = model_map.entry(d.model.clone()).or_insert(ModelUsageSummary {
            model: d.model.clone(),
            total_tokens: 0,
            estimated_cost: 0.0,
            request_count: 0,
        });
        entry.total_tokens += d.total_tokens;
        entry.estimated_cost += d.estimated_cost;
        entry.request_count += d.request_count;
    }
    let model_breakdown = model_map.into_values().collect();

    Ok(UsageSummary {
        total_cost,
        total_tokens,
        total_requests,
        daily_breakdown: daily,
        model_breakdown,
    })
}

#[tauri::command]
pub async fn get_daily_usage(
    state: State<'_, AppState>,
    start: String,
    end: String,
) -> Result<Vec<DailyUsage>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_daily_usage(&conn, &start, &end).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task_costs(state: State<'_, AppState>) -> Result<Vec<TaskCostRow>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_task_cost_rows(&conn).map_err(|e| e.to_string())
}
