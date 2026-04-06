# Build stage
FROM eclipse-temurin:25-jdk AS build

WORKDIR /app

# Copy gradle wrapper and build files
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .

# Make gradlew executable
RUN chmod +x gradlew

# Download dependencies
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src src

# Build fat JAR
RUN ./gradlew shadowJar --no-daemon

# Runtime stage
FROM eclipse-temurin:25-jre

WORKDIR /app

# Copy the fat JAR from build stage
COPY --from=build /app/build/libs/*-fat.jar app.jar

# Copy certs directory for relative path access
COPY certs certs

EXPOSE 8888

CMD ["java", "-jar", "app.jar"]
