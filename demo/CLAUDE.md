# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
./gradlew clean test      # Run tests
./gradlew clean assemble  # Package the application
./gradlew clean run       # Run the application
```

The application runs on port 8888.

## Architecture

This is a **Vert.x 5.0.10** reactive Java application for sensor management with MQTT integration.

### Verticle Structure

- **MainVerticle** - Entry point that creates HTTP server and deploys other verticles
- **SensorController** - REST API endpoints for sensor CRUD operations
- **IngressVerticle** - MQTT client for receiving sensor data (partially implemented, currently disabled)

### Data Layer

- **SensorRepository** (`repo/`) - In-memory sensor storage using immutable Map
- **Sensor** - Java record with `id` and `region` fields
- **SensorData** (`ingress/`) - Placeholder for MQTT message data

### REST API Endpoints

- `GET /api/sensors/get?id=<id>` - Retrieve sensor by ID
- `POST /api/sensors/create` - Create new sensor (JSON body with id and region)
- `POST /api/sensors/delete` - Delete sensor by ID (JSON body with id)

### Key Dependencies

- Vert.x Web for HTTP routing
- Vert.x MQTT for IoT device communication
- Jackson for JSON serialization
- JUnit 5 with Vert.x extension for async testing

## Testing

Tests use `@ExtendWith(VertxExtension.class)` and `VertxTestContext` for async test support.