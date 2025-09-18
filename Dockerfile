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

WORKDIR /app/backend
COPY pom.xml ./
COPY src ./src
RUN mvn clean package -DskipTests

# Final stage
FROM openjdk:17-jdk-slim

WORKDIR /app

# Copy backend jar
COPY --from=backend-build /app/backend/target/*.jar app.jar

# Copy frontend build to Spring Boot static resources
RUN mkdir -p /app/BOOT-INF/classes/static
COPY --from=frontend-build /app/frontend/build /app/BOOT-INF/classes/static

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]