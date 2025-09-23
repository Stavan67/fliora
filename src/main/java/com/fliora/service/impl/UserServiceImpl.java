package com.fliora.service.impl;

import com.fliora.dto.LoginDto;
import com.fliora.dto.UserRegistrationDto;
import com.fliora.entity.User;
import com.fliora.exception.*;
import com.fliora.repository.UserRepository;
import com.fliora.service.EmailService;
import com.fliora.service.SendGridWebApiService;
import com.fliora.service.UserService;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@Transactional
public class UserServiceImpl implements UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService; // SMTP fallback
    private final SendGridWebApiService sendGridWebApiService; // Web API (primary)

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           EmailService emailService, SendGridWebApiService sendGridWebApiService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.sendGridWebApiService = sendGridWebApiService;
    }

    @Override
    public User registerUser(UserRegistrationDto registrationDto) {
        if(!registrationDto.getPassword().equals(registrationDto.getConfirmPassword())) {
            throw new PasswordMismatchException("Passwords do not match");
        }
        if(userRepository.existsByUsername(registrationDto.getUsername())) {
            throw new UsernameAlreadyExistsException("Username already exists");
        }
        if(userRepository.existsByEmail(registrationDto.getEmail())) {
            throw new EmailAlreadyExistsException("Email already exists");
        }

        User user = new User();
        user.setUsername(registrationDto.getUsername());
        user.setEmail(registrationDto.getEmail());
        user.setPassword(passwordEncoder.encode(registrationDto.getPassword()));
        user.setEmailVerified(false);

        String verificationToken = UUID.randomUUID().toString();
        user.setVerificationToken(verificationToken);

        // Save user first - this MUST succeed
        User savedUser = userRepository.save(user);
        logger.info("User saved successfully with ID: {}", savedUser.getId());

        // Try to send email but NEVER let it fail the registration
        try {
            logger.info("Attempting to send verification email via SendGrid Web API...");
            sendGridWebApiService.sendVerificationEmail(savedUser.getEmail(), savedUser.getUsername(), verificationToken);
            logger.info("Verification email sent successfully via Web API to: {}", savedUser.getEmail());
        } catch (Exception webApiError) {
            logger.warn("SendGrid Web API failed, trying SMTP fallback: {}", webApiError.getMessage());

            try {
                emailService.sendVerificationEmail(savedUser.getEmail(), savedUser.getUsername(), verificationToken);
                logger.info("Verification email sent successfully via SMTP to: {}", savedUser.getEmail());
            } catch (Exception smtpError) {
                logger.error("Both Web API and SMTP failed for email: {} - WebAPI: {}, SMTP: {}",
                        savedUser.getEmail(), webApiError.getMessage(), smtpError.getMessage());
                // CRITICAL: Do NOT throw any exception here
                // Registration must succeed even if email fails
            }
        }

        return savedUser;
    }

    @Override
    public User authenticateUser(LoginDto loginDto) {
        User user = userRepository.findByUsername(loginDto.getUsernameOrEmail())
                .or(() -> userRepository.findByEmail(loginDto.getUsernameOrEmail()))
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if(!user.isEmailVerified()) {
            throw new EmailNotVerifiedException("Please verify your email before logging in");
        }

        if(!passwordEncoder.matches(loginDto.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid password");
        }

        return user;
    }

    @Override
    public boolean verifyEmail(String verificationToken) {
        User user = userRepository.findByVerificationToken(verificationToken)
                .orElseThrow(() -> new UserNotFoundException("Invalid verification token"));

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);

        logger.info("Email verified successfully for user: {}", user.getUsername());
        return true;
    }

    @Override
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));

        if(user.isEmailVerified()) {
            throw new IllegalStateException("Email is already verified");
        }

        String newVerificationToken = UUID.randomUUID().toString();
        user.setVerificationToken(newVerificationToken);
        userRepository.save(user);

        // For resend, try Web API first, then SMTP
        try {
            sendGridWebApiService.sendVerificationEmail(user.getEmail(), user.getUsername(), newVerificationToken);
            logger.info("Verification email resent successfully via Web API to: {}", email);
        } catch (Exception webApiError) {
            logger.warn("Web API failed for resend, trying SMTP: {}", webApiError.getMessage());

            try {
                emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), newVerificationToken);
                logger.info("Verification email resent successfully via SMTP to: {}", email);
            } catch (Exception smtpError) {
                logger.error("Both Web API and SMTP failed for resend to: {}", email);
                throw new RuntimeException("Failed to send verification email. Please try again later.");
            }
        }
    }

    @Override
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found with username: " + username));
    }

    @Override
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}