mod config;

use crate::{OFFSET_BEGINNING, OFFSET_END, CLIENT_NOT_FOUND_ERROR_MSG};
use crate::{optional_property, must_property};
use crate::error::FluvioErrorJS;

use std::fmt;
use std::pin::Pin;
use std::sync::Arc;
use log::{debug, error};
use fluvio::{PartitionConsumer, ConsumerConfig};
use fluvio::{Offset, FluvioError};
use fluvio::dataplane::record::RecordSet;
use fluvio::consumer::Record;
use fluvio_future::task::spawn;
use fluvio_future::io::{Stream, StreamExt};
use fluvio_spu_schema::fetch::{FetchablePartitionResponse, AbortedTransaction};

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::NjError;
use node_bindgen::core::JSValue;
use node_bindgen::core::val::JsEnv;
use node_bindgen::core::TryIntoJs;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;
use node_bindgen::core::val::JsObject;
use node_bindgen::core::buffer::ArrayBuffer;

const PRODUCER_ID_KEY: &str = "producerId";

const RECORDS_KEY: &str = "records";

const PARTITION_LEADER_EPOCH_KEY: &str = "partitionLeaderEpoch";
const MAGIC_KEY: &str = "magic";
const CRC_KEY: &str = "crc";
const ATTRIBUTES_KEY: &str = "attributes";
const LAST_OFFSET_DELTA_KEY: &str = "lastOffsetDelta";
const FIRST_TIMESTAMP_KEY: &str = "firstTimestamp";
const MAX_TIMESTAMP_KEY: &str = "maxTimeStamp";
const PRODUCER_EPOCH_KEY: &str = "producerEpoch";
const FIRST_SEQUENCE_KEY: &str = "firstSequence";

const BATCH_OFFSET_KEY: &str = "baseOffset";
const BATCH_LENGTH_KEY: &str = "batchLength";
const HEADER_KEY: &str = "header";

const FIRST_OFFSET_KEY: &str = "firstOffset";

const HEADERS_KEY: &str = "headers";
const KEY_KEY: &str = "key";
const VALUE_KEY: &str = "value";

const BATCHES_KEY: &str = "batches";

impl TryIntoJs for PartitionConsumerJS {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting PartitionConsumerJS to js");
        let new_instance = PartitionConsumerJS::new_instance(js_env, vec![])?;
        debug!("instance created");
        if let Some(inner) = self.inner {
            PartitionConsumerJS::unwrap_mut(js_env, new_instance)?.set_client(inner);
        }
        Ok(new_instance)
    }
}

pub struct PartitionConsumerJS {
    inner: Option<Arc<PartitionConsumer>>,
}

impl From<PartitionConsumer> for PartitionConsumerJS {
    fn from(inner: PartitionConsumer) -> Self {
        Self {
            inner: Some(Arc::new(inner)),
        }
    }
}

#[node_bindgen]
impl PartitionConsumerJS {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: None }
    }

    pub fn set_client(&mut self, client: Arc<PartitionConsumer>) {
        self.inner.replace(client);
    }

    #[node_bindgen(mt)]
    async fn stream<F: Fn(RecordJS) + 'static + Send + Sync>(
        &self,
        offset: OffsetWrapper,
        cb: F,
    ) -> Result<(), FluvioErrorJS> {
        let client = self
            .inner
            .as_ref()
            .ok_or_else(|| FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_string()))?;
        spawn(Self::stream_inner(client.clone(), offset, cb));
        Ok(())
    }

    async fn stream_inner<F: Fn(RecordJS)>(
        client: Arc<PartitionConsumer>,
        offset: OffsetWrapper,
        cb: F,
    ) -> Result<(), FluvioErrorJS> {
        let mut stream = client.stream(offset.0).await?;

        debug!("Waiting for stream");
        while let Some(next) = stream.next().await {
            match next {
                Ok(record) => cb(RecordJS::from(record)),
                Err(e) => error!("Error consuming record: {:?}", e),
            }
        }
        debug!("Stream ended!");

        Ok(())
    }

    #[node_bindgen]
    async fn create_stream(
        &self,
        offset: OffsetWrapper,
    ) -> Result<PartitionConsumerIterator, FluvioErrorJS> {
        let client = self
            .inner
            .as_ref()
            .ok_or_else(|| FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_string()))?;

        let stream = client.stream(offset.0).await?;
        let mut iterator = PartitionConsumerIterator::new();
        iterator.set_inner(Box::pin(stream));
        Ok(iterator)
    }

    #[node_bindgen]
    async fn stream_with_config(
        &self,
        offset: OffsetWrapper,
        config: config::ConfigWrapper,
    ) -> Result<PartitionConsumerIterator, FluvioErrorJS> {
        let config: ConsumerConfig = config.inner;
        let client = self
            .inner
            .as_ref()
            .ok_or_else(|| FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_string()))?;
        let stream = client.stream_with_config(offset.0, config).await?;
        let mut iterator = PartitionConsumerIterator::new();

        iterator.set_inner(Box::pin(stream));

        Ok(iterator)
    }
}

#[derive(Clone)]
pub struct RecordJS {
    inner: Option<Arc<Record>>,
}

#[node_bindgen]
impl RecordJS {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: None }
    }

    fn set_inner(&mut self, inner: Arc<Record>) {
        self.inner = Some(inner);
    }

    #[node_bindgen]
    pub fn key(&self) -> Option<ArrayBuffer> {
        let key = self.inner.as_ref()?.key()?;
        Some(ArrayBuffer::new(key.to_owned()))
    }

    #[node_bindgen]
    pub fn has_key(&self) -> bool {
        self.inner.as_ref().unwrap().key().is_some()
    }

    #[node_bindgen]
    pub fn value(&self) -> ArrayBuffer {
        ArrayBuffer::new(self.inner.as_ref().unwrap().value().to_owned())
    }

    #[node_bindgen]
    pub fn key_string(&self) -> Option<String> {
        let key = self.inner.as_ref()?.key()?;
        Some(String::from_utf8_lossy(key).to_string())
    }

    #[node_bindgen]
    pub fn value_string(&self) -> String {
        let value = self.inner.as_ref().unwrap().value();
        String::from_utf8_lossy(value).to_string()
    }
}

impl TryIntoJs for RecordJS {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let new_instance = RecordJS::new_instance(js_env, vec![])?;

        if let Some(inner) = self.inner {
            RecordJS::unwrap_mut(js_env, new_instance)?.set_inner(inner);
        }
        Ok(new_instance)
    }
}

impl From<Record> for RecordJS {
    fn from(record: Record) -> Self {
        Self {
            inner: Some(Arc::new(record)),
        }
    }
}

impl fmt::Debug for RecordJS {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let key = self
            .inner
            .as_ref()
            .unwrap()
            .key()
            .is_some()
            .then_some("Some(<Key>)");

        f.debug_struct("RecordJS")
            .field("key", &key)
            .field("value", &"<Value>")
            .finish()
    }
}

use fluvio::dataplane::link::ErrorCode;
type PartitionConsumerIteratorInner = Pin<Box<dyn Stream<Item = Result<Record, ErrorCode>> + Send>>;

pub struct PartitionConsumerIterator {
    inner: Option<PartitionConsumerIteratorInner>,
}

#[node_bindgen]
impl PartitionConsumerIterator {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: None }
    }
    pub fn set_inner(&mut self, client: PartitionConsumerIteratorInner) {
        self.inner.replace(client);
    }

    #[node_bindgen]
    async fn next(&mut self) -> Result<IterItem, FluvioErrorJS> {
        if let Some(ref mut inner) = self.inner {
            let next: Option<Result<Record, _>> = inner.next().await;
            let next: Option<Record> = next.transpose()?;
            let next: IterItem = IterItem::from(next);
            Ok(next)
        } else {
            Ok(None.into())
        }
    }
}

impl TryIntoJs for PartitionConsumerIterator {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting PartitionConsumerJS to js");
        let new_instance = PartitionConsumerIterator::new_instance(js_env, vec![])?;
        debug!("instance created");
        if let Some(inner) = self.inner {
            PartitionConsumerIterator::unwrap_mut(js_env, new_instance)?.set_inner(inner);
        }
        Ok(new_instance)
    }
}

impl From<Option<Record>> for IterItem {
    fn from(maybe_record: Option<Record>) -> Self {
        let value = maybe_record.map(RecordJS::from);
        let done = value.is_none();
        Self { value, done }
    }
}

struct IterItem {
    pub value: Option<RecordJS>,
    pub done: bool,
}

#[node_bindgen]
impl IterItem {
    #[node_bindgen(constructor)]
    fn new() -> Self {
        Self {
            value: None,
            done: true,
        }
    }
    fn set_inner(&mut self, (value, done): (Option<RecordJS>, bool)) {
        self.value = value;
        self.done = done;
    }

    #[node_bindgen(getter)]
    fn value(&self) -> Option<RecordJS> {
        self.value.clone()
    }

    #[node_bindgen(getter)]
    fn done(&self) -> bool {
        self.done
    }
}

impl TryIntoJs for IterItem {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting NextIter to js");
        let new_instance = IterItem::new_instance(js_env, vec![])?;
        debug!("instance created");
        IterItem::unwrap_mut(js_env, new_instance)?.set_inner((self.value, self.done));
        Ok(new_instance)
    }
}

pub struct OffsetWrapper(Offset);

impl JSValue<'_> for OffsetWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        debug!("convert fetch offset param");
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let offset_from = optional_property!("from", String, js_obj);
            let offset_index = must_property!("index", i64, js_obj) as u32;

            let offset = match offset_from {
                Some(from) => match from.as_ref() {
                    OFFSET_BEGINNING => Offset::from_beginning(offset_index),
                    OFFSET_END => Offset::from_end(offset_index),
                    _ => {
                        return Err(NjError::Other(format!(
                            "unknown offset type. Must be either {:?} or {:?}.",
                            OFFSET_BEGINNING, OFFSET_END
                        )))
                    }
                },
                None => Offset::from_end(offset_index),
            };

            Ok(Self(offset))
        } else {
            Err(NjError::Other("must pass json param".to_owned()))
        }
    }
}

pub struct FetchablePartitionResponseWrapper(Option<FetchablePartitionResponse<RecordSet>>);

#[node_bindgen]
impl<'a> FetchablePartitionResponseWrapper {
    #[node_bindgen(constructor)]
    fn new() -> Self {
        Self(None)
    }
    fn set_inner(&mut self, inner: Option<FetchablePartitionResponse<RecordSet>>) {
        self.0 = inner;
    }

    #[node_bindgen(getter)]
    fn partition_index(&self) -> Option<u32> {
        Some(self.0.as_ref()?.partition_index)
    }

    #[node_bindgen(getter)]
    fn high_watermark(&self) -> Option<i64> {
        Some(self.0.as_ref()?.high_watermark)
    }

    #[node_bindgen(getter)]
    fn last_stable_offset(&self) -> Option<i64> {
        Some(self.0.as_ref()?.high_watermark)
    }

    #[node_bindgen(getter)]
    fn log_start_offset(&self) -> Option<i64> {
        Some(self.0.as_ref()?.log_start_offset)
    }
    #[node_bindgen(getter)]
    fn aborted(&'a self) -> Vec<AbortedTransactionWrapper> {
        let mut aborted_transactions: Vec<AbortedTransactionWrapper> = Vec::new();

        let inner = if let Some(inner) = self.0.as_ref() {
            inner
        } else {
            return Vec::new();
        };

        if let Some(ref transactions) = inner.aborted {
            for i in transactions {
                aborted_transactions.push(AbortedTransactionWrapper(i));
            }
        }
        aborted_transactions
    }

    #[node_bindgen(getter)]
    fn records(&'a self) -> Option<RecordSetWrapper> {
        Some(RecordSetWrapper(&self.0.as_ref()?.records))
    }

    #[node_bindgen]
    fn to_records(&'a self) -> Vec<String> {
        let mut records = Vec::new();
        let inner = if let Some(inner) = self.0.as_ref() {
            inner
        } else {
            return Vec::new();
        };
        for batch in &inner.records.batches {
            for record in batch.records() {
                let value = record.value().as_ref();
                if let Ok(value) = String::from_utf8(value.to_vec()) {
                    records.push(value);
                }
            }
        }
        records
    }
}
pub struct AbortedTransactionWrapper<'a>(&'a AbortedTransaction);
impl TryIntoJs for AbortedTransactionWrapper<'_> {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let mut tx = JsObject::create(js_env)?;
        let producer_id = js_env.create_int64(self.0.producer_id)?;
        let first_offset = js_env.create_int64(self.0.first_offset)?;
        tx.set_property(PRODUCER_ID_KEY, producer_id)?;
        tx.set_property(FIRST_OFFSET_KEY, first_offset)?;
        tx.try_to_js(js_env)
    }
}

impl TryIntoJs for FetchablePartitionResponseWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting FluvioWrapper to js");
        let new_instance = FetchablePartitionResponseWrapper::new_instance(js_env, vec![])?;
        FetchablePartitionResponseWrapper::unwrap_mut(js_env, new_instance)?.set_inner(self.0);
        debug!("instance created");
        Ok(new_instance)
    }
}

#[derive(Debug)]
pub struct RecordSetWrapper<'a>(&'a RecordSet);

impl TryIntoJs for RecordSetWrapper<'_> {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("Converting record to JS: {:#?}", self.0);
        let mut record_set = JsObject::create(js_env)?;

        let batches = js_env.create_array_with_len(self.0.batches.len())?;

        for (index, batch) in self.0.batches.iter().enumerate() {
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

            batch_header.set_property(PARTITION_LEADER_EPOCH_KEY, partition_leader_epoch)?;
            batch_header.set_property(MAGIC_KEY, magic)?;
            batch_header.set_property(CRC_KEY, crc)?;
            batch_header.set_property(ATTRIBUTES_KEY, attributes)?;
            batch_header.set_property(LAST_OFFSET_DELTA_KEY, last_offset_delta)?;
            batch_header.set_property(FIRST_TIMESTAMP_KEY, first_timestamp)?;
            batch_header.set_property(MAX_TIMESTAMP_KEY, max_time_stamp)?;
            batch_header.set_property(PRODUCER_ID_KEY, producer_id)?;
            batch_header.set_property(PRODUCER_EPOCH_KEY, producer_epoch)?;
            batch_header.set_property(FIRST_SEQUENCE_KEY, first_sequence)?;

            // Update the new batch with the JS values
            new_batch.set_property(BATCH_OFFSET_KEY, base_offset)?;
            new_batch.set_property(BATCH_LENGTH_KEY, batch_len)?;
            new_batch.set_property(HEADER_KEY, batch_header.try_to_js(js_env)?)?;

            let records = js_env.create_array_with_len(batch.records().len())?;
            for (index, record) in batch.records().iter().enumerate() {
                // debug!("Converting Record to JS value, {:#?}", record);

                debug!("Record Value: {:#?}", record.value());
                let mut new_record = JsObject::create(js_env)?;

                let headers = js_env.create_int64(record.headers)?;
                let key = ArrayBuffer::new(Vec::new()).try_to_js(js_env)?;

                let value = record.value().as_ref();
                let value = if let Ok(v) = std::str::from_utf8(value) {
                    Some(v.to_owned())
                } else {
                    None
                };

                new_record.set_property(HEADERS_KEY, headers)?;
                new_record.set_property(KEY_KEY, key)?;
                new_record.set_property(VALUE_KEY, value.try_to_js(js_env)?)?;

                js_env.set_element(records, new_record.try_to_js(js_env)?, index)?;
            }

            new_batch.set_property(RECORDS_KEY, records)?;

            js_env.set_element(batches, new_batch.try_to_js(js_env)?, index)?;
        }

        record_set.set_property(BATCHES_KEY, batches)?;

        record_set.try_to_js(js_env)
    }
}
