use crate::SharedFluvio;
use crate::admin::FluvioAdminWrapper;
use crate::consumer::PartitionConsumerWrapper;
use crate::producer::TopicProducerWrapper;

use std::sync::Arc;

use log::debug;

use fluvio::{Fluvio};

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

    // fn rust_addr(&self) -> String {
    //     // since client is in the lock, we need to read in order to access it
    //     self.inner.as_ref().map_or("".to_owned(), move |c| {
    //         run_block_on(async move {
    //             let c1 = c.clone();
    //             let read_client = c1.read().await;
    //             read_client.config.addr().to_owned()
    //         })
    //     })
    // }

    // /// JS method to return host address
    // #[node_bindgen]
    // fn addr(&self) -> String {
    //     self.rust_addr()
    // }

    #[node_bindgen]
    fn admin(&self) -> FluvioAdminWrapper {
        FluvioAdminWrapper::new(self.inner.as_ref().unwrap().clone())
    }

    #[node_bindgen]
    fn partition_consumer(&self, topic: String, partition: i32) -> PartitionConsumerWrapper {
        PartitionConsumerWrapper::new(self.inner.as_ref().unwrap().clone(), topic, partition)
    }

    #[node_bindgen]
    fn topic_producer(&self, topic: String) -> TopicProducerWrapper {
        TopicProducerWrapper::new(self.inner.as_ref().unwrap().clone(), topic)
    }
}
