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

    @Value("${spring.mail.username}")
    private String mailUsername;

    @GetMapping("/sendgrid-config")
    public ResponseEntity<?> checkSendGridConfig() {
        Map<String, Object> response = new HashMap<>();

        try {
            response.put("mailHost", mailHost);
            response.put("mailUsername", mailUsername);
            response.put("apiKeySet", System.getProperty("spring.mail.password") != null ||
                    System.getenv("SPRING_MAIL_PASSWORD") != null);
            response.put("isSendGrid", "smtp.sendgrid.net".equals(mailHost));

            logger.info("SendGrid config - Host: {}, Username: {}", mailHost, mailUsername);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("SendGrid config check failed", e);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // TEMPORARY - Remove after testing
    @PostMapping("/sendgrid-email")
    public ResponseEntity<?> testSendGridEmail(@RequestParam String email) {
        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("Testing SendGrid email send to: {}", email);

            String testToken = UUID.randomUUID().toString();
            emailService.sendVerificationEmail(email, "TestUser", testToken);

            response.put("success", true);
            response.put("message", "SendGrid test email sent successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("SendGrid test email failed", e);
            response.put("success", false);
            response.put("message", "SendGrid test failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}