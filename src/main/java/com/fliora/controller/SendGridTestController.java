package com.fliora.controller;

import com.fliora.service.EmailService;
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
    private EmailService emailService;

    @Value("${spring.mail.host}")
    private String mailHost;

    @Value("${spring.mail.port}")
    private int mailPort;

    @Value("${spring.mail.username}")
    private String mailUsername;

    @Value("${spring.mail.password}")
    private String mailPassword;

    @Value("${app.base-url}")
    private String baseUrl;

    @GetMapping("/sendgrid-config")
    public ResponseEntity<?> checkSendGridConfig() {
        Map<String, Object> response = new HashMap<>();

        try {
            response.put("mailHost", mailHost);
            response.put("mailPort", mailPort);
            response.put("mailUsername", mailUsername);
            response.put("mailPassword", mailPassword != null ? "SET (length: " + mailPassword.length() + ")" : "NOT SET");
            response.put("baseUrl", baseUrl);
            response.put("isSendGrid", "smtp.sendgrid.net".equals(mailHost));
            response.put("apiKeyValid", mailPassword != null && mailPassword.startsWith("SG."));

            logger.info("=== SENDGRID CONFIG CHECK ===");
            logger.info("Host: {}", mailHost);
            logger.info("Port: {}", mailPort);
            logger.info("Username: {}", mailUsername);
            logger.info("Password set: {}", mailPassword != null);
            logger.info("Password starts with SG.: {}", mailPassword != null && mailPassword.startsWith("SG."));
            logger.info("Base URL: {}", baseUrl);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("SendGrid config check failed", e);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/sendgrid-email")
    public ResponseEntity<?> testSendGridEmail(@RequestParam String email) {
        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("=== TESTING SENDGRID EMAIL ===");
            logger.info("Target email: {}", email);

            String testToken = UUID.randomUUID().toString();
            emailService.sendVerificationEmail(email, "TestUser", testToken);

            response.put("success", true);
            response.put("message", "SendGrid test email sent successfully");
            response.put("targetEmail", email);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("=== SENDGRID EMAIL TEST FAILED ===", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            response.put("errorType", e.getClass().getSimpleName());
            return ResponseEntity.badRequest().body(response);
        }
    }
}