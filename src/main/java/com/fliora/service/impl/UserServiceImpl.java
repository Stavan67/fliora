package com.fliora.service.impl;

import com.fliora.dto.LoginDto;
import com.fliora.dto.UserRegistrationDto;
import com.fliora.entity.User;
import com.fliora.exception.*;
import com.fliora.repository.UserRepository;
import com.fliora.service.SendGridApiService;
import com.fliora.service.UserService;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class UserServiceImpl implements UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SendGridApiService sendGridApiService;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           SendGridApiService sendGridApiService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.sendGridApiService = sendGridApiService;
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

        // Try to send email using SendGrid Web API (SMTP doesn't work on Railway)
        try {
            logger.info("Attempting to send verification email via SendGrid Web API...");
            sendGridApiService.sendVerificationEmail(savedUser.getEmail(), savedUser.getUsername(), verificationToken);
            logger.info("Verification email sent successfully via SendGrid Web API to: {}", savedUser.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send verification email to: {} - Error: {}", savedUser.getEmail(), e.getMessage(), e);
            // CRITICAL: Do NOT throw any exception here
            // Registration must succeed even if email fails
            logger.warn("Registration completed but email sending failed. User can request email resend later.");
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

        // For resend, we can throw exception since user explicitly requested email
        try {
            sendGridApiService.sendVerificationEmail(user.getEmail(), user.getUsername(), newVerificationToken);
            logger.info("Verification email resent successfully via SendGrid Web API to: {}", email);
        } catch (Exception e) {
            logger.error("Failed to resend verification email to: {}", email, e);
            throw new RuntimeException("Failed to send verification email. Please try again later.");
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

    @Override
    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }
}