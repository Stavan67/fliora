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
public class SendGridApiService {
    private static final Logger logger = LoggerFactory.getLogger(SendGridApiService.class);

    @Value("${sendgrid.api-key}")
    private String sendGridApiKey;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.from-email:fliora.app@gmail.com}")
    private String fromEmail;

    public void sendVerificationEmail(String toEmail, String username, String verificationToken) {
        try {
            logger.info("=== SENDGRID WEB API EMAIL ATTEMPT ===");
            logger.info("To: {}", toEmail);
            logger.info("From: {}", fromEmail);
            logger.info("Username: {}", username);
            logger.info("API Key Present: {}", sendGridApiKey != null && sendGridApiKey.startsWith("SG."));
            logger.info("Base URL: {}", baseUrl);

            // Validate API key
            if (sendGridApiKey == null || !sendGridApiKey.startsWith("SG.")) {
                throw new RuntimeException("Invalid SendGrid API key configuration");
            }

            Email from = new Email(fromEmail);
            String subject = "Verify Your Fliora Account";
            Email to = new Email(toEmail);

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

            Content content = new Content("text/plain", emailBody);
            Mail mail = new Mail(from, subject, to, content);

            SendGrid sg = new SendGrid(sendGridApiKey);
            Request request = new Request();

            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            logger.info("Sending email via SendGrid Web API...");
            Response response = sg.api(request);

            logger.info("=== SENDGRID RESPONSE ===");
            logger.info("Status Code: {}", response.getStatusCode());
            logger.info("Response Body: {}", response.getBody());
            logger.info("Response Headers: {}", response.getHeaders());

            // SendGrid returns 202 for successful queuing
            if (response.getStatusCode() == 202) {
                logger.info("✅ Email queued successfully via SendGrid Web API to: {}", toEmail);
            } else if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                logger.info("✅ Email sent successfully via SendGrid Web API to: {} (Status: {})", toEmail, response.getStatusCode());
            } else {
                logger.error("❌ SendGrid API returned error status: {}", response.getStatusCode());
                logger.error("Response body: {}", response.getBody());
                throw new RuntimeException("SendGrid API failed with status: " + response.getStatusCode() + " - " + response.getBody());
            }

        } catch (IOException ex) {
            logger.error("❌ SendGrid Web API IOException", ex);
            throw new RuntimeException("SendGrid Web API network error: " + ex.getMessage(), ex);
        } catch (Exception e) {
            logger.error("❌ SendGrid Web API Error", e);
            throw new RuntimeException("Email service error: " + e.getMessage(), e);
        }
    }

    public boolean sendVerificationEmailSafe(String toEmail, String username, String verificationToken) {
        try {
            sendVerificationEmail(toEmail, username, verificationToken);
            return true;
        } catch (Exception e) {
            logger.error("Email sending failed for: {} - Error: {}", toEmail, e.getMessage());
            return false;
        }
    }
}