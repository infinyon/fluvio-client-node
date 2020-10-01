mod admin;
mod connect;
mod consumer;
mod producer;
mod fluvio;

use shared::*;

mod shared {

    use std::sync::Arc;
    use fluvio::Fluvio;
    use flv_future_aio::sync::RwLock;

    pub type SharedFluvio = Arc<RwLock<Fluvio>>;

    pub const OFFSET_BEGINNING: &str = "beginning";
    pub const OFFSET_END: &str = "end";

    pub const CLIENT_NOT_FOUND_ERROR_MSG: &str =
        "fluvio client not found; ensure fluvio client is instantiated correctly.";

    #[macro_export]
    macro_rules! must_property {
        ($name:expr,$ty:ty,$js_obj:expr) => {
            if let Some(prop) = $js_obj.get_property($name)? {
                prop.as_value::<$ty>()?
            } else {
                return Err(NjError::Other(format!("missing {} property", $name)));
            }
        };
    }

    #[macro_export]
    macro_rules! optional_property {
        ($name:expr,$ty:ty,$js_obj:expr) => {
            if let Some(prop) = $js_obj.get_property($name)? {
                Some(prop.as_value::<$ty>()?)
            } else {
                None
            }
        };

        ($name:expr,$ty:ty,$default:expr,$js_obj:expr) => {
            if let Some(prop) = $js_obj.get_property($name)? {
                prop.as_value::<$ty>()?
            } else {
                $default
            }
        };
    }
}
