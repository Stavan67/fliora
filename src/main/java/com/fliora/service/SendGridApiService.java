package com.fliora.service;

import com.sendgrid.*;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.*;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import com.sendgrid.helpers.mail.objects.Personalization;
import com.sendgrid.helpers.mail.objects.MailSettings;
import com.sendgrid.helpers.mail.objects.TrackingSettings;
import com.sendgrid.helpers.mail.objects.ClickTrackingSetting;
import com.sendgrid.helpers.mail.objects.OpenTrackingSetting;

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

    @Value("${app.from-email:noreply@leopicks.com}")
    private String fromEmail;

    @Value("${app.from-name:Fliora Team}")
    private String fromName;

    public void sendVerificationEmail(String toEmail, String username, String verificationToken) {
        try {
            logger.info("=== SENDGRID WEB API EMAIL ATTEMPT ===");
            logger.info("To: {}", toEmail);
            logger.info("From: {} <{}>", fromName, fromEmail);
            logger.info("Username: {}", username);
            logger.info("API Key Present: {}", sendGridApiKey != null && sendGridApiKey.startsWith("SG."));
            logger.info("Base URL: {}", baseUrl);

            // Validate API key
            if (sendGridApiKey == null || !sendGridApiKey.startsWith("SG.")) {
                throw new RuntimeException("Invalid SendGrid API key configuration");
            }

            // Use both from-email and from-name
            Email from = new Email(fromEmail, fromName);
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

            Response response = sg.api(request);

            logger.info("SendGrid Response Status: {}", response.getStatusCode());
            logger.info("SendGrid Response Body: {}", response.getBody());
            logger.info("SendGrid Response Headers: {}", response.getHeaders());

        } catch (IOException ex) {
            logger.error("Error sending verification email: {}", ex.getMessage(), ex);
        }
    }
}
