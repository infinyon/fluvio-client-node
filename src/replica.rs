// JS Wrapper for SpuLeader

use std::sync::Arc;

use log::debug;
use futures::stream::StreamExt;

use flv_client::SpuReplicaLeader;
use flv_client::ReplicaLeader;
use flv_future_aio::sync::RwLock;
use flv_future_aio::task::spawn;
use flv_client::ClientError;
use flv_client::FetchLogOption;
use flv_client::FetchOffset;
use kf_protocol::api::Isolation;

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::NjError;
use node_bindgen::core::val::JsEnv;
use node_bindgen::core::TryIntoJs;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;
use node_bindgen::core::val::JsObject;
use node_bindgen::core::JSValue;
use node_bindgen::core::buffer::ArrayBuffer;

type SharedReplicaLeader = Arc<RwLock<SpuReplicaLeader>>;
pub struct ReplicaLeaderWrapper(SpuReplicaLeader);

impl From<SpuReplicaLeader> for ReplicaLeaderWrapper {
    fn from(leader: SpuReplicaLeader) -> Self {
        Self(leader)
    }
}

impl TryIntoJs for ReplicaLeaderWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let new_instance = JsReplicaLeader::new_instance(js_env, vec![])?;
        JsReplicaLeader::unwrap_mut(js_env, new_instance)?.set_leader(self.0);
        Ok(new_instance)
    }
}


#[derive(Debug)]
struct JsFetchOffset(FetchOffset);


impl JSValue for JsFetchOffset {

    fn convert_to_rust(env: &JsEnv,n_value: napi_value) -> Result<Self,NjError> {

        if let Ok(fetch_offset) = env.convert_to_rust::<i64>(n_value) {
            Ok(JsFetchOffset(FetchOffset::Offset(fetch_offset)))
        } else if let Ok(fetch_str) = env.convert_to_rust::<String>(n_value) {

            match fetch_str.as_str() {
                "earliest" => Ok(JsFetchOffset(FetchOffset::Earliest(None))),
                "latest" => Ok(JsFetchOffset(FetchOffset::Latest(None))),
                _ => Err(NjError::Other(format!(
                    "invalid fetch offset: {}, valid values are: earliest/latest",
                    fetch_str
                )))
            }
        } else if let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {

            let mut offset: i64 = 0;

            if let Some(offset_prop) = js_obj.get_property("offset")? {
                match offset_prop.as_value::<i64>() {
                    Ok(v) => offset = v,
                    Err(_) => return Err(NjError::Other("offset must be number".to_owned()))
                }
            }

            if let Some(fetch_property) = js_obj.get_property("start")? {
                match fetch_property.as_value::<String>() {
                    Ok(fetch_str) => {
                        match fetch_str.as_str() {
                            "earliest" => Ok(JsFetchOffset(FetchOffset::Earliest(Some(offset)))),
                            "latest" => Ok(JsFetchOffset(FetchOffset::Latest(Some(offset)))),
                            _ => Err(NjError::Other(format!(
                                "invalid fetch offset: {}, valid values are: earliest/latest",
                                fetch_str
                            )))
                        }
                    },
                    Err(_) => return Err(NjError::Other("start must be string".to_owned()))
                }
            } else {
                Ok(JsFetchOffset(FetchOffset::Offset(offset)))   
            }

        } else {
            return Err(NjError::Other("invalid fetch type".to_owned()))
        }
    }
}


#[derive(Default)]
struct JsFetchLogOption {
    fetch: FetchLogOption,
}

impl JSValue for JsFetchLogOption {

    fn convert_to_rust(env: &JsEnv,n_value: napi_value) -> Result<Self,NjError> {

        if  let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            let mut option = JsFetchLogOption::default();
            if let Some(bytes) =  js_obj.get_property("maxBytes")? {
                option.fetch.max_bytes = bytes.as_value::<i32>()?;
            }
            if let Some(isolation_prop) = js_obj.get_property("isolation")? {

                let isolation = isolation_prop.as_value::<String>()?;
                match isolation.as_ref() {
                    "ReadUncommitted" => option.fetch.isolation = Isolation::ReadUncommitted,
                    "ReadCommitted" => option.fetch.isolation = Isolation::ReadCommitted,
                    _ =>  return Err(NjError::Other(format!("invalid isolation param: {}",isolation)))
                }
            }

            
            Ok(option)
        } else {
            return Err(NjError::Other("must pass json param".to_owned()))
        }
    }
}


/// record that are passed back to Node.js stream
#[derive(Debug)]
struct JsRecord {
    record: ArrayBuffer,
    offset: i64
} 


impl TryIntoJs for JsRecord {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let mut json = JsObject::create(js_env)?;
        json.set_property("offset",js_env.create_int64(self.offset)?)?;
        json.set_property("record",self.record.try_to_js(js_env)?)?;
        json.try_to_js(js_env)
    }
}

struct JsBatch {
    base_offset: i64,
    records: Vec<ArrayBuffer>
}

impl TryIntoJs for JsBatch {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let mut json = JsObject::create(js_env)?;
        json.set_property("base_offset",js_env.create_int64(self.base_offset)?)?;
        json.set_property("records",self.records.try_to_js(js_env)?)?;
        json.try_to_js(js_env)
    }
}



pub struct JsReplicaLeader {
    inner: Option<SharedReplicaLeader>
}

#[node_bindgen]
impl JsReplicaLeader {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: None
        }
    }

    pub fn set_leader(&mut self, leader: SpuReplicaLeader) {
        self.inner.replace(Arc::new(RwLock::new(leader)));
    }

    /// send string to replica
    /// produce (message)
    #[node_bindgen]
    async fn produce(&self, message: String) -> Result<i64, ClientError> {
        let leader = self.inner.as_ref().unwrap().clone();

        let mut producer = leader.write().await;
        let bytes = message.into_bytes();
        let len = bytes.len();
        producer.send_record(bytes).await.map(|_| len as i64)
    }

    /// consume message as stream of records (cb,offset,config)
    /// offset can be 
    ///     string:      'earliest','latest'
    ///     number:      absolute offset  (ex.  50)
    ///     json:          {
    ////                         "offset:": 20          // absolute or relative
    ///                          "start": "earliest"    // earliest or latest
    ///                    }
    /// config is optional param to effect offset, this is json with following structure
    /// {
    ///    maxBytes: integer,
    ///    isolation: ReadUncommitted/ReadCommitted
    ///    metadata: bool
    /// }
    ///     
    /// example:
    ///     leader.consume(emitter.emit.bind(emitter),"earliest");
    ///     leader.consume(emitter.emit.bind(emitter),"latest");
    ///     leader.consume(emitter.emit.bind(emitter),2);
    ///     leader.consume(emitter.emit.bind(emitter),{
    ///           metadata: true,
    ///           isolation: 'readCommitted',
    ///           maxBytes: 320000000
    ///      });
    ///
    #[node_bindgen(mt)]
    fn consume<F: Fn(String, JsRecord) + 'static + Send + Sync>(
        &self,
        cb: F,
        offset: JsFetchOffset,
        fetch_option: Option<JsFetchLogOption>
    ) -> Result<(), NjError> {
        debug!("consume, checking to see offset is");
        
        let leader = self.inner.as_ref().unwrap().clone();
        debug!("starting inner consume");
        spawn(consume_inner(leader, offset.0, fetch_option.unwrap_or(JsFetchLogOption::default()), cb));

        Ok(())
    }


    #[node_bindgen]
    /// get batch of records
    async fn fetch_batches(
        &self,
        offset: JsFetchOffset, 
        fetch_option: Option<JsFetchLogOption>
    ) -> Result<Vec<JsBatch>,ClientError> {

        let leader = self.inner.as_ref().unwrap().clone();
        let mut leader_w = leader.write().await;

        debug!("getting fetch batch offset: {:#?}",offset);

        let mut log_stream = leader_w.fetch_logs(offset.0, fetch_option.unwrap_or(JsFetchLogOption::default()).fetch);

        if let Some(partition_response) = log_stream.next().await {
            let records = partition_response.records;

            debug!("received records: {:#?}", records);

            let batches: Vec<JsBatch> = 
                records.batches.into_iter()
                    .map(| batch | 
                        JsBatch {
                            base_offset: batch.base_offset,
                            records: batch.records.into_iter().map(|r| {
                                if let Some(bytes) = r.value().inner_value() {
                                    ArrayBuffer::new(bytes)
                                } else {
                                    ArrayBuffer::new(vec![])
                                }
                            }).collect()
                        }
                    )
                    .collect();
            Ok(batches)
        } else {
            Err(ClientError::Other("fetch failed".to_owned()))
        }

    }


}

// perform async fetching of stream and send back to JS callback
async fn consume_inner<F: Fn(String, JsRecord)>(
    leader: SharedReplicaLeader,
    offset: FetchOffset,
    option: JsFetchLogOption,
    cb: F,
) -> Result<(), NjError> {
    let event = "data".to_owned();

    let mut leader_w = leader.write().await;

    debug!("getting fetch log stream");

    let mut log_stream = leader_w.fetch_logs(offset, option.fetch);

    debug!("find log stream");

    while let Some(partition_response) = log_stream.next().await {
        let records = partition_response.records;

        debug!("received records: {:#?}", records);

        for batch in records.batches {
           let mut offset = batch.base_offset;
           debug!("header: {:#?}",batch.header);
            for record in batch.records {
                if let Some(bytes) = record.value().inner_value() {
                  
                    cb(event.clone(), JsRecord {
                        record: ArrayBuffer::new(bytes),
                        offset
                    });
                    offset = offset + 1;
                }
            }
        }
    }

    Ok(())
}




