use fluvio::FluvioError;
use node_bindgen::derive::node_bindgen;
use fluvio::dataplane::link::ErrorCode;

#[node_bindgen]
pub struct FluvioErrorJS(String);

impl From<fluvio::FluvioError> for FluvioErrorJS {
    fn from(inner: FluvioError) -> Self {
        Self(inner.to_string())
    }
}

impl From<ErrorCode> for FluvioErrorJS {
    fn from(inner: ErrorCode) -> Self {
        Self(inner.to_string())
    }
}
