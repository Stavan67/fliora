package com.fliora.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "rooms")
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 8)
    private String roomCode;

    @Column(nullable = false)
    private String roomName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_user_id",  nullable = false)
    private User hostUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status = RoomStatus.WAITING;

    @Column(nullable = false)
    private Integer maxParticipants = 10;

    @Column(nullable = false)
    private Boolean isPrivate = false;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<RoomParticipant> participants = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    public Room() {}

    public Room(String roomCode, String roomName, User hostUser) {
        this.roomCode = roomCode;
        this.roomName = roomName;
        this.hostUser = hostUser;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getRoomName() {
        return roomName;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }

    public User getHostUser() {
        return hostUser;
    }

    public void setHostUser(User hostUser) {
        this.hostUser = hostUser;
    }

    public RoomStatus getStatus() {
        return status;
    }

    public void setStatus(RoomStatus status) {
        this.status = status;
    }

    public Integer getMaxParticipants() {
        return maxParticipants;
    }

    public void setMaxParticipants(Integer maxParticipants) {
        this.maxParticipants = maxParticipants;
    }

    public Boolean getPrivate() {
        return isPrivate;
    }

    public void setPrivate(Boolean aPrivate) {
        isPrivate = aPrivate;
    }

    public Set<RoomParticipant> getParticipants() {
        return participants;
    }

    public void setParticipants(Set<RoomParticipant> participants) {
        this.participants = participants;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public void addParticipant(RoomParticipant participant){
        participants.add(participant);
        participant.setRoom(this);
    }

    public void removeParticipant(RoomParticipant participant) {
        participants.remove(participant);
        participant.setRoom(null);
    }

    public int getActiveParticipantCount() {
        return (int) participants.stream()
                .filter(p -> p.getStatus() == ParticipantStatus.ACTIVE)
                .count();
    }

    public boolean isHost(User user){
        return hostUser.getId().equals(user.getId());
    }

    public boolean isFull() {
        return getActiveParticipantCount() >= maxParticipants;
    }

    public enum RoomStatus {
        WAITING,
        ACTIVE,
        ENDED,
        PAUSED
    }
}
