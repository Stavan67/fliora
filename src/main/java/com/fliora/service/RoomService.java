package com.fliora.service;

import com.fliora.entity.*;
import com.fliora.repository.RoomParticipantRepository;
import com.fliora.repository.RoomRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
@Transactional
public class RoomService {

    // Declare the fields first
    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserService userService;
    private final Random random = new Random();

    @Autowired
    public RoomService(RoomRepository roomRepository,
                       RoomParticipantRepository participantRepository,
                       SimpMessagingTemplate messagingTemplate,
                       UserService userService) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.messagingTemplate = messagingTemplate;
        this.userService = userService;
    }

    public Room createRoom(User hostUser, String roomName) {
        try {
            System.out.println("=== ROOM SERVICE CREATE ROOM ===");
            System.out.println("Host user: " + hostUser.getUsername() + " (ID: " + hostUser.getId() + ")");

            List<Room> activeRooms = roomRepository.findActiveRoomsByHost(hostUser);
            System.out.println("Active rooms found: " + activeRooms.size());

            if(!activeRooms.isEmpty()) {
                throw new RuntimeException("You already have an active room. Please end it before creating a new one.");
            }

            String roomCode = generateUniqueRoomCode();
            System.out.println("Generated room code: " + roomCode);

            Room room = new Room(roomCode, roomName, hostUser);
            System.out.println("Room entity created, saving to database...");

            room = roomRepository.save(room);
            System.out.println("Room saved with ID: " + room.getId());

            System.out.println("Creating host participant...");
            RoomParticipant hostParticipant = new RoomParticipant(room, hostUser, ParticipantRole.HOST);
            hostParticipant = participantRepository.save(hostParticipant);
            System.out.println("Host participant saved with ID: " + hostParticipant.getId());

            return room;
        } catch (Exception e) {
            System.err.println("=== ERROR IN ROOM SERVICE ===");
            System.err.println("Error type: " + e.getClass().getName());
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    public Room joinRoom(String roomCode, User user){
        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if(room.getStatus() == Room.RoomStatus.ENDED){
            throw new RuntimeException("This room has ended");
        }
        if(room.isFull()){
            throw new RuntimeException("Room is full");
        }

        Optional<RoomParticipant> existingParticipant = participantRepository.findByRoomAndUser(room, user);
        if(existingParticipant.isPresent()){
            RoomParticipant participant = existingParticipant.get();
            if(participant.getStatus() == ParticipantStatus.ACTIVE) {
                throw new RuntimeException("You are already in this room");
            }
            participant.setStatus(ParticipantStatus.ACTIVE);
            participant.setLeftAt(null);
            participantRepository.save(participant);
        } else {
            RoomParticipant participant = new RoomParticipant(room, user, ParticipantRole.PARTICIPANT);
            participantRepository.save(participant);
        }

        notifyRoomParticipants(room, "USER_JOINED", user.getUsername() + " joined the room");
        return room;
    }

    public void leaveRoom(String roomCode, User user){
        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        RoomParticipant participant = participantRepository.findByRoomAndUser(room, user)
                .orElseThrow(() -> new RuntimeException("You are not in this room"));

        participant.setStatus(ParticipantStatus.LEFT);
        participant.setLeftAt(LocalDateTime.now());
        participantRepository.save(participant);

        if(participant.isHost()) {
            endRoom(room);
        } else {
            notifyRoomParticipants(room, "USER_LEFT", user.getUsername() + " left the room");
        }
    }

    public void kickParticipant(String roomCode, User hostUser, UUID participantUserId) {
        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if(!room.isHost(hostUser)) {
            throw new RuntimeException("Only the host can kick participants");
        }

        // Fix: Get the user properly from database instead of creating empty user
        User participantUser = userService.findById(participantUserId)
                .orElseThrow(() -> new RuntimeException("Participant user not found"));

        RoomParticipant participant = participantRepository.findByRoomAndUser(room, participantUser)
                .orElseThrow(() -> new RuntimeException("Participant not found in room"));

        if(participant.isHost()) {
            throw new RuntimeException("Cannot kick the host");
        }

        participant.setStatus(ParticipantStatus.KICKED);
        participant.setLeftAt(LocalDateTime.now());
        participantRepository.save(participant);

        notifyRoomParticipants(room, "USER_KICKED", participant.getUser().getUsername() + " was removed from the room");
    }

    public void updateParticipantMedia(String roomCode, User user, boolean videoEnabled, boolean audioEnabled) {
        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        RoomParticipant participant = participantRepository.findByRoomAndUser(room, user)
                .orElseThrow(() -> new RuntimeException("You are not in this room"));

        participant.setVideoEnabled(videoEnabled);
        participant.setAudioEnabled(audioEnabled);
        participantRepository.save(participant);

        notifyRoomParticipants(room, "MEDIA_UPDATED", null);
    }

    public void startWatchParty(String roomCode, User hostUser) {
        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if(!room.isHost(hostUser)) {
            throw new RuntimeException("Only the host can start watch party");
        }

        room.setStatus(Room.RoomStatus.ACTIVE);
        roomRepository.save(room);
        notifyRoomParticipants(room, "WATCH_PARTY_STARTED", "Watch party has started!");
    }

    public Room getRoomByCode(String roomCode) {
        return roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found"));
    }

    public List<RoomParticipant> getRoomParticipants(String roomCode) {
        Room room = getRoomByCode(roomCode);
        return participantRepository.findActiveParticipantsByRoom(room);
    }

    public boolean isUserInRoom(String roomCode, User user) {
        try {
            Room room = getRoomByCode(roomCode);
            return participantRepository.existsByRoomAndUserAndStatus(room, user, ParticipantStatus.ACTIVE);
        } catch (Exception e) {
            return false;
        }
    }

    private String generateUniqueRoomCode() {
        String roomCode;
        do {
            roomCode = generateRandomCode();
        } while (roomRepository.existsByRoomCode(roomCode));
        return roomCode;
    }

    private String generateRandomCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder code = new StringBuilder();
        for(int i = 0; i < 8; i++) {
            code.append(chars.charAt(random.nextInt(chars.length())));
        }
        return code.toString();
    }

    private void endRoom(Room room) {
        room.setStatus(Room.RoomStatus.ENDED);
        room.setEndedAt(LocalDateTime.now());
        roomRepository.save(room);

        List<RoomParticipant> activeParticipants = participantRepository.findActiveParticipantsByRoom(room);
        for(RoomParticipant participant : activeParticipants) {
            participant.setStatus(ParticipantStatus.LEFT);
            participant.setLeftAt(LocalDateTime.now());
            participantRepository.save(participant);
        }

        notifyRoomParticipants(room, "ROOM_ENDED", "The room has been ended by the host");
    }

    private void notifyRoomParticipants(Room room, String type, String message) {
        try {
            String destination = "/topic/room/" + room.getRoomCode();
            messagingTemplate.convertAndSend(destination, new RoomNotification(type, message, LocalDateTime.now()));
        } catch(Exception e){
            System.err.println("Failed to send room notification: " + e.getMessage());
        }
    }

    @Scheduled(fixedRate = 1800000) // 30 minutes
    public void cleanupExpiredRooms(){
        LocalDateTime cutoffTime = LocalDateTime.now().minusDays(1);
        List<Room> expiredRooms = roomRepository.findExpiredRooms(cutoffTime);

        for(Room room : expiredRooms) {
            endRoom(room);
        }
    }

    public static class RoomNotification {
        private String type;
        private String message;
        private LocalDateTime timestamp;

        public RoomNotification(String type, String message, LocalDateTime timestamp) {
            this.type = type;
            this.message = message;
            this.timestamp = timestamp;
        }

        public String getType() {
            return type;
        }

        public String getMessage() {
            return message;
        }

        public LocalDateTime getTimestamp() {
            return timestamp;
        }
    }
}