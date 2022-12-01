use crate::CLIENT_NOT_FOUND_ERROR_MSG;
use crate::admin::FluvioAdminJS;
use crate::consumer::PartitionConsumerJS;
use crate::producer::TopicProducerJS;
use crate::error::FluvioErrorJS;

use log::debug;

use fluvio::{Fluvio, FluvioError};

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::TryIntoJs;
use node_bindgen::core::NjError;
use node_bindgen::core::val::JsEnv;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;

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
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }

    #[node_bindgen]
    async fn partition_consumer(
        &mut self,
        topic: String,
        partition: u32,
    ) -> Result<PartitionConsumerJS, FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            Ok(PartitionConsumerJS::from(
                client.partition_consumer(topic, partition).await?,
            ))
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }

    #[node_bindgen]
    async fn topic_producer(&mut self, topic: String) -> Result<TopicProducerJS, FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            Ok(TopicProducerJS::from(client.topic_producer(topic).await?))
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }
}
