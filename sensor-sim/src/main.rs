use std::{path::PathBuf, time::Duration};

use clap::{Parser, ValueEnum};
use rand_distr::{Distribution, Normal};
use rumqttc::{AsyncClient, MqttOptions, QoS, Transport};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialDetails {
    sensor: Sensor,
    certificate: String,
    private_key: String,
}

#[derive(Deserialize)]
pub struct Sensor {
    id: Uuid,
    name: String,
    region: Uuid
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorData {
    sensor_id: Uuid,
    data: f64,
    #[serde(rename = "type")]
    type_: SensorType,
    #[serde(with = "time::serde::rfc3339")]
    timestamp: OffsetDateTime,
}

#[derive(Copy, Clone, ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SensorType {
    AirQuality,
    Temperature,
    Humidity,
    Noise,
    UvIndex,
    Rainfall,
    Wind,
}

#[derive(Parser)]
#[command(version, about, long_about = None)]
struct Cli {
    #[arg(short = 't', long = "type")]
    sensor_type: SensorType,

    #[arg(short = 'p', long = "period")]
    tx_period_seconds: u16,

    #[arg(short = 'm', long = "mean")]
    reading_mean: f64,

    #[arg(short = 'd', long = "stdev")]
    reading_dev: f64,

    #[arg(long)]
    ca_path: PathBuf,

    #[arg(long)]
    cred_path: PathBuf,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    let creds: CredentialDetails =
        serde_json::from_str(&tokio::fs::read_to_string(cli.cred_path).await?)?;

    let mut opts = MqttOptions::new(&format!("sensor-{}", creds.sensor.id), "127.0.0.1", 8883);

    let ca = tokio::fs::read_to_string(cli.ca_path).await?;
    let mut cert = creds.certificate;
    cert.push('\n');
    cert.push_str(&ca);

    let transport = Transport::tls(
        ca.as_bytes().to_vec(),
        Some((
            cert.as_bytes().to_vec(),
            creds.private_key.as_bytes().to_vec(),
        )),
        None,
    );

    opts.set_transport(transport);

    let (client, mut evloop) = AsyncClient::new(opts, 10);

    let dist = Normal::new(cli.reading_mean, cli.reading_dev)?;
    let period = Duration::from_secs(cli.tx_period_seconds as u64);

    let mut ticker = tokio::time::interval(period);

    loop {
        tokio::select! {
            _ = ticker.tick() => {
                let val = dist.sample(&mut rand::rng());
                let ts = OffsetDateTime::now_utc();

                let data = SensorData {
                    sensor_id: creds.sensor.id,
                    data: val,
                    type_: cli.sensor_type,
                    timestamp: ts,
                };

                let payload = serde_json::to_string(&data)?;

                println!("Publishing item {}", payload);
                client
                    .publish(&format!("sensor/{}", creds.sensor.id), QoS::AtLeastOnce, false, payload)
                    .await?;
                println!("Done");
            }
            ev = evloop.poll() => {
                match ev {
                    Ok(v) => println!("Event {v:?}"),
                    Err(e) => {
                        println!("Error {e:?}");
                        break;
                    }
                }
            }
        }
    }
    Ok(())
}
