use std::time::Duration;

use clap::Parser;
use reqwest::StatusCode;
use serde::Deserialize;

#[derive(Parser)]
#[command(version,about,long_about = None)]
struct Cli {
    /// The id of the region to query temperature data from
    region_id: String,
}

#[derive(Debug, Deserialize)]
struct SensorData {
    region: String,
    #[serde(rename = "type")]
    type_: String,
    data: f64,
    timestamp: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Cli::parse();

    loop {
        let res = reqwest::get(&format!("http://localhost:8888/api/data/current?region={}&type=TEMPERATURE", args.region_id)).await?;
        if res.status() == StatusCode::TOO_MANY_REQUESTS {
            println!("Rate limited.");
            return Ok(());
        }
        let data = res.json::<Vec<SensorData>>().await?;

        if let Some(d) = data.first() {
            println!("Current temperature: {}°C", d.data);
        }

    }
}
