use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageRecord {
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
    pub estimated_cost: f64,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyUsage {
    pub date: String,
    pub model: String,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
    pub estimated_cost: f64,
    pub request_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageSummary {
    pub total_cost: f64,
    pub total_tokens: u64,
    pub total_requests: u64,
    pub daily_breakdown: Vec<DailyUsage>,
    pub model_breakdown: Vec<ModelUsageSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelUsageSummary {
    pub model: String,
    pub total_tokens: u64,
    pub estimated_cost: f64,
    pub request_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskCostRow {
    pub task_id: String,
    pub task_name: String,
    pub model: String,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub estimated_cost: f64,
    pub date: String,
}
