package com.fliora.service;

import com.sendgrid.*;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class SendGridWebApiService {
    private static final Logger logger = LoggerFactory.getLogger(SendGridWebApiService.class);

    @Value("${sendgrid.api-key}")
    private String sendGridApiKey;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.from-email:fliora.app@gmail.com}")
    private String fromEmail;

    public void sendVerificationEmail(String toEmail, String username, String verificationToken) {
        try {
            logger.info("=== SENDGRID WEB API EMAIL SENDING ===");
            logger.info("To: {}", toEmail);
            logger.info("From: {}", fromEmail);
            logger.info("Username: {}", username);
            logger.info("Token (first 8 chars): {}", verificationToken.substring(0, 8));

            Email from = new Email(fromEmail);
            String subject = "Verify Your Fliora Account";
            Email to = new Email(toEmail);

            String verificationUrl = baseUrl + "/api/auth/verify-email?token=" + verificationToken;
            logger.info("Verification URL: {}", verificationUrl);

            String emailBody = String.format("""
                Hi %s,
                
                Welcome to Fliora! Please verify your email address by clicking the link below:
                
                %s
                
                This link will expire in 24 hours.
                
                If you didn't create this account, please ignore this email.
                
                Best regards,
                Team Fliora
                """, username, verificationUrl);

            Content content = new Content("text/plain", emailBody);
            Mail mail = new Mail(from, subject, to, content);

            SendGrid sg = new SendGrid(sendGridApiKey);
            Request request = new Request();

            try {
                request.setMethod(Method.POST);
                request.setEndpoint("mail/send");
                request.setBody(mail.build());

                logger.info("Sending email via SendGrid Web API...");
                Response response = sg.api(request);

                logger.info("SendGrid Response Status: {}", response.getStatusCode());
                logger.info("SendGrid Response Body: {}", response.getBody());
                logger.info("SendGrid Response Headers: {}", response.getHeaders());

                if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                    logger.info("✅ Email sent successfully via SendGrid Web API to: {}", toEmail);
                } else {
                    logger.error("❌ SendGrid API returned non-success status: {}", response.getStatusCode());
                    throw new RuntimeException("SendGrid API failed with status: " + response.getStatusCode());
                }

            } catch (IOException ex) {
                logger.error("❌ SendGrid Web API IOException", ex);
                throw new RuntimeException("SendGrid Web API error: " + ex.getMessage(), ex);
            }

        } catch (Exception e) {
            logger.error("❌ SendGrid Web API Email Error", e);
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