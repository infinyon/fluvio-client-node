use crate::{CLIENT_NOT_FOUND_ERROR_MSG};
use crate::{optional_property, must_property};
use crate::error::FluvioErrorJS;

use std::convert::{TryInto, TryFrom};
use std::fmt::Display;
use log::debug;

use fluvio::{FluvioAdmin, FluvioError};
use fluvio::metadata::objects::ListResponse;
use fluvio::metadata::AdminSpec;
use fluvio::dataplane::record::ReplicaKey;
use fluvio::dataplane::core::{Decoder, Encoder};
use fluvio::metadata::{
    spu::{SpuSpec},
};
use fluvio::metadata::spg::{SpuGroupSpec, SpuConfig, StorageConfig, ReplicationConfig, EnvVar};
use fluvio::metadata::topic::{PartitionMap};
use fluvio::metadata::objects::Metadata;
use fluvio::metadata::partition::{PartitionSpec, PartitionStatus, PartitionResolution, ReplicaStatus};
use fluvio::metadata::topic::TopicSpec;
use fluvio::metadata::objects::{ObjectApiListRequest, ObjectApiListResponse, ListRequest};
use serde::{Serialize};

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::TryIntoJs;
use node_bindgen::core::NjError;
use node_bindgen::core::val::JsEnv;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;
use node_bindgen::core::JSValue;
use node_bindgen::core::val::JsObject;
use node_bindgen::core::buffer::ArrayBuffer;

// JS Object Keys used to convert Rust Struct to JS Object;
const SPU_KEY: &str = "spu";
const HW_KEY: &str = "hw";
const LEO_KEY: &str = "leo";
const NAME_KEY: &str = "name";
const SPEC_KEY: &str = "spec";
const STATUS_KEY: &str = "status";
const LEADER_KEY: &str = "leader";
const RESOLUTION_KEY: &str = "resolution";
const LSR_KEY: &str = "lsr";
const REPLICAS_KEY: &str = "replicas";

impl From<FluvioAdmin> for FluvioAdminJS {
    fn from(inner: FluvioAdmin) -> Self {
        Self { inner: Some(inner) }
    }
}

impl TryIntoJs for FluvioAdminJS {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting FluvioWrapper to js");
        let new_instance = FluvioAdminJS::new_instance(js_env, vec![])?;
        debug!("instance created");
        if let Some(inner) = self.inner {
            FluvioAdminJS::unwrap_mut(js_env, new_instance)?.set_client(inner);
        }
        Ok(new_instance)
    }
}

pub struct FluvioAdminJS {
    inner: Option<FluvioAdmin>,
}

#[node_bindgen]
impl FluvioAdminJS {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: None }
    }

    pub fn set_client(&mut self, client: FluvioAdmin) {
        self.inner.replace(client);
    }

    fn client(&self) -> Result<&FluvioAdmin, FluvioErrorJS> {
        if let Some(client) = &self.inner {
            Ok(client)
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }

    async fn js_list<S>(&mut self) -> Result<ArrayBuffer, FluvioErrorJS>
    where
        S: AdminSpec + Encoder + Decoder + Serialize,

        ObjectApiListRequest: From<ListRequest<S>>,
        ListResponse<S>: TryFrom<ObjectApiListResponse>,
        <ListResponse<S> as TryFrom<ObjectApiListResponse>>::Error: Display,
        S::Status: Serialize + Encoder + Decoder,
    {
        let client = self.client()?;
        let data = client.all::<S>().await?;
        let json_slice = serde_json::to_vec(&data)
            .map_err(|err| FluvioError::Other(format!("serialization error: {}", err)))?;
        // // convert to array buffer and wrap in the buffer
        Ok(ArrayBuffer::new(json_slice))
    }

    #[node_bindgen]
    async fn list_topic(&mut self) -> Result<ArrayBuffer, FluvioErrorJS> {
        self.js_list::<TopicSpec>().await
    }

    #[node_bindgen]
    async fn find_topic(&mut self, topic_name: String) -> Result<TopicInfo, FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            let topics = client.all::<TopicSpec>().await?;

            let topic = topics.iter().find(|topic| topic.name == topic_name);

            let json = serde_json::to_vec(&topic)
                .map_err(|err| FluvioError::Other(format!("serialization error: {}", err)))?;
            // // convert to array buffer and wrap in the buffer
            Ok(TopicInfo(Some(ArrayBuffer::new(json))))
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }

    #[node_bindgen]
    async fn create_topic(
        &mut self,
        topic: String,
        spec: TopicSpecWrapper,
    ) -> Result<String, FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            debug!("Creating Topic with Spec: {:?}", spec.0);
            client.create(topic.clone(), false, spec.0).await?;
            Ok(topic)
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }

    #[node_bindgen]
    async fn delete_topic(&mut self, topic: String) -> Result<String, FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            client.delete::<TopicSpec, String>(topic.clone()).await?;
            Ok(topic)
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }

    #[node_bindgen]
    async fn list_spu(&mut self) -> Result<ArrayBuffer, FluvioErrorJS> {
        self.js_list::<SpuSpec>().await
    }

    #[node_bindgen]
    async fn find_partition(
        &mut self,
        topic: String,
    ) -> Result<PartitionMetadataWrapper, FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            let partitions = client.all::<PartitionSpec>().await?;

            if let Some(partition) = partitions.into_iter().find(|partition| {
                let replica: ReplicaKey = partition
                    .name
                    .clone()
                    .try_into()
                    .expect("cannot parse partition");

                replica.topic == topic && replica.partition == 0
            }) {
                debug!("Found Partition: {:?}", partition);
                Ok(PartitionMetadataWrapper(partition))
            } else {
                Err(FluvioError::Other("failed to find partition".to_owned()).into())
            }
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }

    #[node_bindgen]
    async fn list_partitions(&mut self) -> Result<ArrayBuffer, FluvioErrorJS> {
        self.js_list::<PartitionSpec>().await
    }

    #[node_bindgen]
    async fn create_managed_spu(
        &mut self,
        name: String,
        spec: SpuGroupSpecWrapper,
    ) -> Result<(), FluvioErrorJS> {
        debug!("Creating a new managed spu: {:?}", spec.0);
        if let Some(client) = &mut self.inner {
            client.create::<SpuGroupSpec>(name, false, spec.0).await?;
            Ok(())
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }

    #[node_bindgen]
    async fn delete_managed_spu(&mut self, name: String) -> Result<(), FluvioErrorJS> {
        if let Some(client) = &mut self.inner {
            client.delete::<SpuGroupSpec, _>(name).await?;
            Ok(())
        } else {
            Err(FluvioError::Other(CLIENT_NOT_FOUND_ERROR_MSG.to_owned()).into())
        }
    }
}

pub struct ReplicaStatusWrapper(ReplicaStatus);

impl TryIntoJs for ReplicaStatusWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let mut status = JsObject::create(js_env)?;

        let spu = js_env.create_int32(self.0.spu);
        let hw = js_env.create_int64(self.0.hw);
        let leo = js_env.create_int64(self.0.leo);

        status.set_property(SPU_KEY, spu.try_to_js(js_env)?)?;
        status.set_property(HW_KEY, hw.try_to_js(js_env)?)?;
        status.set_property(LEO_KEY, leo.try_to_js(js_env)?)?;

        status.try_to_js(js_env)
    }
}

pub struct PartitionResolutionWrapper(PartitionResolution);

impl ToString for PartitionResolutionWrapper {
    fn to_string(&self) -> String {
        let status = match self.0 {
            PartitionResolution::Offline => "Offline",
            PartitionResolution::Online => "Online",
            PartitionResolution::LeaderOffline => "LeaderOffline",
            PartitionResolution::ElectionLeaderFound => "ElectionLeaderFound",
        };

        status.to_string()
    }
}

pub struct PartitionSpecWrapper(PartitionSpec);

pub struct PartitionStatusWrapper(PartitionStatus);

impl TryIntoJs for PartitionStatusWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let mut status = JsObject::create(js_env)?;

        // NOTE: PartitionResolution should implement ToString
        let resolution = js_env
            .create_string_utf8(&PartitionResolutionWrapper(self.0.resolution).to_string())?;

        let leader = ReplicaStatusWrapper(self.0.leader).try_to_js(js_env)?;

        // Convert u32 to string to guard against overflow of u32 max value into i64;
        let lsr = js_env.create_string_utf8(&self.0.lsr.to_string())?;

        let replicas = js_env.create_array_with_len(self.0.replicas.len())?;
        for (index, replica) in self.0.replicas.into_iter().enumerate() {
            let element = ReplicaStatusWrapper(replica).try_to_js(js_env)?;
            js_env.set_element(replicas, element, index)?;
        }

        status.set_property(LEADER_KEY, leader)?;
        status.set_property(RESOLUTION_KEY, resolution)?;
        status.set_property(LSR_KEY, lsr)?;
        status.set_property(REPLICAS_KEY, replicas)?;

        status.try_to_js(js_env)
    }
}

pub struct PartitionMetadataWrapper(Metadata<PartitionSpec>);

impl TryIntoJs for PartitionMetadataWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let mut metadata = JsObject::create(js_env)?;

        let name = js_env.create_string_utf8(&self.0.name)?;
        let spec = PartitionSpecWrapper(self.0.spec).try_to_js(js_env)?;
        let status = PartitionStatusWrapper(self.0.status).try_to_js(js_env)?;

        metadata.set_property(NAME_KEY, name)?;
        metadata.set_property(SPEC_KEY, spec)?;
        metadata.set_property(STATUS_KEY, status)?;

        metadata.try_to_js(js_env)
    }
}

impl JSValue<'_> for PartitionSpecWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let leader = must_property!(LEADER_KEY, i32, js_obj);
            let replicas = must_property!(REPLICAS_KEY, Vec<i32>, js_obj);

            Ok(Self(PartitionSpec::new(leader, replicas)))
        } else {
            Err(NjError::Other("must pass json param".to_owned()))
        }
    }
}

impl TryIntoJs for PartitionSpecWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let mut spec = JsObject::create(js_env)?;

        let leader = js_env.create_int32(self.0.leader)?;
        let replicas = js_env.create_array_with_len(self.0.replicas.len())?;
        for (index, replica) in self.0.replicas.into_iter().enumerate() {
            let replica = js_env.create_int32(replica)?;
            // Update the array of aborted transactions;
            js_env.set_element(replicas, replica, index)?;
        }

        // Set spec object values;
        spec.set_property(LEADER_KEY, leader)?;
        spec.set_property(REPLICAS_KEY, replicas)?;

        spec.try_to_js(js_env)
    }
}

pub struct TopicSpecWrapper(TopicSpec);

impl JSValue<'_> for TopicSpecWrapper {
    fn convert_to_rust(env: &JsEnv, n_value: napi_value) -> Result<Self, NjError> {
        debug!("start conversion of replica param");
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            if let Some(assign_param) = optional_property!("maps", Assigned, js_obj) {
                debug!("detected array, assume assign");
                let partition_list: Vec<PartitionMap> =
                    assign_param.into_iter().map(|p| p.0).collect();

                let topic_spec = TopicSpec::new_assigned(partition_list);

                Ok(Self(topic_spec))
            } else {
                debug!("assume computed, will extract as object");

                // check replication
                let replication_factor = optional_property!("replicationFactor", u32, 1, js_obj);
                let partitions = optional_property!("partitions", u32, 1, js_obj);
                let ignore_rack_assignment =
                    optional_property!("ignoreRackAssignment", bool, false, js_obj);

                Ok(Self(TopicSpec::new_computed(
                    partitions,
                    replication_factor,
                    Some(ignore_rack_assignment),
                )))
            }
        } else {
            Err(NjError::Other("must pass json param".to_owned()))
        }
    }
}

type Assigned = Vec<PartitionWrap>;

struct PartitionWrap(PartitionMap);

impl JSValue<'_> for PartitionWrap {
    fn convert_to_rust(env: &JsEnv, n_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            let id = must_property!("id", u32, js_obj);
            let replicas = must_property!("replicas", Vec<i32>, js_obj);

            Ok(Self(PartitionMap { id, replicas }))
        } else {
            Err(NjError::Other("partition map must be json".to_owned()))
        }
    }
}

pub struct ReplicationConfigWrapper(ReplicationConfig);

impl JSValue<'_> for ReplicationConfigWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(value) = env.convert_to_rust::<u32>(js_value) {
            let in_sync_replica_min = Some(value as u16);
            Ok(Self(ReplicationConfig {
                in_sync_replica_min,
            }))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

pub struct StorageConfigWrapper(StorageConfig);

impl JSValue<'_> for StorageConfigWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let log_dir = optional_property!("logDir", String, js_obj);
            let size = optional_property!("size", String, js_obj);

            Ok(Self(StorageConfig { log_dir, size }))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

pub struct EnvVarWrapper(EnvVar);

impl JSValue<'_> for EnvVarWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let name = must_property!("name", String, js_obj);
            let value = must_property!("value", String, js_obj);

            Ok(Self(EnvVar { name, value }))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

pub struct EnvVarVecWrapper(Vec<EnvVar>);

impl JSValue<'_> for EnvVarVecWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let envs: Vec<EnvVarWrapper> = js_obj.as_value()?;
            Ok(Self(envs.into_iter().map(|env| env.0).collect()))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

pub struct SpuConfigWrapper(SpuConfig);

impl JSValue<'_> for SpuConfigWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let replication = optional_property!("replication", ReplicationConfigWrapper, js_obj)
                .map(|config| config.0);
            let rack = optional_property!("rack", String, js_obj);
            let storage =
                optional_property!("storage", StorageConfigWrapper, js_obj).map(|config| config.0);
            let env = must_property!("env", EnvVarVecWrapper, js_obj);

            Ok(Self(SpuConfig {
                replication,
                rack,
                storage,
                env: env.0,
            }))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

#[derive(Debug)]
struct SpuGroupSpecWrapper(SpuGroupSpec);

impl JSValue<'_> for SpuGroupSpecWrapper {
    fn convert_to_rust(env: &JsEnv, n_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            let replicas = must_property!("replicas", u32, js_obj) as u16;
            let min_id = must_property!("minId", i32, js_obj);
            let spu_config = must_property!("spuConfig", SpuConfigWrapper, js_obj);

            Ok(Self(SpuGroupSpec {
                replicas,
                min_id,
                spu_config: spu_config.0,
            }))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

struct TopicInfo(Option<ArrayBuffer>);

impl TryIntoJs for TopicInfo {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        if let Some(buffer) = self.0 {
            buffer.try_to_js(js_env)
        } else {
            ().try_to_js(js_env)
        }
    }
}
