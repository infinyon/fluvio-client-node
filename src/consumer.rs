use crate::SharedFluvio;
use crate::{optional_property, must_property};

use log::debug;
use flv_future_aio::task::spawn;
use fluvio::PartitionConsumer;
use fluvio::{Offset, FluvioError};
use fluvio::dataplane::fetch::FetchablePartitionResponse;
use fluvio::dataplane::record::RecordSet;

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::NjError;
use node_bindgen::core::JSValue;
use node_bindgen::core::val::JsEnv;
use node_bindgen::core::TryIntoJs;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;
use node_bindgen::core::val::JsObject;
use node_bindgen::core::buffer::ArrayBuffer;

pub struct PartitionConsumerWrapper {
    client: SharedFluvio,
    topic: String,
    partition: i32,
}

impl PartitionConsumerWrapper {
    pub fn new(client: SharedFluvio, topic: String, partition: i32) -> Self {
        Self {
            client,
            topic,
            partition,
        }
    }
}

impl TryIntoJs for PartitionConsumerWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting FluvioWrapper to js");
        let new_instance = PartitionConsumerJS::new_instance(js_env, vec![])?;
        debug!("instance created");
        PartitionConsumerJS::unwrap_mut(js_env, new_instance)?.set_client(self.client);
        PartitionConsumerJS::unwrap_mut(js_env, new_instance)?.set_topic(self.topic);
        PartitionConsumerJS::unwrap_mut(js_env, new_instance)?.set_partition(self.partition);
        Ok(new_instance)
    }
}

pub struct PartitionConsumerJS {
    inner: Option<SharedFluvio>,
    topic: Option<String>,
    partition: Option<i32>,
}

#[node_bindgen]
impl PartitionConsumerJS {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: None,
            topic: None,
            partition: None,
        }
    }

    pub fn set_client(&mut self, client: SharedFluvio) {
        self.inner.replace(client);
    }

    pub fn set_topic(&mut self, topic: String) {
        self.topic.replace(topic);
    }

    pub fn set_partition(&mut self, partition: i32) {
        self.partition.replace(partition);
    }

    #[node_bindgen]
    async fn fetch(
        &self,
        offset: OffsetWrapper,
    ) -> Result<FetchablePartitionResponseWrapper, FluvioError> {
        let topic = self.topic.clone().unwrap_or_default();
        let partition = self.partition.unwrap_or_default();

        if let Some(client) = self.inner.clone() {
            let client: PartitionConsumer = client
                .write()
                .await
                .partition_consumer(topic, partition)
                .await?;

            let response = client.fetch(offset.0).await?;
            Ok(FetchablePartitionResponseWrapper(response))
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen(mt)]
    async fn stream<F: Fn(String, RecordSetWrapper) + 'static + Send + Sync>(
        &self,
        offset: OffsetWrapper,
        cb: F,
    ) -> Result<(), FluvioError> {
        let topic = self.topic.clone().unwrap_or_default();
        let partition = self.partition.unwrap_or_default();

        if let Some(client) = self.inner.clone() {
            let client: PartitionConsumer = client
                .write()
                .await
                .partition_consumer(topic, partition)
                .await?;

            let handle = spawn(PartitionConsumerJS::stream_inner(client, offset, cb)).await;

            if let Err(e) = handle {
                debug!("Error found for inner stream: {:?}", e);
            }

            Ok(())
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    async fn stream_inner<F: Fn(String, RecordSetWrapper)>(
        client: PartitionConsumer,
        offset: OffsetWrapper,
        cb: F,
    ) -> Result<(), FluvioError> {
        let mut stream = client.stream(offset.0).await?;
        let emitter_event_name = "data".to_owned();
        debug!("Waiting for stream");
        while let Ok(event) = stream.next().await {
            cb(
                emitter_event_name.clone(),
                RecordSetWrapper(event.partition.records),
            )
        }

        Ok(())
    }
}

pub struct OffsetWrapper(Offset);

impl JSValue for OffsetWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        debug!("convert fetch offset param");
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let offset_from = optional_property!("from", String, js_obj);
            let offset_index = must_property!("index", i64, js_obj) as u32;

            let offset = match offset_from {
                Some(from) => match from.as_ref() {
                    "beginning" => Offset::from_beginning(offset_index),
                    "end" => Offset::from_end(offset_index),
                    _ => {
                        return Err(NjError::Other(
                            "unknown offset type. Must be either `earlier` or `latest`.".to_owned(),
                        ))
                    }
                },
                None => Offset::from_end(offset_index),
            };

            Ok(Self(offset))
        } else {
            return Err(NjError::Other("must pass json param".to_owned()));
        }
    }
}

pub struct FetchablePartitionResponseWrapper(FetchablePartitionResponse<RecordSet>);

impl TryIntoJs for FetchablePartitionResponseWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        // Create JS Variables
        let partition_index = js_env.create_int32(self.0.partition_index)?;
        let error_code = js_env.create_int32(self.0.error_code as i32)?;
        let high_watermark = js_env.create_int64(self.0.high_watermark)?;
        let last_stable_offset = js_env.create_int64(self.0.last_stable_offset)?;
        let log_start_offset = js_env.create_int64(self.0.log_start_offset)?;

        let mut response = JsObject::create(js_env)?;

        // Set response object values;
        response.set_property("partitionIndex", partition_index)?;
        response.set_property("errorCode", error_code)?;
        response.set_property("highWatermark", high_watermark)?;
        response.set_property("lastStableOffset", last_stable_offset)?;
        response.set_property("logStartOffset", log_start_offset)?;

        if let Some(transactions) = self.0.aborted {
            let aborted = js_env.create_array_with_len(transactions.len())?;
            for (index, transaction) in transactions.into_iter().enumerate() {
                let mut tx = JsObject::create(js_env)?;
                let producer_id = js_env.create_int64(transaction.producer_id)?;
                let first_offset = js_env.create_int64(transaction.first_offset)?;
                tx.set_property("producerId", producer_id)?;
                tx.set_property("firstOffset", first_offset)?;
                let element = tx.try_to_js(js_env)?;

                // Update the array of aborted transactions;
                js_env.set_element(aborted, element, index)?;
            }

            // set the aborted transactions;
            response.set_property("aborted", aborted)?;
        }

        let record_set = RecordSetWrapper(self.0.records).try_to_js(js_env)?;

        response.set_property("records", record_set)?;

        response.try_to_js(js_env)
    }
}

#[derive(Debug)]
pub struct RecordSetWrapper(RecordSet);

impl TryIntoJs for RecordSetWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("Converting record to JS: {:#?}", self.0);
        let mut record_set = JsObject::create(js_env)?;

        let batches = js_env.create_array_with_len(self.0.batches.len())?;

        for (index, batch) in self.0.batches.into_iter().enumerate() {
            let mut new_batch = JsObject::create(js_env)?;

            let base_offset = js_env.create_int64(batch.base_offset)?;
            let batch_len = js_env.create_int32(batch.batch_len)?;

            let mut batch_header = JsObject::create(js_env)?;

            let partition_leader_epoch =
                js_env.create_int32(batch.header.partition_leader_epoch)?;
            let magic = js_env.create_int32(batch.header.magic as i32)?;
            let crc = js_env.create_int32(batch.header.crc as i32)?;
            let attributes = js_env.create_int32(batch.header.attributes as i32)?;
            let last_offset_delta = js_env.create_int32(batch.header.last_offset_delta)?;
            let first_timestamp = js_env.create_int64(batch.header.first_timestamp)?;
            let max_time_stamp = js_env.create_int64(batch.header.max_time_stamp)?;
            let producer_id = js_env.create_int64(batch.header.producer_id)?;
            let producer_epoch = js_env.create_int32(batch.header.producer_epoch as i32)?;
            let first_sequence = js_env.create_int32(batch.header.first_sequence)?;

            batch_header.set_property("partitionLeaderEpoch", partition_leader_epoch)?;
            batch_header.set_property("magic", magic)?;
            batch_header.set_property("crc", crc)?;
            batch_header.set_property("attributes", attributes)?;
            batch_header.set_property("lastOffsetDelta", last_offset_delta)?;
            batch_header.set_property("firstTimestamp", first_timestamp)?;
            batch_header.set_property("maxTimeStamp", max_time_stamp)?;
            batch_header.set_property("producerId", producer_id)?;
            batch_header.set_property("producerEpoch", producer_epoch)?;
            batch_header.set_property("firstSequence", first_sequence)?;

            // Update the new batch with the JS values
            new_batch.set_property("baseOffset", base_offset)?;
            new_batch.set_property("batchLength", batch_len)?;
            new_batch.set_property("header", batch_header.try_to_js(js_env)?)?;

            let records = js_env.create_array_with_len(batch.records.len())?;
            for (index, record) in batch.records.into_iter().enumerate() {
                // debug!("Converting Record to JS value, {:#?}", record);

                debug!("Record Value: {:#?}", record.get_value());
                let mut new_record = JsObject::create(js_env)?;

                let headers = js_env.create_int64(record.headers)?;
                let key = ArrayBuffer::new(Vec::new()).try_to_js(js_env)?;

                let value = record
                    .value()
                    .inner_value()
                    .and_then(|value| {
                        if let Ok(v) = std::str::from_utf8(&value) {
                            Some(v.to_owned())
                        } else {
                            None
                        }
                    })
                    .unwrap_or_default();

                new_record.set_property("headers", headers)?;
                new_record.set_property("key", key)?;
                new_record.set_property("value", value.try_to_js(js_env)?)?;

                js_env.set_element(records, new_record.try_to_js(js_env)?, index)?;
            }

            new_batch.set_property("records", records)?;

            js_env.set_element(batches, new_batch.try_to_js(js_env)?, index)?;
        }

        record_set.set_property("batches", batches)?;

        record_set.try_to_js(js_env)
    }
}
