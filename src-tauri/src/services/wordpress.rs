use base64::Engine;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WPTerm {
    pub id: u64,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostType {
    pub slug: String,
    pub name: String,
    pub rest_base: String,
}

#[derive(Clone)]
pub struct WordPressClient {
    client: Client,
}

impl WordPressClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .use_rustls_tls()
            .build()
            .expect("Failed to create HTTP client");
        Self { client }
    }

    fn auth_header(username: &str, app_password: &str) -> String {
        let credentials = format!("{}:{}", username, app_password);
        let encoded = base64::engine::general_purpose::STANDARD.encode(credentials.as_bytes());
        format!("Basic {}", encoded)
    }

    fn api_url(site_url: &str, path: &str) -> String {
        let base = site_url.trim_end_matches('/');
        format!("{}/wp-json/wp/v2{}", base, path)
    }

    pub async fn test_connection(
        &self,
        url: &str,
        username: &str,
        app_password: &str,
    ) -> Result<bool, String> {
        let resp = self
            .client
            .get(Self::api_url(url, "/users/me"))
            .header("Authorization", Self::auth_header(username, app_password))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        Ok(resp.status().is_success())
    }

    pub async fn get_post_types(
        &self,
        url: &str,
        username: &str,
        app_password: &str,
    ) -> Result<Vec<PostType>, String> {
        let resp = self
            .client
            .get(Self::api_url(url, "/types"))
            .header("Authorization", Self::auth_header(username, app_password))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            return Err(format!("WP API error: {}", resp.status()));
        }

        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let mut types = Vec::new();
        if let Some(obj) = json.as_object() {
            for (slug, info) in obj {
                let name = info["name"].as_str().unwrap_or(slug).to_string();
                let rest_base = info["rest_base"].as_str().unwrap_or(slug).to_string();
                types.push(PostType {
                    slug: slug.clone(),
                    name,
                    rest_base,
                });
            }
        }
        Ok(types)
    }

    pub async fn get_terms(
        &self,
        url: &str,
        username: &str,
        app_password: &str,
        taxonomy: &str,
    ) -> Result<Vec<WPTerm>, String> {
        let mut all_terms = Vec::new();
        let mut page = 1u32;
        loop {
            let endpoint = format!("/{}?per_page=100&page={}", taxonomy, page);
            let resp = self
                .client
                .get(Self::api_url(url, &endpoint))
                .header("Authorization", Self::auth_header(username, app_password))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !resp.status().is_success() {
                break;
            }

            let terms: Vec<serde_json::Value> = resp.json().await.map_err(|e| e.to_string())?;
            if terms.is_empty() {
                break;
            }
            for t in &terms {
                all_terms.push(WPTerm {
                    id: t["id"].as_u64().unwrap_or(0),
                    name: t["name"].as_str().unwrap_or("").to_string(),
                    slug: t["slug"].as_str().unwrap_or("").to_string(),
                });
            }
            if terms.len() < 100 {
                break;
            }
            page += 1;
        }
        Ok(all_terms)
    }

    pub async fn create_post(
        &self,
        url: &str,
        username: &str,
        app_password: &str,
        rest_base: &str,
        title: &str,
        content: &str,
        excerpt: Option<&str>,
        status: &str,
        scheduled_at: Option<&str>,
        category_ids: &[u64],
        tag_ids: &[u64],
    ) -> Result<u64, String> {
        let mut payload = serde_json::json!({
            "title": title,
            "content": content,
            "status": status,
        });

        if let Some(exc) = excerpt {
            payload["excerpt"] = serde_json::json!(exc);
        }
        if !category_ids.is_empty() {
            payload["categories"] = serde_json::json!(category_ids);
        }
        if !tag_ids.is_empty() {
            payload["tags"] = serde_json::json!(tag_ids);
        }
        if status == "future" {
            if let Some(date) = scheduled_at {
                payload["date"] = serde_json::json!(date);
            }
        }

        let endpoint = format!("/{}", rest_base);
        let resp = self
            .client
            .post(Self::api_url(url, &endpoint))
            .header("Authorization", Self::auth_header(username, app_password))
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let status_code = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("WP create post error {}: {}", status_code, body));
        }

        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        json["id"]
            .as_u64()
            .ok_or_else(|| "No post ID in response".to_string())
    }
}
