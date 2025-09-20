package com.fliora.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeoutException;

@Service
public class EmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.base-url}")
    private String baseUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String toEmail, String username, String verificationToken) {
        try {
            logger.info("Attempting to send verification email to: {}", toEmail);

            // Create the email with a timeout
            CompletableFuture<Void> emailTask = CompletableFuture.runAsync(() -> {
                try {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setFrom(fromEmail);
                    message.setTo(toEmail);
                    message.setSubject("Verify Your Fliora Account");

                    String verificationUrl = baseUrl + "/api/auth/verify-email?token=" + verificationToken;

                    String emailBody = String.format(
                            "Hi %s, \n\n" +
                                    "Welcome to Fliora! Please verify your email address by clicking the link below:\n\n" +
                                    "%s\n\n" +
                                    "This link will expire in 24 hours.\n\n" +
                                    "If you didn't create this account, please ignore this email.\n\n" +
                                    "Best regards,\n" +
                                    "Team Fliora",
                            username, verificationUrl
                    );

                    message.setText(emailBody);

                    logger.info("Sending email with SMTP settings - Host: {}, Port: 587", "smtp.gmail.com");
                    mailSender.send(message);
                    logger.info("Email sent successfully to: {}", toEmail);

                } catch (Exception e) {
                    logger.error("SMTP send failed for {}: {}", toEmail, e.getMessage(), e);
                    throw new RuntimeException("Email send failed", e);
                }
            });

            // Wait for completion with timeout
            emailTask.get(30, TimeUnit.SECONDS);

            logger.info("Verification email sent successfully to: {}", toEmail);

        } catch (TimeoutException e) {
            logger.error("Email sending timed out for: {} after 30 seconds", toEmail);
            // Don't throw - let registration continue
        } catch (Exception e) {
            logger.error("Failed to send verification email to: {} - Error: {}", toEmail, e.getMessage(), e);

            // Log specific error details for debugging
            if (e.getCause() != null) {
                logger.error("Root cause: {}", e.getCause().getMessage());
            }

            // Don't throw RuntimeException - log the error but allow registration to continue
            // This prevents email issues from blocking user registration
        }
    }

    public boolean sendVerificationEmailWithResult(String toEmail, String username, String verificationToken) {
        try {
            sendVerificationEmail(toEmail, username, verificationToken);
            return true;
        } catch (Exception e) {
            logger.error("Email sending failed for: {}", toEmail, e);
            return false;
        }
    }
}