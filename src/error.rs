use node_bindgen::derive::node_bindgen;

#[node_bindgen]
pub struct FluvioErrorJS(String);

impl FluvioErrorJS {
    pub fn new(inner: String) -> Self {
        Self(inner)
    }
}

impl From<anyhow::Error> for FluvioErrorJS {
    fn from(error: anyhow::Error) -> Self {
        Self(error.to_string())
    }
}

use fluvio::dataplane::link::ErrorCode;

impl From<ErrorCode> for FluvioErrorJS {
    fn from(inner: ErrorCode) -> Self {
        Self(inner.to_string())
    }
}
