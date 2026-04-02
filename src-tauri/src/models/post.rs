use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Post {
    pub id: String,
    pub task_id: String,
    pub sequence_number: u32,
    pub title: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<String>,
    pub wp_post_id: Option<u64>,
    pub status: String,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub estimated_cost: f64,
    pub scheduled_at: Option<String>,
    pub published_at: Option<String>,
    pub error_message: Option<String>,
}
