# Multi-stage build
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Build backend
FROM maven:3.8.4-openjdk-17-slim AS backend-build

WORKDIR /app
COPY pom.xml ./
COPY src ./src

# Build the JAR file
RUN mvn clean package -DskipTests

# Final stage
FROM openjdk:17-jdk-slim

WORKDIR /app

# Copy backend jar from the correct location
COPY --from=backend-build /app/target/fliora-0.0.1-SNAPSHOT.jar app.jar

# Copy frontend build to Spring Boot static resources directory
COPY --from=frontend-build /app/frontend/build ./static/

# Create the directory structure that Spring Boot expects
RUN mkdir -p /app/BOOT-INF/classes/static && \
    cp -r ./static/* /app/BOOT-INF/classes/static/ 2>/dev/null || true

EXPOSE 8080

# Use the PORT environment variable that Railway provides
CMD java -Dserver.port=${PORT:-8080} -jar app.jar