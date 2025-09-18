package com.fliora.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    // Remove the root mapping - let React handle it
    // @GetMapping("/") // DELETE THIS LINE

    @GetMapping("/actuator/health")
    public Map<String, String> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("message", "Application is running");
        return status;
    }

    // Add a specific health check endpoint instead
    @GetMapping("/api/health")
    public String apiHealth() {
        return "Fliora API is running!";
    }
}