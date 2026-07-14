# SCEMAS — Smart City Environmental Monitoring & Alert System

SCEMAS is an environmental monitoring and alerting platform for municipalities. It ingests real-time telemetry (air quality, noise, temperature, humidity, precipitation, light pollution, etc.) from IoT sensors deployed across a city, aggregates it by geofenced region, and raises alerts when readings cross health/safety thresholds — notifying city operators, subscribed citizens, and third-party systems.

This repo contains the full software design lifecycle: requirements, architecture, detailed design, and a working implementation. **Best demonstration presented for 3A04**

## Features

- **Real-time sensor ingestion** over MQTT, aggregated into 5-minute averages / hourly maximums per region
- **Region-based alerting** — administrators define geofenced regions and threshold-based alert rules; alerts fire automatically and notify subscribers
- **Role-based access** for city operators, third-party developers (via public REST API), and citizens
- **Audit logging** of all administrative actions (sensor, region, alert, and account changes)
- **Public digital signage client** for displaying live regional data/alerts using Event bus
- Innovative features: **customizable operator dashboards**, **historic-data-based predictions**, and **pollution hotspot identification**

## Architecture

SCEMAS follows a **Presentation–Abstraction–Control (PAC)** architecture at the top level:

- **Presentation** — the web dashboard (React) and public signage client, layered by data update rate
- **Abstraction/Control** — a set of subsystems, most following a **Repository** style (Region, Sensor, Account/Authentication, Alert, Dashboard, Audit management), plus a **Pipe-and-Filter** subsystem for real-time sensor data ingestion and aggregation

| Subsystem | Purpose | Style |
|---|---|---|
| Sensor Data Controller / Ingress | Ingest & filter incoming sensor data (raw → rolling average → timeframe max) | Pipe and Filter |
| Sensor Management | Register/manage IoT sensors | Repository |
| Region Management | Define/manage geofenced regions | Repository |
| Alert Management | Define alert rules, raise/deliver alerts | Repository |
| Authentication Management | Registration, login, RBAC | Repository |
| Dashboard Management | Drive operator dashboard visualizations & customization | Repository |
| Audit Log Management | Log all administrative actions | Repository |

Full rationale for these architectural choices (including alternatives considered, such as MVC, Blackboard, and Batch Sequential), the Analysis Class Diagram, CRC cards, state charts, sequence diagrams, and a detailed class diagram are in [`doc/`](./doc).

## Tech Stack

- **Frontend:** React 19 + Vite, `react-router-dom`, `react-leaflet`/Leaflet for map/geofence visualization (`frontend/`)
- **Backend:** Vert.x 5 on the JVM (Java 25), built with Gradle — verticles for ingress filtering, MQTT, HTTP/web, and region/sensor/alert/dashboard/audit repositories (`demo/`)
- **Sensor simulator:** Rust, using `rumqttc` to publish simulated telemetry over MQTT (`sensor-sim/`)
- **Digital signage client:** Rust, using `reqwest` to poll the public API for display (`signage/`)
- **API contract:** OpenAPI (`openapi.yaml`), documented as static HTML via Redoc (`redoc-static.html`)
- **Containerization:** Docker (`docker-compose.yml`) — backend on ports `8888` (HTTP) and `8883` (MQTT), frontend served on port `80`
- **Dev environment:** Nix (`flake.nix` / `flake.lock`)

## Repository Structure

```
.
├── demo/                  # Vert.x backend (Java/Gradle) — the actual SCEMAS server
│   └── src/main/java/sfwreng3a04/t03/g01/demo/
│       ├── MainVerticle.java, IngressVerticle.java
│       ├── *Controller.java          # HTTP/API controllers (Alert, Region, Sensor, Dashboard, Auth, Audit, Data, SensorData)
│       ├── alert/                    # Alert, AlertRule, ThresholdCondition, AlertStatus
│       ├── ingress/                  # SensorData, AnonymizedSensorData, codecs, SensorType
│       ├── ingress/filters/          # Pipe-and-Filter chain: RawDataFilter → RollingAverageFilter → TimeframeMaxFilter
│       └── repo/                     # Region/Sensor/Dashboard/AuditLog repository management classes
├── doc/
│   ├── deliverable/       # Deliverables 1–3 (PDF): SRS, architecture design, detailed design
│   └── diag/              # All diagrams (state charts, sequence diagrams, class diagrams, use case, architecture)
├── frontend/               # React + Vite web dashboard
├── sensor-sim/             # Rust IoT sensor simulator (publishes over MQTT)
├── signage/                # Rust public digital signage client (polls the public API)
├── docker-compose.yml      # Orchestrates backend (demo/) + frontend
├── openapi.yaml            # Public REST API specification
├── redoc-static.html       # Rendered API documentation (Redoc)
├── flake.nix / flake.lock  # Nix development environment
└── sensor-sim.exe          # Prebuilt sensor simulator binary (Windows)
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Nix](https://nixos.org/download.html) (optional, for a reproducible dev shell) — run `nix develop` from the repo root
- JDK 25 (for `demo/`, if running outside Docker — Gradle wrapper is included)
- Node.js (for `frontend/`)
- Rust toolchain (for `sensor-sim/` and `signage/`, if building from source)

### Run the full stack

```bash
git clone https://github.com/Ullahm7/Smart-City-Environmental-Monitoring-Alert-System.git
cd Smart-City-Environmental-Monitoring-Alert-System
docker-compose up --build
```

This builds and runs the Vert.x backend (`demo/`, exposing HTTP on `8888` and MQTT on `8883`) and the React frontend (served on `80`).

### Run the backend directly (without Docker)

```bash
cd demo
./gradlew clean run
```

### Run the frontend in dev mode

```bash
cd frontend
npm install
npm run dev
```

### Simulate sensor data

Use the prebuilt binary (`sensor-sim.exe`) or build from source:

```bash
cd sensor-sim
cargo run
```

This publishes simulated environmental readings over MQTT so the ingress pipeline can be exercised end-to-end without physical hardware. Note that when creating a sensor, encryption is done through sending json credentials one time that is used for sensor config.

### Run the signage client

```bash
cd signage
cargo run
```

Polls the backend's public API and displays live regional data/alerts, as would a physical city sign.

## API Documentation

The public REST API is specified in [`openapi.yaml`](./openapi.yaml). A rendered version is available in [`redoc-static.html`](./redoc-static.html) — open it directly in a browser, or regenerate it with [Redoc CLI](https://github.com/Redocly/redoc):

```bash
npx @redocly/cli build-docs openapi.yaml -o redoc-static.html
```

## Design Documentation

The `doc/` folder contains the full design deliverable set produced for this project:

- [`doc/deliverable/`](./doc/deliverable) — the three PDF deliverables:
  1. **Software Requirements Specification** — scope, user characteristics, functional/non-functional requirements, use cases
  2. **Architectural Design** — PAC/Repository/Pipe-and-Filter rationale, subsystem breakdown, CRC cards, Analysis Class Diagram
  3. **Detailed Design** — state charts, sequence diagrams, detailed class diagram
- [`doc/diag/`](./doc/diag) — every diagram referenced in the deliverables as standalone images (system architecture, use case, controller state diagrams, sequence diagrams, and the 3-part detailed class diagram)

## Team

- Muhammad Ullah 
- Nadeem Elsayed
- Kaitlyn Kenwell
- Aiden Sanvido
- Kurlan Beeharry

