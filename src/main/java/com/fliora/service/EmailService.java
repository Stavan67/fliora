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

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String toEmail, String username, String verificationToken) {
        try {
            logger.info("Sending verification email to: {} via SendGrid", toEmail);

            SimpleMailMessage message = new SimpleMailMessage();
            // Use your domain email or noreply
            message.setFrom("fliora.app@gmail.com");
            message.setTo(toEmail);
            message.setSubject("Verify Your Fliora Account");

            String verificationUrl = baseUrl + "/api/auth/verify-email?token=" + verificationToken;
            logger.debug("Verification URL: {}", verificationUrl);

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

            logger.info("Sending email via SendGrid SMTP...");
            mailSender.send(message);
            logger.info("Email sent successfully to: {} via SendGrid", toEmail);

        } catch (org.springframework.mail.MailAuthenticationException e) {
            logger.error("SendGrid authentication failed - Check API key", e);
            throw new RuntimeException("Email authentication failed", e);
        } catch (org.springframework.mail.MailSendException e) {
            logger.error("SendGrid send failed for {}: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Email send failed", e);
        } catch (Exception e) {
            logger.error("Unexpected error sending email to {}: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Email service error", e);
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