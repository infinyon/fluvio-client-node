
use serde::{Deserialize, Serialize};


use fluvio_smartmodule::{smartmodule, Result, SmartModuleRecord};

#[derive(Deserialize, Serialize)]
struct LogRecord {
    level: String,
    message: String,
}

#[smartmodule(filter)]
pub fn filter(record: &SmartModuleRecord) -> Result<bool> {
    let strrec = std::str::from_utf8(record.value.as_ref())?;
    let logrec: LogRecord = serde_json::from_str(strrec)?;
    Ok(logrec.level != "debug")
}

