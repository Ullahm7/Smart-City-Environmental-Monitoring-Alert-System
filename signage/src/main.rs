use std::time::Duration;

use clap::Parser;
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
        let data = reqwest::get(&format!("http://localhost:8888/api/data/current?region={}&type=TEMPERATURE", args.region_id)).await?.json::<Vec<SensorData>>().await?;

        if let Some(d) = data.first() {
            println!("Current temperature: {}°C", d.data);
        }

        tokio::time::sleep(Duration::from_secs(5)).await;
    }
}
