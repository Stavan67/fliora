package com.fliora.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/")
    public String home() {
        return "Fliora is running!";
    }

    @GetMapping("/actuator/health")
    public Map<String, String> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("message", "Application is running");
        return status;
    }
}