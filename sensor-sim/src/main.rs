use std::time::Duration;

use rand_distr::{Distribution, Normal};
use rumqttc::{AsyncClient, MqttOptions, QoS, TlsConfiguration, Transport};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialDetails {
    certificate: String,
    private_key: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorData {
    sensor_id: u32,
    data: f32,
    #[serde(rename = "type")]
    type_: String,
    #[serde(with = "time::serde::rfc3339")]
    timestamp: OffsetDateTime,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut opts = MqttOptions::new("sensor-5", "127.0.0.1", 8883);

    let creds: CredentialDetails = serde_json::from_str(include_str!("../certs/output.json"))?;

    let mut cert = creds.certificate;
    cert.push('\n');
    cert.push_str(include_str!("../../demo/certs/ca.crt"));

    let transport = Transport::tls(
        include_bytes!("../../demo/certs/ca.crt").to_vec(),
        Some((
            cert.as_bytes().to_vec(),
            creds.private_key.as_bytes().to_vec(),
        )),
        None,
    );

    opts.set_transport(transport);

    let (client, mut evloop) = AsyncClient::new(opts, 10);

    let ty = "TEMPERATURE";
    let val_avg = 21f32;
    let val_stdev = 10f32;
    let dist = Normal::new(val_avg, val_stdev)?;
    let period = Duration::from_secs(5);

    let mut ticker = tokio::time::interval(period);

    loop {
        tokio::select! {
            _ = ticker.tick() => {
                let val = dist.sample(&mut rand::rng());
                let ts = OffsetDateTime::now_utc();

                let data = SensorData {
                    sensor_id: 5,
                    data: val,
                    type_: ty.to_string(),
                    timestamp: ts,
                };

                let payload = serde_json::to_string(&data)?;

                println!("Publishing item {}", payload);
                client
                    .publish("sensor/5", QoS::AtLeastOnce, false, payload)
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
