package com.fliora.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final Environment env;

    public SecurityConfig(Environment env) {
        this.env = env;
    }

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers("/api/auth/**").permitAll();
                    auth.requestMatchers("/api/public/**").permitAll();
                    auth.requestMatchers("/actuator/health").permitAll();
                    auth.requestMatchers("/static/**", "/", "/index.html", "/*.js", "/*.css", "/*.ico", "/*.png", "/*.jpg", "/*.jpeg", "/*.gif", "/*.svg").permitAll();
                    auth.anyRequest().authenticated();
                })
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Check if we're in production by looking for production indicators
        String railwayDomain = env.getProperty("RAILWAY_PUBLIC_DOMAIN");
        boolean isProduction = railwayDomain != null ||
                env.getProperty("RAILWAY_ENVIRONMENT") != null ||
                "production".equals(env.getProperty("SPRING_PROFILES_ACTIVE"));

        if (isProduction) {
            // Production on Railway/leopicks.com
            configuration.setAllowedOrigins(Arrays.asList(
                    "https://leopicks.com",
                    "https://www.leopicks.com"
            ));

            // Add Railway domain if it's different
            if (railwayDomain != null && !railwayDomain.contains("leopicks.com")) {
                configuration.addAllowedOrigin("https://" + railwayDomain);
            }
        } else {
            // Local development
            configuration.setAllowedOrigins(Arrays.asList(
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "http://127.0.0.1:3000"
            ));
        }

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L); // Cache preflight for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}