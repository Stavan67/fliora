package com.fliora.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Set;

@Component
@Order(1)
public class SecurityPathFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(SecurityPathFilter.class);

    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            ".php", ".asp", ".aspx", ".jsp", ".cgi", ".pl", ".py", ".sh", ".bat"
    );

    private static final Set<String> BLOCKED_PATTERNS = Set.of(
            "wp-admin", "wp-content", "wp-includes", "wordpress",
            "phpmyadmin", "pma", "myadmin", "mysql",
            "admin.php", "config.php", "setup.php",
            "xmlrpc.php", "wp-login.php"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI().toLowerCase();
        String method = httpRequest.getMethod();

        for (String ext : BLOCKED_EXTENSIONS) {
            if (path.endsWith(ext)) {
                logger.warn("Blocked malicious request: {} {} from {}",
                        method, path, httpRequest.getRemoteAddr());
                httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
        }

        for (String pattern : BLOCKED_PATTERNS) {
            if (path.contains(pattern)) {
                logger.warn("Blocked suspicious path: {} {} from {}",
                        method, path, httpRequest.getRemoteAddr());
                httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
        }

        chain.doFilter(request, response);
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        logger.info("SecurityPathFilter initialized - protecting against exploit attempts");
    }

    @Override
    public void destroy() {
        logger.info("SecurityPathFilter destroyed");
    }
}