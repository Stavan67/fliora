package com.fliora.service;

import com.fliora.dto.LoginDto;
import com.fliora.dto.UserRegistrationDto;
import com.fliora.entity.User;

import java.util.Optional;
import java.util.UUID;

public interface UserService {
    User registerUser(UserRegistrationDto registrationDto);
    User authenticateUser(LoginDto loginDto);
    boolean verifyEmail(String verificationToken);
    void resendVerificationEmail(String email);
    User findByUsername(String username);
    User findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    Optional<User> findById(UUID id);
}
