package com.fliora.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class WebRTCSignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    public WebRTCSignalingController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/signal/{roomCode}")
    public void handleSignaling(@DestinationVariable String roomCode, @Payload Map<String, Object> message) {
        try {
            String type = (String) message.get("type");

            // Log the signaling message
            System.out.println("WebRTC Signaling - Room: " + roomCode + ", Type: " + type);

            // Broadcast the signaling message to all participants in the room
            messagingTemplate.convertAndSend("/topic/signal/" + roomCode, message);

        } catch (Exception e) {
            System.err.println("Error handling WebRTC signaling: " + e.getMessage());
            e.printStackTrace();
        }
    }
}