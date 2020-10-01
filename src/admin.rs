use crate::SharedFluvio;
use crate::{optional_property, must_property};

use std::convert::{TryFrom, TryInto};
use log::debug;

use fluvio::FluvioError;
use fluvio::metadata::spu::{
    CustomSpu, SpuSpec, CustomSpuSpec, IngressPort, IngressAddr, EncryptionEnum, Endpoint,
    CustomSpuKey,
};
use fluvio::metadata::spg::{SpuGroupSpec, SpuConfig, StorageConfig, ReplicationConfig, EnvVar};
use fluvio::metadata::topic::{PartitionMap, PartitionMaps};
use fluvio::metadata::objects::Metadata;
use fluvio::metadata::partition::{PartitionSpec, PartitionStatus, PartitionResolution, ReplicaStatus};
use fluvio::metadata::topic::TopicSpec;
use fluvio::metadata::topic::TopicReplicaParam;
use fluvio::dataplane::ReplicaKey;

use node_bindgen::derive::node_bindgen;
use node_bindgen::core::TryIntoJs;
use node_bindgen::core::NjError;
use node_bindgen::core::val::JsEnv;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;
use node_bindgen::core::JSValue;
use node_bindgen::core::val::JsObject;
use node_bindgen::core::buffer::ArrayBuffer;

pub struct FluvioAdminWrapper(SharedFluvio);

impl FluvioAdminWrapper {
    pub fn new(client: SharedFluvio) -> Self {
        Self(client)
    }
}

impl TryIntoJs for FluvioAdminWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting FluvioWrapper to js");
        let new_instance = FluvioAdminJS::new_instance(js_env, vec![])?;
        debug!("instance created");
        FluvioAdminJS::unwrap_mut(js_env, new_instance)?.set_client(self.0);
        Ok(new_instance)
    }
}

pub struct FluvioAdminJS {
    inner: Option<SharedFluvio>,
}

#[node_bindgen]
impl FluvioAdminJS {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: None }
    }

    pub fn set_client(&mut self, client: SharedFluvio) {
        self.inner.replace(client);
    }

    #[node_bindgen]
    async fn list_topic(&self) -> Result<ArrayBuffer, FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            let topics = client.list::<TopicSpec, _>(vec![]).await?;

            let json_slice = serde_json::to_vec(&topics).map_err(|err| {
                FluvioError::Other(format!("serialization error: {}", err.to_string()))
            })?;
            // // convert to array buffer and wrap in the buffer
            Ok(ArrayBuffer::new(json_slice))
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen]
    async fn find_topic(&self, topic_name: String) -> Result<TopicInfo, FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            let topics = client.list::<TopicSpec, _>(vec![]).await?;

            let topic = topics.iter().find(|topic| topic.name == topic_name);

            let json = serde_json::to_vec(&topic).map_err(|err| {
                FluvioError::Other(format!("serialization error: {}", err.to_string()))
            })?;
            // // convert to array buffer and wrap in the buffer
            Ok(TopicInfo(Some(ArrayBuffer::new(json))))
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    /// create topic
    /// replica configuration can be computed as below or
    ///  {
    ///     partitions: integer,
    ///     replication: integer   
    ///     rack:    bool
    ///   }
    ///
    /// or assigned which is vector
    /// [
    ///     [id, [rep1, rep2, rep3]]   
    /// ]
    ///
    #[node_bindgen]
    async fn create_topic(
        &self,
        topic: String,
        spec: TopicSpecWrapper,
    ) -> Result<String, FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            client.create(topic.clone(), false, spec.0).await?;
            Ok(topic)
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen]
    async fn delete_topic(&self, topic: String) -> Result<String, FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            client.delete::<TopicSpec, String>(topic.clone()).await?;
            Ok(topic)
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen]
    async fn list_spu(&self) -> Result<ArrayBuffer, FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            let spus = client.list::<SpuSpec, _>(vec![]).await?;
            let json_slice = serde_json::to_vec(&spus).map_err(|err| {
                FluvioError::Other(format!("serialization error: {}", err.to_string()))
            })?;
            Ok(ArrayBuffer::new(json_slice))
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen]
    async fn find_partition(&self, topic: String) -> Result<PartitionMetadataWrapper, FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            let partitions = client.list::<PartitionSpec, _>(vec![]).await?;

            if let Some(partition) = partitions.into_iter().find(|partition| {
                let replica: ReplicaKey = partition
                    .name
                    .clone()
                    .try_into()
                    .expect("canot parse partition");

                return replica.topic == topic && replica.partition == 0;
            }) {
                debug!("Found Partition: {:?}", partition);
                Ok(PartitionMetadataWrapper(partition))
            } else {
                Err(FluvioError::Other("failed to find partition".to_owned()))
            }
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen]
    async fn list_partitions(&self) -> Result<ArrayBuffer, FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            let partitions = client.list::<PartitionSpec, _>(vec![]).await?;
            let json_slice = serde_json::to_vec(&partitions).map_err(|err| {
                FluvioError::Other(format!("serialization error: {}", err.to_string()))
            })?;
            Ok(ArrayBuffer::new(json_slice))
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen]
    async fn create_custom_spu(
        &self,
        name: String,
        spec: CustomSpuSpecWrapper,
    ) -> Result<(), FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            client.create(name, false, spec.0).await?;
            Ok(())
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen]
    async fn delete_custom_spu(&self, key: CustomSpuKeyWrapper) -> Result<(), FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            client.delete::<CustomSpuSpec, _>(key.0).await?;
            Ok(())
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen]
    async fn create_managed_spu(
        &self,
        name: String,
        spec: SpuGroupSpecWrapper,
    ) -> Result<(), FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            client.create::<SpuGroupSpec>(name, false, spec.0).await?;
            Ok(())
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
        }
    }

    #[node_bindgen]
    async fn delete_managed_spu(&self, name: String) -> Result<(), FluvioError> {
        if let Some(client) = self.inner.clone() {
            let mut client = client.write().await.admin().await;
            client.delete::<SpuGroupSpec, _>(name).await?;
            Ok(())
        } else {
            Err(FluvioError::Other("failed to lock client".to_owned()))
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

        status.set_property("spu", spu.try_to_js(js_env)?)?;
        status.set_property("hw", hw.try_to_js(js_env)?)?;
        status.set_property("leo", leo.try_to_js(js_env)?)?;

        status.try_to_js(js_env)
    }
}

pub struct PartitionSpecWrapper(PartitionSpec);

pub struct PartitionStatusWrapper(PartitionStatus);

impl TryIntoJs for PartitionStatusWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        let mut status = JsObject::create(js_env)?;

        let resolution = js_env.create_string_utf8(match self.0.resolution {
            PartitionResolution::Offline => "Offline",
            PartitionResolution::Online => "Online",
            PartitionResolution::LeaderOffline => "LeaderOffline",
            PartitionResolution::ElectionLeaderFound => "ElectionLeaderFound",
        })?;

        let leader = ReplicaStatusWrapper(self.0.leader).try_to_js(js_env)?;

        // Convert u32 to string to guard against overflow of u32 max value into i64;
        let lsr = js_env.create_string_utf8(&self.0.lsr.to_string())?;

        let replicas = js_env.create_array_with_len(self.0.replicas.len())?;
        for (index, replica) in self.0.replicas.into_iter().enumerate() {
            let element = ReplicaStatusWrapper(replica).try_to_js(js_env)?;
            js_env.set_element(replicas, element, index)?;
        }

        status.set_property("leader", leader)?;
        status.set_property("resolution", resolution)?;
        status.set_property("lsr", lsr)?;
        status.set_property("replicas", replicas)?;

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

        metadata.set_property("name", name)?;
        metadata.set_property("spec", spec)?;
        metadata.set_property("status", status)?;

        metadata.try_to_js(js_env)
    }
}

impl JSValue for PartitionSpecWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let leader = must_property!("leader", i32, js_obj);
            let replicas = must_property!("replicas", Vec<i32>, js_obj);

            Ok(Self(PartitionSpec { leader, replicas }))
        } else {
            return Err(NjError::Other("must pass json param".to_owned()));
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
        spec.set_property("leader", leader)?;
        spec.set_property("replicas", replicas)?;

        Ok(spec.try_to_js(js_env)?)
    }
}

pub struct TopicSpecWrapper(TopicSpec);

impl JSValue for TopicSpecWrapper {
    fn convert_to_rust(env: &JsEnv, n_value: napi_value) -> Result<Self, NjError> {
        debug!("start conversion of replica param");
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            if let Some(assign_param) = optional_property!("maps", Assigned, js_obj) {
                debug!("detected array, assume assign");
                let partition_list: Vec<PartitionMap> =
                    assign_param.into_iter().map(|p| p.0).collect();

                let topic_spec = TopicSpec::Assigned(PartitionMaps::from(partition_list));

                Ok(Self(topic_spec))
            } else {
                debug!("assume computed, will extract as object");

                // check replication
                let replication_factor = must_property!("replicationFactor", i32, js_obj);
                let partitions = optional_property!("partitions", i32, 1, js_obj);
                let ignore_rack_assignment =
                    optional_property!("ignoreRackAssignment", bool, false, js_obj);

                debug!("Ignore Rack Assignment Value: {:?}", ignore_rack_assignment);

                Ok(Self(TopicSpec::Computed(TopicReplicaParam {
                    replication_factor,
                    partitions,
                    ignore_rack_assignment,
                })))
            }
        } else {
            return Err(NjError::Other("must pass json param".to_owned()));
        }
    }
}

type Assigned = Vec<PartitionWrap>;

struct PartitionWrap(PartitionMap);

impl JSValue for PartitionWrap {
    fn convert_to_rust(env: &JsEnv, n_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            let id = must_property!("id", i32, js_obj);
            let replicas = must_property!("replicas", Vec<i32>, js_obj);

            Ok(Self(PartitionMap { id, replicas }))
        } else {
            return Err(NjError::Other("partition map must be json".to_owned()));
        }
    }
}

pub struct IngressAddrWrapper(Vec<IngressAddr>);

impl JSValue for IngressAddrWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let hostname = optional_property!("hostname", String, js_obj);
            let hostname = Some(hostname.unwrap_or("localhost".to_string()));
            let ip = optional_property!("ip", String, js_obj);

            debug!("Hostname: {:?}", hostname);

            Ok(Self(vec![IngressAddr { hostname, ip }]))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

pub struct EncryptionEnumWrapper(EncryptionEnum);

impl JSValue for EncryptionEnumWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(string) = env.convert_to_rust::<String>(js_value) {
            let encrption = match string.as_ref() {
                "plaintext" => EncryptionEnum::PLAINTEXT,
                "SSL" => EncryptionEnum::SSL,
                _ => EncryptionEnum::PLAINTEXT,
            };

            Ok(Self(encrption))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

pub struct IngressPortWrapper(IngressPort);

impl JSValue for IngressPortWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let port = must_property!("port", u32, js_obj) as u16;
            debug!("Found Port: {:?}", port);
            let ingress = must_property!("ingress", IngressAddrWrapper, js_obj);
            let encryption = must_property!("encryption", EncryptionEnumWrapper, js_obj);

            Ok(Self(IngressPort {
                port,
                ingress: ingress.0,
                encryption: encryption.0,
            }))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

pub struct EndpointWrapper(Endpoint);

impl JSValue for EndpointWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let port = must_property!("port", u32, js_obj) as u16;
            let host = must_property!("host", String, js_obj);
            let encryption = must_property!("encryption", String, js_obj);

            Ok(Self(Endpoint {
                port,
                host,
                encryption: match encryption.as_ref() {
                    "plaintext" => EncryptionEnum::PLAINTEXT,
                    "SSL" => EncryptionEnum::SSL,
                    _ => EncryptionEnum::PLAINTEXT,
                },
            }))
        } else {
            Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

pub struct CustomSpuSpecWrapper(CustomSpuSpec);

impl JSValue for CustomSpuSpecWrapper {
    fn convert_to_rust(env: &JsEnv, n_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            let id = must_property!("id", i32, js_obj);

            let public_endpoint: IngressPortWrapper =
                TryFrom::try_from(must_property!("publicEndpoint", IngressPortWrapper, js_obj))
                    .map_err(|err: std::convert::Infallible| NjError::Other(err.to_string()))?;

            let private_endpoint: EndpointWrapper =
                TryFrom::try_from(must_property!("privateEndpoint", EndpointWrapper, js_obj))
                    .map_err(|err: std::convert::Infallible| NjError::Other(err.to_string()))?;

            let rack = optional_property!("rack", String, js_obj);

            Ok(Self(CustomSpuSpec {
                id,
                private_endpoint: private_endpoint.0,
                public_endpoint: public_endpoint.0,
                rack,
            }))
        } else {
            return Err(NjError::Other("parameter must be json".to_owned()));
        }
    }
}

struct DeleteCustomSpu(CustomSpu);

impl JSValue for DeleteCustomSpu {
    fn convert_to_rust(env: &JsEnv, n_value: napi_value) -> Result<Self, NjError> {
        if let Ok(id) = env.convert_to_rust::<i32>(n_value) {
            Ok(Self(CustomSpu::Id(id)))
        } else if let Ok(name) = env.convert_to_rust::<String>(n_value) {
            Ok(Self(CustomSpu::Name(name)))
        } else {
            return Err(NjError::Other(format!("spu id must be number or string")));
        }
    }
}

pub struct ReplicationConfigWrapper(ReplicationConfig);

impl JSValue for ReplicationConfigWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(value) = env.convert_to_rust::<u32>(js_value) {
            let in_sync_replica_min = Some(value as u16);
            Ok(Self(ReplicationConfig {
                in_sync_replica_min,
            }))
        } else {
            return Err(NjError::Other("parameter must be json".to_owned()));
        }
    }
}

pub struct StorageConfigWrapper(StorageConfig);

impl JSValue for StorageConfigWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let log_dir = optional_property!("logDir", String, js_obj);
            let size = optional_property!("size", String, js_obj);

            Ok(Self(StorageConfig { log_dir, size }))
        } else {
            return Err(NjError::Other("parameter must be json".to_owned()));
        }
    }
}

pub struct EnvVarWrapper(EnvVar);

impl JSValue for EnvVarWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let name = must_property!("name", String, js_obj);
            let value = must_property!("value", String, js_obj);

            Ok(Self(EnvVar { name, value }))
        } else {
            return Err(NjError::Other("parameter must be json".to_owned()));
        }
    }
}

pub struct EnvVarVecWrapper(Vec<EnvVar>);

impl JSValue for EnvVarVecWrapper {
    fn convert_to_rust(env: &JsEnv, js_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(js_value) {
            let envs: Vec<EnvVarWrapper> = js_obj.as_value()?;
            Ok(Self(envs.into_iter().map(|env| env.0).collect()))
        } else {
            return Err(NjError::Other("parameter must be json".to_owned()));
        }
    }
}

pub struct SpuConfigWrapper(SpuConfig);

impl JSValue for SpuConfigWrapper {
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
            return Err(NjError::Other("parameter must be json".to_owned()));
        }
    }
}

#[derive(Debug)]
struct SpuGroupSpecWrapper(SpuGroupSpec);

impl JSValue for SpuGroupSpecWrapper {
    fn convert_to_rust(env: &JsEnv, n_value: napi_value) -> Result<Self, NjError> {
        if let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            let replicas = must_property!("replicas", i32, js_obj) as u16;
            let min_id = must_property!("minId", i32, js_obj);
            let spu_config = must_property!("spuConfig", SpuConfigWrapper, js_obj);

            Ok(Self(SpuGroupSpec {
                replicas,
                min_id,
                spu_config: spu_config.0,
            }))
        } else {
            return Err(NjError::Other("parameter must be json".to_owned()));
        }
    }
}

pub struct CustomSpuKeyWrapper(CustomSpuKey);

impl JSValue for CustomSpuKeyWrapper {
    fn convert_to_rust(env: &JsEnv, n_value: napi_value) -> Result<Self, NjError> {
        if let Ok(value) = env.convert_to_rust::<String>(n_value) {
            let key = match value.parse::<i32>() {
                Ok(id) => CustomSpuKey::Id(id),
                Err(_) => CustomSpuKey::Name(value),
            };
            Ok(Self(key))
        } else {
            return Err(NjError::Other("parameter must be json".to_owned()));
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
