package com.fliora.repository;

import com.fliora.entity.Room;
import com.fliora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByRoomCode(String roomCode);
    boolean existsByRoomCode(String roomCode);
    List<Room> findByHostUser(User hostUser);

    @Query("SELECT r FROM Room r WHERE r.hostUser = :user AND r.status IN ('WAITING', 'ACTIVE')")
    List<Room> findActiveRoomsByHost(@Param("user") User user);

    @Query("SELECT r FROM Room r WHERE r.status = 'WAITING' AND r.isPrivate = false")
    List<Room> findPublicWaitingRooms();

    @Query("SELECT r FROM Room r WHERE r.createdAt < :cutoffTime AND r.status = 'WAITING'")
    List<Room> findExpiredRooms(@Param("cutoffTime") LocalDateTime cutoffTime);

    @Query("SELECT COUNT(rp) FROM RoomParticipant rp WHERE rp.room = :room AND rp.status = 'ACTIVE'")
    int countActiveParticipants(@Param("room") Room room);
}
