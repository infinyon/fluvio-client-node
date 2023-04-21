use crate::CLIENT_NOT_FOUND_ERROR_MSG;
use crate::error::FluvioErrorJS;

use tracing::debug;

use fluvio::TopicProducer;

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::{NjError, JSValue};
use node_bindgen::core::val::JsEnv;
use node_bindgen::core::TryIntoJs;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;
use node_bindgen::core::buffer::JSArrayBuffer;

impl TryIntoJs for TopicProducerJS {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting FluvioWrapper to js");
        let new_instance = TopicProducerJS::new_instance(js_env, vec![])?;
        debug!("instance created");
        if let Some(inner) = self.inner {
            TopicProducerJS::unwrap_mut(js_env, new_instance)?.set_client(inner);
        }
        Ok(new_instance)
    }
}

pub struct TopicProducerJS {
    inner: Option<TopicProducer>,
}

impl From<TopicProducer> for TopicProducerJS {
    fn from(inner: TopicProducer) -> Self {
        Self { inner: Some(inner) }
    }
}

#[node_bindgen]
impl TopicProducerJS {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: None }
    }

    pub fn set_client(&mut self, client: TopicProducer) {
        self.inner.replace(client);
    }

    #[node_bindgen]
    async fn send_record(&self, value: String, partition: i32) -> Result<(), FluvioErrorJS> {
        debug!("Sending record: {} to partition: {}", value, partition);
        let client = self
            .inner
            .as_ref()
            .ok_or_else(|| FluvioErrorJS::new(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))?;
        client
            .send_all(Some((Vec::new(), value.into_bytes())))
            .await?;
        Ok(())
    }

    #[node_bindgen]
    async fn send(&self, key: ProduceArg, value: ProduceArg) -> Result<(), FluvioErrorJS> {
        let client = self
            .inner
            .as_ref()
            .ok_or_else(|| FluvioErrorJS::new(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))?;

        let key = match &key {
            ProduceArg::String(string) => string.as_bytes(),
            ProduceArg::ArrayBuffer(buffer) => buffer.as_bytes(),
        };

        let value = match &value {
            ProduceArg::String(string) => string.as_bytes(),
            ProduceArg::ArrayBuffer(buffer) => buffer.as_bytes(),
        };

        client.send(key, value).await?;
        Ok(())
    }

    #[node_bindgen]
    async fn send_all(&self, elements: Vec<(ProduceArg, ProduceArg)>) -> Result<(), FluvioErrorJS> {
        let client = self
            .inner
            .as_ref()
            .ok_or_else(|| FluvioErrorJS::new(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))?;

        let records: Vec<_> = elements
            .iter()
            .map(|(key, value)| {
                let key = match &key {
                    ProduceArg::String(string) => string.as_bytes(),
                    ProduceArg::ArrayBuffer(buffer) => buffer.as_bytes(),
                };

                let value = match &value {
                    ProduceArg::String(string) => string.as_bytes(),
                    ProduceArg::ArrayBuffer(buffer) => buffer.as_bytes(),
                };

                (key, value)
            })
            .collect();
        client.send_all(records).await?;
        Ok(())
    }

    #[node_bindgen]
    async fn flush(&self) -> Result<(), FluvioErrorJS> {
        let client = self
            .inner
            .as_ref()
            .ok_or_else(|| FluvioErrorJS::new(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))?;
        client.flush().await?;
        Ok(())
    }
}

/// Callers may give 'string' or 'ArrayBuffer' values to `producer.send`
pub enum ProduceArg {
    String(String),
    ArrayBuffer(JSArrayBuffer),
}

impl JSValue<'_> for ProduceArg {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        // Try to convert value to string
        if let Ok(string) = env.convert_to_rust::<String>(js_value) {
            return Ok(Self::String(string));
        }

        // Try to convert value to ArrayBuffer
        if let Ok(buffer) = env.convert_to_rust::<JSArrayBuffer>(js_value) {
            return Ok(Self::ArrayBuffer(buffer));
        }

        Err(NjError::Other(
            "Producer args must be string or ArrayBuffer".to_string(),
        ))
    }
}
