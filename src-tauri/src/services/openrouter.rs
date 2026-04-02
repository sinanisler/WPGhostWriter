use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

const OPENROUTER_BASE: &str = "https://openrouter.ai/api/v1";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPricing {
    pub prompt: String,
    pub completion: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub pricing: Option<ModelPricing>,
    pub context_length: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ModelsResponse {
    data: Vec<ModelInfoRaw>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ModelInfoRaw {
    id: String,
    name: Option<String>,
    pricing: Option<ModelPricing>,
    context_length: Option<u64>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionUsage {
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub content: String,
    pub usage: CompletionUsage,
}

#[derive(Debug, Clone)]
pub struct OpenRouterClient {
    client: Client,
    // model_id -> (prompt_price_per_token, completion_price_per_token)
    pub model_prices: Arc<RwLock<HashMap<String, (f64, f64)>>>,
}

impl OpenRouterClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .use_rustls_tls()
            .build()
            .expect("Failed to create HTTP client");
        Self {
            client,
            model_prices: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn fetch_models(&self, api_key: &str) -> Result<Vec<ModelInfo>, String> {
        let resp = self
            .client
            .get(format!("{}/models", OPENROUTER_BASE))
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("OpenRouter models error {}: {}", status, body));
        }

        let data: ModelsResponse = resp.json().await.map_err(|e| e.to_string())?;

        // Cache prices
        let mut prices = self.model_prices.write().map_err(|e| e.to_string())?;
        for m in &data.data {
            if let Some(ref p) = m.pricing {
                let prompt_price = p.prompt.parse::<f64>().unwrap_or(0.0);
                let completion_price = p.completion.parse::<f64>().unwrap_or(0.0);
                prices.insert(m.id.clone(), (prompt_price, completion_price));
            }
        }

        Ok(data
            .data
            .into_iter()
            .map(|m| ModelInfo {
                id: m.id,
                name: m.name.unwrap_or_default(),
                pricing: m.pricing,
                context_length: m.context_length,
            })
            .collect())
    }

    pub async fn test_api_key(&self, api_key: &str) -> Result<bool, String> {
        let resp = self
            .client
            .get(format!("{}/models", OPENROUTER_BASE))
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        Ok(resp.status().is_success())
    }

    pub async fn complete(
        &self,
        api_key: &str,
        model: &str,
        system_prompt: &str,
        user_message: &str,
        temperature: f64,
        top_p: f64,
        max_tokens: u32,
        frequency_penalty: f64,
        presence_penalty: f64,
    ) -> Result<CompletionResponse, String> {
        let body = serde_json::json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_message }
            ],
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens,
            "frequency_penalty": frequency_penalty,
            "presence_penalty": presence_penalty,
        });

        let resp = self
            .client
            .post(format!("{}/chat/completions", OPENROUTER_BASE))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("HTTP-Referer", "https://wpghostwriter.app")
            .header("X-Title", "WPGhostWriter")
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body_text = resp.text().await.unwrap_or_default();
            return Err(format!("OpenRouter API error {}: {}", status, body_text));
        }

        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| "No content in response".to_string())?
            .to_string();

        let usage = &json["usage"];
        let prompt_tokens = usage["prompt_tokens"].as_u64().unwrap_or(0);
        let completion_tokens = usage["completion_tokens"].as_u64().unwrap_or(0);

        Ok(CompletionResponse {
            content,
            usage: CompletionUsage {
                prompt_tokens,
                completion_tokens,
                total_tokens: prompt_tokens + completion_tokens,
            },
        })
    }

    pub fn calculate_cost(&self, model: &str, prompt_tokens: u64, completion_tokens: u64) -> f64 {
        if let Ok(prices) = self.model_prices.read() {
            if let Some(&(prompt_price, completion_price)) = prices.get(model) {
                return (prompt_tokens as f64 * prompt_price)
                    + (completion_tokens as f64 * completion_price);
            }
        }
        0.0
    }
}
