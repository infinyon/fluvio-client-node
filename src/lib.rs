mod connect;
mod sc;
mod replica;
mod consume_stream;
mod metadata;
mod admin;


use shared::SharedScClient;

mod shared {

    use std::sync::Arc;
    use flv_client::ScClient;
    use flv_future_aio::sync::RwLock;

    pub type SharedScClient = Arc<RwLock<ScClient>>;
}