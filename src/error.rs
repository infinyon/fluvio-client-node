use fluvio::FluvioError;
use node_bindgen::derive::node_bindgen;

#[node_bindgen]
pub struct FluvioErrorJS(String);

impl From<fluvio::FluvioError> for FluvioErrorJS {
    fn from(inner: FluvioError) -> Self {
        Self(inner.to_string())
    }
}

use fluvio::dataplane::link::ErrorCode;

impl From<ErrorCode> for FluvioErrorJS {
    fn from(inner: ErrorCode) -> Self {
        Self(inner.to_string())
    }
}
