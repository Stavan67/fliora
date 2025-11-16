package com.fliora.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.HashMap;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    public ChatController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat/{roomCode}")
    public void handleChatMessage(@DestinationVariable String roomCode, @Payload Map<String, Object> message) {
        try {
            String username = (String) message.get("username");
            String messageText = (String) message.get("message");
            String userId = (String) message.get("userId");

            System.out.println("Chat Message - Room: " + roomCode +
                    ", From: " + username +
                    ", Message: " + messageText);

            // Create response with timestamp
            Map<String, Object> chatMessage = new HashMap<>();
            chatMessage.put("id", System.currentTimeMillis());
            chatMessage.put("type", "user");
            chatMessage.put("username", username);
            chatMessage.put("message", messageText);
            chatMessage.put("timestamp", LocalDateTime.now().format(TIME_FORMATTER));
            chatMessage.put("userId", userId);

            // Broadcast to all participants in the room
            messagingTemplate.convertAndSend("/topic/chat/" + roomCode, chatMessage);
            System.out.println("✅ Chat message broadcasted to room " + roomCode);

        } catch (Exception e) {
            System.err.println("Error handling chat message: " + e.getMessage());
            e.printStackTrace();
        }
    }
}