use std::time::Duration;

use crate::CLIENT_NOT_FOUND_ERROR_MSG;
use crate::admin::FluvioAdminJS;
use crate::consumer::PartitionConsumerJS;
use crate::producer::TopicProducerJS;
use crate::error::FluvioErrorJS;

use fluvio::TopicProducerConfig;
use fluvio::Compression;
use fluvio::TopicProducerConfigBuilder;
use node_bindgen::core::JSValue;
use tracing::debug;

use fluvio::Fluvio;

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::TryIntoJs;
use node_bindgen::core::NjError;
use node_bindgen::core::val::JsEnv;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;
use node_bindgen::core::val::JsObject;

use crate::optional_property;

impl From<Fluvio> for FluvioJS {
    fn from(inner: Fluvio) -> Self {
        Self { inner: Some(inner) }
    }
}

impl TryIntoJs for FluvioJS {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting FluvioJS to js");
        let new_instance = FluvioJS::new_instance(js_env, vec![])?;
        debug!("instance created");
        if let Some(inner) = self.inner {
            FluvioJS::unwrap_mut(js_env, new_instance)?.set_client(inner);
        }
        Ok(new_instance)
    }
}

pub struct FluvioJS {
    inner: Option<Fluvio>,
}

#[node_bindgen]
impl FluvioJS {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: None }
    }

    pub fn set_client(&mut self, client: Fluvio) {
        self.inner.replace(client);
    }

    #[node_bindgen]
    async fn admin(&mut self) -> Result<FluvioAdminJS, FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            let admin_client = client.admin().await;
            Ok(FluvioAdminJS::from(admin_client))
        } else {
            Err(FluvioErrorJS::new(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))
        }
    }

    #[node_bindgen]
    async fn partition_consumer(
        &mut self,
        topic: String,
        partition: u32,
    ) -> Result<PartitionConsumerJS, FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            #[allow(deprecated)]
            Ok(PartitionConsumerJS::from(
                client.partition_consumer(topic, partition).await?,
            ))
        } else {
            Err(FluvioErrorJS::new(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))
        }
    }

    #[node_bindgen]
    async fn topic_producer(&mut self, topic: String) -> Result<TopicProducerJS, FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            Ok(TopicProducerJS::from(client.topic_producer(topic).await?))
        } else {
            Err(FluvioErrorJS::new(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))
        }
    }

    #[node_bindgen]
    async fn topic_producer_with_config(
        &mut self,
        topic: String,
        config: TopicProducerConfigWrapper,
    ) -> Result<TopicProducerJS, FluvioErrorJS> {
        let config = config.inner;

        if let Some(client) = &mut self.inner {
            Ok(TopicProducerJS::from(
                client.topic_producer_with_config(topic, config).await?,
            ))
        } else {
            Err(FluvioErrorJS::new(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))
        }
    }
}

pub struct TopicProducerConfigWrapper {
    pub inner: TopicProducerConfig,
}

impl JSValue<'_> for TopicProducerConfigWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        debug!("converting topic producer config from JS");
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let mut builder = TopicProducerConfigBuilder::default();

            // Extract compression if provided
            if let Some(compression_str) = optional_property!("compression", String, js_obj) {
                let compression = match compression_str.as_str() {
                    "none" => Compression::None,
                    "gzip" => Compression::Gzip,
                    "snappy" => Compression::Snappy,
                    "lz4" => Compression::Lz4,
                    "zstd" => Compression::Zstd,
                    _ => {
                        return Err(NjError::Other(format!(
                            "Invalid compression type: {}",
                            compression_str
                        )))
                    }
                };
                builder.compression(compression);
            }

            // Extract max_request_size if provided
            if let Some(max_request_size) = optional_property!("maxRequestSize", i64, js_obj) {
                builder.max_request_size(max_request_size as usize);
            }

            // Extract batch_size if provided
            if let Some(batch_size) = optional_property!("batchSize", i64, js_obj) {
                builder.batch_size(batch_size as usize);
            }

            // Extract batch_queue_size if provided
            if let Some(batch_queue_size) = optional_property!("batchQueueSize", i64, js_obj) {
                builder.batch_queue_size(batch_queue_size as usize);
            }

            // Extract linger if provided (in milliseconds)
            if let Some(linger_ms) = optional_property!("lingerMs", i64, js_obj) {
                builder.linger(Duration::from_millis(linger_ms as u64));
            }

            // Build the config
            match builder.build() {
                Ok(config) => Ok(Self { inner: config }),
                Err(err) => Err(NjError::Other(format!(
                    "Failed to build TopicProducerConfig: {}",
                    err
                ))),
            }
        } else {
            Err(NjError::Other("parameter must be a JSON object".to_owned()))
        }
    }
}
