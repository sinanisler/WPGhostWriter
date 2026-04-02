use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TaskStatus {
    Pending,
    Running,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

impl TaskStatus {
    pub fn to_str(&self) -> &'static str {
        match self {
            TaskStatus::Pending => "pending",
            TaskStatus::Running => "running",
            TaskStatus::Paused => "paused",
            TaskStatus::Completed => "completed",
            TaskStatus::Failed => "failed",
            TaskStatus::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "running" => TaskStatus::Running,
            "paused" => TaskStatus::Paused,
            "completed" => TaskStatus::Completed,
            "failed" => TaskStatus::Failed,
            "cancelled" => TaskStatus::Cancelled,
            _ => TaskStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TaskStep {
    Idle,
    GeneratingTitles,
    GeneratingContent,
    Publishing,
    Waiting,
}

impl TaskStep {
    pub fn to_str(&self) -> &'static str {
        match self {
            TaskStep::Idle => "idle",
            TaskStep::GeneratingTitles => "generating_titles",
            TaskStep::GeneratingContent => "generating_content",
            TaskStep::Publishing => "publishing",
            TaskStep::Waiting => "waiting",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "generating_titles" => TaskStep::GeneratingTitles,
            "generating_content" => TaskStep::GeneratingContent,
            "publishing" => TaskStep::Publishing,
            "waiting" => TaskStep::Waiting,
            _ => TaskStep::Idle,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PostStatusWP {
    Draft,
    Publish,
    Future,
    Private,
}

impl PostStatusWP {
    pub fn from_str(s: &str) -> Self {
        match s {
            "publish" => PostStatusWP::Publish,
            "future" => PostStatusWP::Future,
            "private" => PostStatusWP::Private,
            _ => PostStatusWP::Draft,
        }
    }

    pub fn to_wp_str(&self) -> &'static str {
        match self {
            PostStatusWP::Draft => "draft",
            PostStatusWP::Publish => "publish",
            PostStatusWP::Future => "future",
            PostStatusWP::Private => "private",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub site_id: String,
    pub name: String,
    pub prompt: String,
    pub system_prompt: Option<String>,
    pub post_type: String,
    pub post_status: PostStatusWP,
    pub post_count: u32,
    pub interval_minutes: u32,
    pub model_override: Option<String>,
    pub generate_excerpt: bool,
    pub category_ids: Vec<u64>,
    pub tag_ids: Vec<u64>,
    pub status: TaskStatus,
    pub current_step: TaskStep,
    pub posts_completed: u32,
    pub total_prompt_tokens: u64,
    pub total_completion_tokens: u64,
    pub total_estimated_cost: f64,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub error_message: Option<String>,
}

impl Task {
    pub fn post_status_str(&self) -> &str {
        self.post_status.to_wp_str()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskInput {
    pub site_id: String,
    pub name: String,
    pub prompt: String,
    pub system_prompt: Option<String>,
    pub post_type: String,
    pub post_status: String,
    pub post_count: u32,
    pub interval_minutes: u32,
    pub model_override: Option<String>,
    pub generate_excerpt: bool,
    pub category_ids: Vec<u64>,
    pub tag_ids: Vec<u64>,
    pub first_publish_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskInput {
    pub name: String,
    pub prompt: String,
    pub system_prompt: Option<String>,
    pub post_count: u32,
    pub interval_minutes: u32,
    pub model_override: Option<String>,
    pub generate_excerpt: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskWithPosts {
    pub task: Task,
    pub posts: Vec<super::post::Post>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskLog {
    pub id: u64,
    pub task_id: String,
    pub level: String,
    pub message: String,
    pub created_at: String,
}
