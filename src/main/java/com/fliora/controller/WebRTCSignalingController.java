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
            String to = (String) message.get("to");

            System.out.println("WebRTC Signaling - Room: " + roomCode +
                    ", Type: " + type +
                    ", From: " + from +
                    ", To: " + to);

            // Handle different message types
            switch (type) {
                case "join":
                    // Broadcast join to all participants so they know someone new arrived
                    // This tells existing users to initiate connections
                    messagingTemplate.convertAndSend("/topic/signal/" + roomCode, message);
                    System.out.println("Broadcasting JOIN from " + from + " to room " + roomCode);
                    break;

                case "offer":
                case "answer":
                case "ice-candidate":
                    // Send targeted messages only to the specific recipient
                    if (to == null || to.isEmpty()) {
                        System.err.println("ERROR: No 'to' field in " + type + " message from " + from);
                        return;
                    }

                    // Send to specific user's personal topic
                    String destination = "/topic/signal/" + roomCode + "/" + to;
                    messagingTemplate.convertAndSend(destination, message);
                    System.out.println("Sending " + type + " from " + from + " to " + to + " via " + destination);
                    break;

                case "leave":
                    // Broadcast leave so everyone knows this user left
                    messagingTemplate.convertAndSend("/topic/signal/" + roomCode, message);
                    System.out.println("Broadcasting LEAVE from " + from + " to room " + roomCode);
                    break;

                default:
                    System.err.println("Unknown message type: " + type);
            }

        } catch (Exception e) {
            System.err.println("Error handling WebRTC signaling: " + e.getMessage());
            e.printStackTrace();
        }
    }
}