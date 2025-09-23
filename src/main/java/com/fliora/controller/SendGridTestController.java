package com.fliora.controller;

import com.fliora.service.SendGridApiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/test")
public class SendGridTestController {
    private static final Logger logger = LoggerFactory.getLogger(SendGridTestController.class);

    @Autowired
    private SendGridApiService sendGridApiService;

    @Value("${sendgrid.api-key}")
    private String apiKey;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.from-email}")
    private String fromEmail;

    @GetMapping("/sendgrid-config")
    public ResponseEntity<?> checkSendGridConfig() {
        Map<String, Object> response = new HashMap<>();

        try {
            response.put("fromEmail", fromEmail);
            response.put("apiKeyPresent", apiKey != null);
            response.put("apiKeyValid", apiKey != null && apiKey.startsWith("SG."));
            response.put("apiKeyLength", apiKey != null ? apiKey.length() : 0);
            response.put("baseUrl", baseUrl);

            logger.info("=== SENDGRID WEB API CONFIG CHECK ===");
            logger.info("From Email: {}", fromEmail);
            logger.info("API Key Present: {}", apiKey != null);
            logger.info("API Key Valid Format: {}", apiKey != null && apiKey.startsWith("SG."));
            logger.info("Base URL: {}", baseUrl);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("SendGrid config check failed", e);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/sendgrid-webapi-email")
    public ResponseEntity<?> testSendGridWebApiEmail(@RequestParam String email) {
        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("=== TESTING SENDGRID WEB API ===");
            logger.info("Target email: {}", email);

            String testToken = UUID.randomUUID().toString();
            sendGridApiService.sendVerificationEmail(email, "TestUser", testToken);

            response.put("success", true);
            response.put("message", "SendGrid Web API test email sent successfully");
            response.put("targetEmail", email);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("=== SENDGRID WEB API TEST FAILED ===", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            response.put("errorType", e.getClass().getSimpleName());
            return ResponseEntity.badRequest().body(response);
        }
    }
}