
use std::convert::TryFrom;
use std::io::Error as IoError;

use log::debug;

use flv_types::socket_helpers::ServerAddress;
use flv_client::ClientError;
use flv_client::SpuController;
use flv_api_sc::spu::FlvCustomSpu;
use node_bindgen::derive::node_bindgen;
use node_bindgen::core::TryIntoJs;
use node_bindgen::core::NjError;
use node_bindgen::core::val::JsEnv;
use node_bindgen::sys::napi_value;
use node_bindgen::core::JSClass;
use node_bindgen::core::JSValue;
use node_bindgen::core::val::JsObject;
use node_bindgen::core::buffer::ArrayBuffer;

use crate::SharedScClient;

pub struct AdminScClientWrapper(SharedScClient);

impl AdminScClientWrapper {
    pub fn new(client: SharedScClient) -> Self {
        Self(client)
    }
}


impl TryIntoJs for AdminScClientWrapper {
    fn try_to_js(self, js_env: &JsEnv) -> Result<napi_value, NjError> {
        debug!("converting ScClientWrapper to js");
        let new_instance = AdminScClient::new_instance(js_env, vec![])?;
        debug!("instance created");
        AdminScClient::unwrap_mut(js_env, new_instance)?.set_client(self.0);
        Ok(new_instance)
    }
}


pub struct AdminScClient {
    inner: Option<SharedScClient>,
}

#[node_bindgen]
impl AdminScClient {
    #[node_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: None }
    }


    pub fn set_client(&mut self, client: SharedScClient) {
        self.inner.replace(client);
    }

    
    #[node_bindgen]
    async fn list_topic(&self) -> Result<ArrayBuffer,ClientError> {

        debug!("list topics");

        let client = self.inner.as_ref().unwrap().clone();
        let mut client_w = client.write().await;

        let list_topics = client_w.topic_metadata(None).await?;

        let json_slice = serde_json::to_vec(&list_topics)
        .map_err(|err| ClientError::Other(format!("serialization error: {}",err.to_string())))?;

        // convert to array buffer and wrap in the buffer
        Ok(ArrayBuffer::new(json_slice))

    }

    #[node_bindgen]
    async fn find_topic(&self,topic_name: String) -> Result<TopicInfo,ClientError> {

        debug!("trying find topic: {}",topic_name);

        let client = self.inner.as_ref().unwrap().clone();
        let mut client_w = client.write().await;

        let list_topics = client_w.topic_metadata(None).await?;

        debug!("topics: {:#?}",list_topics);
        if let Some(topic) = list_topics.iter().find( |topic| topic.name == topic_name) {
            debug!("found topic {}",topic_name);
            let json = serde_json::to_vec(topic)
                .map_err(|err| ClientError::Other(format!("serialization error: {}",err.to_string())))?;
                
            Ok(TopicInfo(Some(ArrayBuffer::new(json))))
        } else {
            debug!("no topic found");
            Ok(TopicInfo(None))
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
    async fn create_topic(&self,topic: String, replica: ReplicaParam) -> Result<String,ClientError>  {

        let client = self.inner.as_ref().unwrap().clone();
        let mut client_w = client.write().await;

        client_w.create_topic(topic,replica.0,false).await

    }

    #[node_bindgen]
    async fn delete_topic(&self,topic: String) -> Result<String,ClientError> {

        let client = self.inner.as_ref().unwrap().clone();
        let mut client_w = client.write().await;

        client_w.delete_topic(&topic).await
    }


    #[node_bindgen]
    async fn list_spu(&self) -> Result<ArrayBuffer,ClientError> {

        debug!("list spu");

        let client = self.inner.as_ref().unwrap().clone();
        let mut client_w = client.write().await;

        let spus = client_w.list_spu(false).await?;

        let json_slice = serde_json::to_vec(&spus)
        .map_err(|err| ClientError::Other(format!("serialization error: {}",err.to_string())))?;
       
        Ok(ArrayBuffer::new(json_slice))
    }



    #[node_bindgen]
    async fn create_custom_spu(&self,param: CustomSpuParam) -> Result<(),ClientError>  {

        let client = self.inner.as_ref().unwrap().clone();
        let mut client_w = client.write().await;

        debug!("creating custom spu: {:#?}",param);
        client_w.create_custom_spu(param.id,param.name,param.public,param.private,param.rack).await

    }

    #[node_bindgen]
    async fn delete_custom_spu(&self,spu_param: DeleteCustomSpu) -> Result<(),ClientError> {

        let client = self.inner.as_ref().unwrap().clone();
        let mut client_w = client.write().await;

        client_w.delete_custom_spu(spu_param.0).await
    }


    #[node_bindgen]
    async fn create_managed_spu(&self,param: ManagedGroup) -> Result<(),ClientError> {

        let client = self.inner.as_ref().unwrap().clone();
        let mut client_w = client.write().await;

        debug!("creating managed spu: {:#?}",param);

        client_w.create_group(param.0).await
    }

    #[node_bindgen]
    async fn delete_managed_spu(&self,name: String) -> Result<(),ClientError>  {

        let client = self.inner.as_ref().unwrap().clone();
        let mut client_w = client.write().await;

        debug!("deleting managed spu: {:#?}",name);

        client_w.delete_group(&name).await

    }

}

macro_rules! must_property {
    ($name:expr,$ty:ty,$js_obj:expr) => {
        if let Some(prop) =  $js_obj.get_property($name)? {
            prop.as_value::<$ty>()?
        } else {
            return Err(NjError::Other(format!("missing {} property",$name)))
        }
    };
}

macro_rules! optional_property {

    ($name:expr,$ty:ty,$js_obj:expr) => {
        if let Some(prop) =  $js_obj.get_property($name)? {
            Some(prop.as_value::<$ty>()?)
        } else {
            None
        }
    };

    ($name:expr,$ty:ty,$default:expr,$js_obj:expr) => {
        if let Some(prop) =  $js_obj.get_property($name)? {
            prop.as_value::<$ty>()?
        } else {
            $default
        }
    };
}



use flv_client::query_params::ReplicaConfig;
use flv_client::query_params::Partition;
use flv_client::query_params::Partitions;

struct ReplicaParam(ReplicaConfig);

impl JSValue for ReplicaParam  {

    fn convert_to_rust(env: &JsEnv,n_value: napi_value) -> Result<Self,NjError> {

        debug!("start conversion of replica param");
        if let Ok(assign_param) = env.convert_to_rust::<Assigned>(n_value)   {

            debug!("detected array, assume assign");
            let partition_list: Vec<Partition> = assign_param.into_iter().map(|p| p.0).collect();
            Ok(Self(ReplicaConfig::Assigned(Partitions::new(partition_list))))

        } else if  let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            
            debug!("assume computed, will extract as object");

            // check replication
            let replication = must_property!("replication",i32,js_obj) as i16;
            let partitions = optional_property!("partition",i32,1,js_obj);
            let rack = optional_property!("rack",bool,false,js_obj);

            Ok(Self(ReplicaConfig::Computed(partitions,replication,rack)))

        } else {
            return Err(NjError::Other("must pass json param".to_owned()))
        }
    }
}

// partition assignment syntax is same as cli
//  [
//    {
//        "id": 0,
//        "replicas": [
//            5001,
//            5002,
//        ]
//    },
//    {
//        "id": 1,
//        "replicas": [
//            5002,
//            5003,
//           
//  ] 
type Assigned = Vec<PartitionWrap>;

struct PartitionWrap(Partition);

// parse {
//        "id": 0,
//        "replicas": [
//            5001,
//            5002,
//        ]
//    },
impl JSValue for PartitionWrap  {

    fn convert_to_rust(env: &JsEnv,n_value: napi_value) -> Result<Self,NjError> {

        if  let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            
            let id = must_property!("id",i32,js_obj);
            let replicas = must_property!("replicas",Vec<i32>,js_obj);

            Ok(Self(Partition::new(id,replicas)))

        } else {
            return Err(NjError::Other("partition map must be json".to_owned()))
        }
    }
}



#[derive(Debug)]
struct CustomSpuParam {
    id: i32,
    name: String,
    public: ServerAddress,
    private: ServerAddress,
    rack: Option<String>
}

impl JSValue for CustomSpuParam  {

    fn convert_to_rust(env: &JsEnv,n_value: napi_value) -> Result<Self,NjError> {

        if  let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            
            let id = must_property!("id",i32,js_obj);
            let name = must_property!("name",String,js_obj);
            let public = TryFrom::try_from(must_property!("public",String,js_obj))
                .map_err(|err: IoError| NjError::Other(err.to_string()))?;
            let private = TryFrom::try_from(must_property!("private",String,js_obj))
                .map_err(|err: IoError| NjError::Other(err.to_string()))?;
            let rack = optional_property!("rack",String,js_obj);

            Ok(Self {
                id,
                name,
                public,
                private,
                rack
            })

        } else {
            return Err(NjError::Other("parameter must be json".to_owned()))
        }
    }
}

struct DeleteCustomSpu(FlvCustomSpu);


impl JSValue for DeleteCustomSpu  {

    fn convert_to_rust(env: &JsEnv,n_value: napi_value) -> Result<Self,NjError> {

        if let Ok(id) = env.convert_to_rust::<i32>(n_value) {
            Ok(Self(FlvCustomSpu::Id(id)))
        } else if let Ok(name) = env.convert_to_rust::<String>(n_value) {
            Ok(Self(FlvCustomSpu::Name(name)))
        } else {
            return Err(NjError::Other(format!("spu id must be number or string")));
        }
    }
}

use flv_api_sc::spu::FlvCreateSpuGroupRequest;
use flv_api_sc::spu::FlvGroupConfig;
use flv_api_sc::spu::FlvStorageConfig;

#[derive(Debug)]
struct ManagedGroup(FlvCreateSpuGroupRequest);

impl JSValue for ManagedGroup {

    fn convert_to_rust(env: &JsEnv,n_value: napi_value) -> Result<Self,NjError> {

        if  let Ok(js_obj) = env.convert_to_rust::<JsObject>(n_value) {
            
            let name = must_property!("name",String,js_obj);
            let replicas = must_property!("replicas",i32,js_obj) as u16;
            let min_id = optional_property!("minId",i32,js_obj);
            let rack = optional_property!("rack",String,js_obj);
            let storage = optional_property!("storage",String,js_obj);
        
            Ok(Self(
                FlvCreateSpuGroupRequest {
                    name,
                    replicas,
                    min_id,
                    config: FlvGroupConfig {
                        storage: storage.map(|size| 
                            FlvStorageConfig { 
                                size: Some(size), 
                                ..Default::default() 
                            }),
                        ..Default::default()
                    },
                    rack
                }
            ))
        
        } else {
            return Err(NjError::Other("parameter must be json".to_owned()))
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
