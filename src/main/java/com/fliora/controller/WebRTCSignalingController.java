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
            String from = (String) message.get("from");

            // Log the signaling message
            System.out.println("WebRTC Signaling - Room: " + roomCode + ", Type: " + type + ", From: " + from);

            // For join messages, broadcast to all participants
            // For targeted messages (offer/answer/ice-candidate), only send to the 'to' recipient
            if ("join".equals(type)) {
                // Broadcast join to everyone in the room so ALL existing participants can initiate connections
                messagingTemplate.convertAndSend("/topic/signal/" + roomCode, message);
            } else {
                // For other signaling messages, broadcast to the room
                // The client-side filtering will handle who processes the message
                messagingTemplate.convertAndSend("/topic/signal/" + roomCode, message);
            }

        } catch (Exception e) {
            System.err.println("Error handling WebRTC signaling: " + e.getMessage());
            e.printStackTrace();
        }
    }
}