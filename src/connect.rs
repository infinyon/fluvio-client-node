use node_bindgen::derive::node_bindgen;
use fluvio::{Fluvio, FluvioConfig, FluvioError};

use crate::fluvio::FluvioWrapper;

#[node_bindgen()]
async fn connect(host_addr: Option<String>) -> Result<FluvioWrapper, FluvioError> {
    match host_addr {
        Some(host) => {
            let config = FluvioConfig::new(host);
            let socket = Fluvio::connect_with_config(&config).await?;
            Ok(FluvioWrapper::from(socket))
        }
        None => Err(FluvioError::Other("host address not found".to_string())),
    }
}
