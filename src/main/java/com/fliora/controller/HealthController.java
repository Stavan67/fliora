package com.fliora.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Health and memory monitoring endpoint
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Map<String, Object> getHealth() {
        Runtime runtime = Runtime.getRuntime();

        long maxMemory = runtime.maxMemory();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;

        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("memory", Map.of(
                "max", formatMemory(maxMemory),
                "total", formatMemory(totalMemory),
                "used", formatMemory(usedMemory),
                "free", formatMemory(freeMemory),
                "usedPercentage", String.format("%.2f%%", (usedMemory * 100.0) / maxMemory)
        ));

        return health;
    }

    private String formatMemory(long bytes) {
        return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
    }
}