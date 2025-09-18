package com.fliora.service.impl;

import com.fliora.dto.LoginDto;
import com.fliora.dto.UserRegistrationDto;
import com.fliora.entity.User;
import com.fliora.exception.*;
import com.fliora.repository.UserRepository;
import com.fliora.service.EmailService;
import com.fliora.service.UserService;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@Transactional
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Override
    public User registerUser(UserRegistrationDto registrationDto) {
        if(!registrationDto.getPassword().equals(registrationDto.getConfirmPassword())) {
            throw new PasswordMismatchException("Password do not match");
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

        User savedUser = userRepository.save(user);

        emailService.sendVerificationEmail(savedUser.getEmail(), savedUser.getUsername(), verificationToken);

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

        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), newVerificationToken);
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
