# Multi-stage build
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
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

# Final stage
FROM openjdk:17-jdk-slim

WORKDIR /app

# Copy the JAR file that now contains the frontend
COPY --from=backend-build /app/target/fliora-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

# Use the PORT environment variable that Railway provides
CMD java -Dserver.port=${PORT:-8080} -jar app.jar