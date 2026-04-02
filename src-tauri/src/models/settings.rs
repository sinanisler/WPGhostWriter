use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub openrouter_api_key: Option<String>,
    pub default_model: Option<String>,
    pub default_temperature: f64,
    pub default_max_tokens: u32,
    pub default_top_p: f64,
    pub default_frequency_penalty: f64,
    pub default_presence_penalty: f64,
    pub default_system_prompt: Option<String>,
}

pub const BUILT_IN_DEFAULT_SYSTEM_PROMPT: &str =
    "You are an expert content writer and SEO specialist. Write well-structured, \
     engaging articles using clean HTML formatting. Use <h2> and <h3> tags for \
     section headings, <p> tags for paragraphs, and <ul>/<ol> for lists where \
     appropriate. Do not include the article title as an <h1> — WordPress adds \
     it automatically. Write naturally and avoid AI-sounding phrases.";
