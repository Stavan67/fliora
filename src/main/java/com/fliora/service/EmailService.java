package com.fliora.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
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
            mailSender.send(message);
        } catch(Exception e) {
            throw new RuntimeException("Failed to send verification email", e);
        }
    }
}
