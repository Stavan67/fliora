package com.fliora.controller;

import com.fliora.dto.LoginDto;
import com.fliora.dto.UserRegistrationDto;
import com.fliora.entity.User;
import com.fliora.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService userService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody UserRegistrationDto registrationDto) {
        try {
            User user = userService.registerUser(registrationDto);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Registration successful! Please check your email to verify your account.");
            response.put("userId", user.getId());
            response.put("username", user.getUsername());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@Valid @RequestBody LoginDto loginDto, HttpServletRequest request) {
        try {
            User user = userService.authenticateUser(loginDto);

            HttpSession session = request.getSession(true);
            session.setAttribute("userId", user.getId());
            session.setAttribute("username", user.getUsername());
            session.setMaxInactiveInterval(30*60);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("user", Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "emailVerified", user.isEmailVerified()
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if(session != null) {
            session.invalidate();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Logout successful");

        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        try {
            boolean verified = userService.verifyEmail(token);

            if(verified) {
                String htmlResponse = String.format("""
                        <html>
                        <head>
                            <title>Email Verified</title>
                            <style>
                                body { 
                                    font-family: Arial, sans-serif; 
                                    text-align: center; 
                                    margin-top: 50px;
                                    background-color: #f5f5f5;
                                }
                                .container {
                                    max-width: 500px;
                                    margin: 0 auto;
                                    background: white;
                                    padding: 40px;
                                    border-radius: 10px;
                                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                }
                                h2 { color: #28a745; margin-bottom: 20px; }
                                p { color: #666; margin-bottom: 30px; line-height: 1.5; }
                                .btn {
                                    display: inline-block;
                                    padding: 12px 30px;
                                    background-color: #007bff;
                                    color: white;
                                    text-decoration: none;
                                    border-radius: 5px;
                                    font-weight: bold;
                                    transition: background-color 0.3s;
                                }
                                .btn:hover { background-color: #0056b3; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h2>Email Verified Successfully!</h2>
                                <p>Your email has been verified successfully. You can now log in to your Fliora account.</p>
                                <a href="%s/login" class="btn">Go to Login</a>
                            </div>
                        </body>
                        </html>
                        """, frontendUrl);
                return ResponseEntity.ok().header("Content-Type", "text/html").body(htmlResponse);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Email verification failed");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        } catch (Exception e) {
            String htmlResponse = String.format("""
                    <html>
                    <head>
                        <title>Verification Failed</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                text-align: center; 
                                margin-top: 50px;
                                background-color: #f5f5f5;
                            }
                            .container {
                                max-width: 500px;
                                margin: 0 auto;
                                background: white;
                                padding: 40px;
                                border-radius: 10px;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            }
                            h2 { color: #dc3545; margin-bottom: 20px; }
                            p { color: #666; margin-bottom: 30px; line-height: 1.5; }
                            .btn {
                                display: inline-block;
                                padding: 12px 30px;
                                background-color: #007bff;
                                color: white;
                                text-decoration: none;
                                border-radius: 5px;
                                font-weight: bold;
                                transition: background-color 0.3s;
                            }
                            .btn:hover { background-color: #0056b3; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h2>Email Verification Failed</h2>
                            <p>%s</p>
                            <a href="%s/register" class="btn">Go to Registration</a>
                        </div>
                    </body>
                    </html>
                    """, e.getMessage(), frontendUrl);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .header("Content-Type", "text/html")
                    .body(htmlResponse);
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerificationEmail(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            userService.resendVerificationEmail(email);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Verification email sent successfully");

            return ResponseEntity.ok(response);
        } catch(Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/session")
    public ResponseEntity<?> getSessionInfo(HttpServletRequest request) {
        HttpSession session = request.getSession(false);

        if(session == null || session.getAttribute("userId") == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("authenticated", false);
            response.put("message", "No active session");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("authenticated", true);
        response.put("userId", session.getAttribute("userId"));
        response.put("username", session.getAttribute("username"));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/check-availability")
    public ResponseEntity<?> checkAvailability(@RequestParam String type, @RequestParam String value) {
        Map<String, Object> response = new HashMap<>();

        try {
            boolean exists = false;
            if("username".equals(type)) {
                exists = userService.existsByUsername(value);
            } else if("email".equals(type)) {
                exists = userService.existsByEmail(value);
            }
            response.put("available", !exists);
            response.put("exists", exists);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Failed to check availability");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}