use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Site {
    pub id: String,
    pub name: String,
    pub url: String,
    pub username: String,
    pub app_password: String,
    pub is_active: bool,
}
