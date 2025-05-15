use node_bindgen::derive::node_bindgen;
use fluvio::{Fluvio, FluvioConfig};

use crate::error::FluvioErrorJS;
use crate::fluvio::FluvioJS;

#[node_bindgen()]
async fn connect(
    host_addr: Option<String>,
    use_spu_local_address: Option<bool>,
) -> Result<FluvioJS, FluvioErrorJS> {
    match host_addr {
        Some(host) => {
            let mut config = FluvioConfig::new(host);

            if let Some(use_spu_local_address) = use_spu_local_address {
                config.use_spu_local_address = use_spu_local_address;
            }

            let socket = Fluvio::connect_with_config(&config).await?;
            Ok(FluvioJS::from(socket))
        }
        None => {
            let socket = Fluvio::connect().await?;
            Ok(FluvioJS::from(socket))
        }
    }
}
