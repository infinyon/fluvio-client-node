use crate::{SharedFluvio, CLIENT_NOT_FOUND_ERROR_MSG};
use crate::admin::FluvioAdminWrapper;
use crate::consumer::PartitionConsumerWrapper;
use crate::producer::TopicProducerWrapper;

use std::sync::Arc;

use log::debug;

use fluvio::{Fluvio, FluvioError};

use flv_future_aio::sync::RwLock;

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::TryIntoJs;
use node_bindgen::core::NjError;
use node_bindgen::core::val::JsEnv;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;

// simple wrapper to facilitate conversion to JS Class
pub struct FluvioWrapper(Fluvio);

impl From<Fluvio> for FluvioWrapper {
    fn from(client: Fluvio) -> Self {
        Self(client)
    }
}

impl TryIntoJs for FluvioWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting FluvioWrapper to js");
        let new_instance = FluvioJS::new_instance(js_env, vec![])?;
        debug!("instance created");
        FluvioJS::unwrap_mut(js_env, new_instance)?.set_client(self.0);
        Ok(new_instance)
    }
}

pub struct FluvioJS {
    inner: Option<SharedFluvio>,
}

#[node_bindgen]
impl FluvioJS {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: None }
    }

    pub fn set_client(&mut self, client: Fluvio) {
        self.inner.replace(Arc::new(RwLock::new(client)));
    }

    #[node_bindgen]
    async fn admin(&self) -> Result<FluvioAdminWrapper, FluvioError> {
        if let Some(client) = self.inner.as_ref() {
            let admin_client = client.clone().write().await.admin().await;
            Ok(FluvioAdminWrapper::new(Arc::new(RwLock::new(admin_client))))
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))
        }
    }

    #[node_bindgen]
    async fn partition_consumer(
        &self,
        topic: String,
        partition: i32,
    ) -> Result<PartitionConsumerWrapper, FluvioError> {
        if let Some(client) = self.inner.as_ref() {
            Ok(PartitionConsumerWrapper::new(
                client
                    .clone()
                    .write()
                    .await
                    .partition_consumer(topic, partition)
                    .await?,
            ))
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))
        }
    }

    #[node_bindgen]
    async fn topic_producer(&self, topic: String) -> Result<TopicProducerWrapper, FluvioError> {
        if let Some(client) = self.inner.as_ref() {
            Ok(TopicProducerWrapper::new(
                client.clone().write().await.topic_producer(topic).await?,
            ))
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()))
        }
    }
}
