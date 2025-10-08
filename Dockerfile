# Multi-stage build
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --production
COPY frontend/ ./
RUN npm run build

# Build backend
FROM maven:3.8.4-openjdk-17-slim AS backend-build

WORKDIR /app
COPY pom.xml ./
COPY src ./src

# Copy the frontend build into Spring Boot's static resources BEFORE building
COPY --from=frontend-build /app/frontend/build ./src/main/resources/static

# Build the JAR file (now includes the frontend)
RUN mvn clean package -DskipTests

# Final stage - Use slim image
FROM openjdk:17-jdk-slim

WORKDIR /app

# Copy the JAR file that now contains the frontend
COPY --from=backend-build /app/target/fliora-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

# CRITICAL: Set JVM memory limits and optimize garbage collection
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+UseStringDeduplication -XX:+OptimizeStringConcat -Djava.security.egd=file:/dev/./urandom"

# Use the PORT environment variable that Railway provides
CMD java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar app.jar