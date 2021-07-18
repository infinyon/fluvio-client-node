use node_bindgen::derive::node_bindgen;
use fluvio::{Fluvio, FluvioConfig};

use crate::error::FluvioErrorJS;
use crate::fluvio::FluvioJS;

#[node_bindgen()]
async fn connect(host_addr: Option<String>) -> Result<FluvioJS, FluvioErrorJS> {
    match host_addr {
        Some(host) => {
            let config = FluvioConfig::new(host);
            let socket = Fluvio::connect_with_config(&config).await?;
            Ok(FluvioJS::from(socket))
        }
        None => {
            let socket = Fluvio::connect().await?;
            Ok(FluvioJS::from(socket))
        }
    }
}
