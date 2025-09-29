package com.fliora.repository;

import com.fliora.entity.ParticipantStatus;
import com.fliora.entity.Room;
import com.fliora.entity.RoomParticipant;
import com.fliora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, Long> {
    Optional<RoomParticipant> findByRoomAndUser(Room room, User user);
    List<RoomParticipant> findByRoomAndStatus(Room room, ParticipantStatus status);

    @Query("SELECT rp FROM RoomParticipant rp WHERE rp.room = :room AND rp.status = 'ACTIVE'")
    List<RoomParticipant> findActiveParticipantsByRoom(@Param("room") Room room);

    @Query("SELECT rp FROM RoomParticipant rp WHERE rp.user = :user AND rp.status = 'ACTIVE'")
    List<RoomParticipant> findActiveRoomsByUser(@Param("user") User user);

    boolean existsByRoomAndUserAndStatus(Room room, User user, ParticipantStatus status);

    @Query("SELECT COUNT(rp) FROM RoomParticipant rp WHERE rp.room = :room AND rp.status = 'ACTIVE'")
    int countActiveParticipants(@Param("room") Room room);

    void deleteByRoomAndUser(Room room, User user);
}
