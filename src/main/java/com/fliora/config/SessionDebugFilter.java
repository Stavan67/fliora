package com.fliora.config;

import jakarta.servlet.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(1)
public class SessionDebugFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String uri = httpRequest.getRequestURI();

        if (uri.contains("/api/rooms") || uri.contains("/api/auth/login")) {
            System.out.println("\n=== REQUEST: " + uri + " ===");

            // Check cookies
            Cookie[] cookies = httpRequest.getCookies();
            System.out.println("Cookies received: " + (cookies != null ? cookies.length : 0));
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    System.out.println("  - " + cookie.getName() + " = " + cookie.getValue().substring(0, Math.min(20, cookie.getValue().length())) + "...");
                }
            }

            // Check session
            HttpSession session = httpRequest.getSession(false);
            System.out.println("Session exists: " + (session != null));
            if (session != null) {
                System.out.println("Session ID: " + session.getId());
                System.out.println("UserId: " + session.getAttribute("userId"));
                System.out.println("Username: " + session.getAttribute("username"));
            }
        }

        chain.doFilter(request, response);
    }
}