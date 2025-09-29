package com.fliora.controller;

import com.fliora.entity.Room;
import com.fliora.entity.RoomParticipant;
import com.fliora.entity.User;
import com.fliora.service.RoomService;
import com.fliora.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {
    private final RoomService roomService;
    private final UserService userService;

    @Autowired
    public RoomController(RoomService roomService, UserService userService) {
        this.roomService = roomService;
        this.userService = userService;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createRoom(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        try {
            User user = getCurrentUser(httpRequest);
            String roomName = request.getOrDefault("roomName", user.getUsername() + "'s Room");
            Room room = roomService.createRoom(user, roomName);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Room created successfully");
            response.put("room", buildRoomResponse(room, user));

            return ResponseEntity.ok(response);
        } catch(Exception e){
            return buildErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/{roomCode}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String roomCode, HttpServletRequest httpRequest) {
        try{
            User user = getCurrentUser(httpRequest);
            Room room = roomService.joinRoom(roomCode, user);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Joined room successfully");
            response.put("room", buildRoomResponse(room, user));

            return ResponseEntity.ok(response);
        } catch(Exception e){
            return buildErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/{roomCode}/leave")
    public ResponseEntity<?> leaveRoom(@PathVariable String roomCode, HttpServletRequest httpRequest) {
        try{
            User user = getCurrentUser(httpRequest);
            roomService.leaveRoom(roomCode, user);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Left room successfully");

            return ResponseEntity.ok(response);
        } catch(Exception e){
            return buildErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/{roomCode}")
    public ResponseEntity<?> getRoomInfo(@PathVariable String roomCode, HttpServletRequest httpRequest) {
        try{
            User user = getCurrentUser(httpRequest);
            Room room = roomService.getRoomByCode(roomCode);
            Map<String,  Object> response = new HashMap<>();
            response.put("success", true);
            response.put("room", buildRoomResponse(room, user));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }
    @GetMapping("/{roomCode}/participants")
    public ResponseEntity<?> getRoomParticipants(@PathVariable String roomCode, HttpServletRequest httpRequest) {
        try {
            User user = getCurrentUser(httpRequest);

            // Verify user is in the room
            if (!roomService.isUserInRoom(roomCode, user)) {
                return buildErrorResponse("You are not in this room", HttpStatus.FORBIDDEN);
            }

            List<RoomParticipant> participants = roomService.getRoomParticipants(roomCode);
            List<Map<String, Object>> participantList = participants.stream()
                    .map(this::buildParticipantResponse)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("participants", participantList);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/{roomCode}/kick/{participantId}")
    public ResponseEntity<?> kickParticipant(@PathVariable String roomCode,
                                             @PathVariable Long participantId,
                                             HttpServletRequest httpRequest) {
        try {
            User hostUser = getCurrentUser(httpRequest);
            roomService.kickParticipant(roomCode, hostUser, participantId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Participant removed successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/{roomCode}/media")
    public ResponseEntity<?> updateMedia(@PathVariable String roomCode,
                                         @RequestBody Map<String, Boolean> mediaSettings,
                                         HttpServletRequest httpRequest) {
        try {
            User user = getCurrentUser(httpRequest);
            boolean videoEnabled = mediaSettings.getOrDefault("videoEnabled", true);
            boolean audioEnabled = mediaSettings.getOrDefault("audioEnabled", true);

            roomService.updateParticipantMedia(roomCode, user, videoEnabled, audioEnabled);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Media settings updated");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/{roomCode}/start")
    public ResponseEntity<?> startWatchParty(@PathVariable String roomCode, HttpServletRequest httpRequest) {
        try {
            User hostUser = getCurrentUser(httpRequest);
            roomService.startWatchParty(roomCode, hostUser);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Watch party started successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/{roomCode}/validate")
    public ResponseEntity<?> validateRoom(@PathVariable String roomCode) {
        try {
            Room room = roomService.getRoomByCode(roomCode);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("exists", true);
            response.put("status", room.getStatus().toString());
            response.put("isFull", room.isFull());
            response.put("participantCount", room.getActiveParticipantCount());
            response.put("maxParticipants", room.getMaxParticipants());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("exists", false);
            return ResponseEntity.ok(response);
        }
    }

    private User getCurrentUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            throw new RuntimeException("Please login to access this feature");
        }

        UUID userId = (UUID) session.getAttribute("userId");
        return userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Map<String, Object> buildRoomResponse(Room room, User currentUser) {
        Map<String, Object> roomData = new HashMap<>();
        roomData.put("id", room.getId());
        roomData.put("roomCode", room.getRoomCode());
        roomData.put("roomName", room.getRoomName());
        roomData.put("status", room.getStatus().toString());
        roomData.put("isHost", room.isHost(currentUser));
        roomData.put("hostUsername", room.getHostUser().getUsername());
        roomData.put("participantCount", room.getActiveParticipantCount());
        roomData.put("maxParticipants", room.getMaxParticipants());
        roomData.put("createdAt", room.getCreatedAt());
        roomData.put("shareUrl", buildShareUrl(room.getRoomCode()));

        return roomData;
    }

    private Map<String, Object> buildParticipantResponse(RoomParticipant participant) {
        Map<String, Object> participantData = new HashMap<>();
        participantData.put("id", participant.getUser().getId());
        participantData.put("username", participant.getUser().getUsername());
        participantData.put("isHost", participant.isHost());
        participantData.put("videoEnabled", participant.getVideoEnabled());
        participantData.put("audioEnabled", participant.getAudioEnabled());
        participantData.put("joinedAt", participant.getJoinedAt());
        participantData.put("status", participant.getStatus().toString());

        return participantData;
    }

    private String buildShareUrl(String roomCode) {
        return "https://leopicks.com/?room=" + roomCode;
    }

    private ResponseEntity<?> buildErrorResponse(String message, HttpStatus status) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return ResponseEntity.status(status).body(response);
    }
}
