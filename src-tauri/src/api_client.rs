use reqwest::Client;
use serde::de::DeserializeOwned;
use std::collections::HashMap;
use std::time::Duration;

/// HTTP client for communicating with the MDEMG server API.
/// All methods take `base_url` as a parameter for instant instance switching.
pub struct ApiClient {
    client: Client,
}

impl ApiClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .connect_timeout(Duration::from_secs(5))
            .build()
            .expect("failed to create HTTP client");
        Self { client }
    }

    /// GET /healthz — returns true if server responds with 200.
    pub async fn health_check(&self, base_url: &str) -> bool {
        let url = format!("{}/healthz", base_url.trim_end_matches('/'));
        match self.client.get(&url).send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    /// Generic GET request with JSON deserialization.
    pub async fn get<T: DeserializeOwned>(
        &self,
        base_url: &str,
        path: &str,
        params: Option<&[(&str, &str)]>,
    ) -> Result<T, String> {
        let url = format!("{}{}", base_url.trim_end_matches('/'), path);
        let mut req = self.client.get(&url);
        if let Some(p) = params {
            req = req.query(p);
        }
        let resp = req.send().await.map_err(|e| format!("Network error: {}", e))?;
        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("HTTP {}: {}", status, body));
        }
        resp.json::<T>().await.map_err(|e| format!("Decode error: {}", e))
    }

    /// Generic POST request with JSON body and response.
    pub async fn post<T: DeserializeOwned>(
        &self,
        base_url: &str,
        path: &str,
        body: &HashMap<String, serde_json::Value>,
    ) -> Result<T, String> {
        let url = format!("{}{}", base_url.trim_end_matches('/'), path);
        let resp = self
            .client
            .post(&url)
            .json(body)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;
        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("HTTP {}: {}", status, body));
        }
        resp.json::<T>().await.map_err(|e| format!("Decode error: {}", e))
    }
}
