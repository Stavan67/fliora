package com.fliora.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${spring.mail.username}")
    private String mailUsername;

    @Value("${spring.mail.host}")
    private String mailHost;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String toEmail, String username, String verificationToken) {
        try {
            logger.info("=== EMAIL SENDING DEBUG INFO ===");
            logger.info("To: {}", toEmail);
            logger.info("Username: {}", username);
            logger.info("Base URL: {}", baseUrl);
            logger.info("Mail Host: {}", mailHost);
            logger.info("Mail Username: {}", mailUsername);
            logger.info("Token (first 8 chars): {}", verificationToken.substring(0, 8));

            SimpleMailMessage message = new SimpleMailMessage();

            // CRITICAL: Use the verified sender email from SendGrid
            message.setFrom("fliora.app@gmail.com");
            message.setTo(toEmail);
            message.setSubject("Verify Your Fliora Account");

            String verificationUrl = baseUrl + "/api/auth/verify-email?token=" + verificationToken;
            logger.info("Full Verification URL: {}", verificationUrl);

            String emailBody = String.format("""
                Hi %s,
                
                Welcome to Fliora! Please verify your email address by clicking the link below:
                
                %s
                
                This link will expire in 24 hours.
                
                If you didn't create this account, please ignore this email.
                
                Best regards,
                Team Fliora
                """, username, verificationUrl);

            message.setText(emailBody);

            logger.info("Attempting to send email via SendGrid SMTP...");
            mailSender.send(message);
            logger.info("✅ Email sent successfully to: {}", toEmail);

        } catch (org.springframework.mail.MailAuthenticationException e) {
            logger.error("❌ SENDGRID AUTH FAILED: {}", e.getMessage());
            logger.error("Check: 1) API key is correct, 2) fliora.app@gmail.com is verified in SendGrid", e);
            throw new RuntimeException("Email authentication failed: " + e.getMessage(), e);
        } catch (org.springframework.mail.MailSendException e) {
            logger.error("❌ SENDGRID SEND FAILED: {}", e.getMessage());
            logger.error("Full error:", e);
            throw new RuntimeException("Email send failed: " + e.getMessage(), e);
        } catch (Exception e) {
            logger.error("❌ UNEXPECTED EMAIL ERROR: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            logger.error("Full error:", e);
            throw new RuntimeException("Email service error: " + e.getMessage(), e);
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