use crate::{SharedFluvio, DEFAULT_TOPIC};

use log::debug;
use fluvio::TopicProducer;
use fluvio::FluvioError;

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::NjError;
use node_bindgen::core::val::JsEnv;
use node_bindgen::core::TryIntoJs;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;

pub struct TopicProducerWrapper {
    client: SharedFluvio,
    topic: String,
}

impl TopicProducerWrapper {
    pub fn new(client: SharedFluvio, topic: String) -> Self {
        Self { client, topic }
    }
}

impl TryIntoJs for TopicProducerWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting FluvioWrapper to js");
        let new_instance = TopicProducerJS::new_instance(js_env, vec![])?;
        debug!("instance created");
        TopicProducerJS::unwrap_mut(js_env, new_instance)?.set_client(self.client);
        TopicProducerJS::unwrap_mut(js_env, new_instance)?.set_topic(self.topic);
        Ok(new_instance)
    }
}

pub struct TopicProducerJS {
    inner: Option<SharedFluvio>,
    topic: Option<String>,
}

#[node_bindgen]
impl TopicProducerJS {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: None,
            topic: None,
        }
    }

    pub fn set_client(&mut self, client: SharedFluvio) {
        self.inner.replace(client);
    }

    pub fn set_topic(&mut self, topic: String) {
        self.topic.replace(topic);
    }

    #[node_bindgen]
    async fn send_record(&self, data: String, partition: i32) -> Result<(), FluvioError> {
        let topic = self
            .topic
            .clone()
            .unwrap_or_else(|| String::from(DEFAULT_TOPIC));

        if let Some(client) = self.inner.clone() {
            let client: TopicProducer = client.write().await.topic_producer(topic).await?;

            client.send_record(data.into_bytes(), partition).await?;
            Ok(())
        } else {
            Err(FluvioError::Other(
                "fluvio client not found; ensure fluvio client is instantiated correctly."
                    .to_owned(),
            ))
        }
    }
}
