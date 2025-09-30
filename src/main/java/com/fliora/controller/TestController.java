package com.fliora.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/session")
    public Map<String, Object> testSession(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        HttpSession session = request.getSession(false);

        response.put("hasSession", session != null);
        if (session != null) {
            response.put("sessionId", session.getId());
            response.put("userId", session.getAttribute("userId"));
            response.put("username", session.getAttribute("username"));
        }

        return response;
    }
}