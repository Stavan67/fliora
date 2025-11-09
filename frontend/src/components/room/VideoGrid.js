import React, { useRef, useEffect } from 'react';

const VideoGrid = ({
                       localStream,
                       remoteStreams,
                       participants,
                       currentUser,
                       videoEnabled,
                       audioEnabled,
                       isHost,
                       onKickParticipant
                   }) => {
    console.log('[VideoGrid] Rendering with:');
    console.log('  - Participants:', participants.map(p => ({ id: p.id, username: p.username })));
    console.log('  - Remote stream keys:', Array.from(remoteStreams.keys()));
    console.log('  - Current user:', currentUser.id);

    const totalParticipants = 1 + remoteStreams.size;

    // Create a map for quick participant lookup - ensure all IDs are strings
    const participantMap = new Map(
        participants.map(p => [String(p.id), p])
    );

    // Find current user's participant data for local video
    const currentUserParticipant = participantMap.get(String(currentUser.id));

    return (
        <div className="video-grid" data-participant-count={totalParticipants}>
            {/* Local video (current user) */}
            <div className="video-container local">
                {localStream && videoEnabled ? (
                    <video
                        ref={(el) => {
                            if (el && localStream) {
                                el.srcObject = localStream;
                            }
                        }}
                        autoPlay
                        muted
                        playsInline
                        className="video-element"
                    />
                ) : (
                    <div className="video-placeholder">
                        <div className="avatar-circle">
                            {currentUser.username?.[0]?.toUpperCase() || '?'}
                        </div>
                    </div>
                )}
                <div className="video-label">
                    {currentUser.username} (You)
                    {!videoEnabled && <span className="status-badge">🔹 Off</span>}
                    {!audioEnabled && <span className="status-badge">🔇 Muted</span>}
                </div>
            </div>

            {/* Remote videos - show all remote streams */}
            {Array.from(remoteStreams.entries()).map(([participantId, stream]) => {
                const participantIdStr = String(participantId);

                // Try to find participant info
                const participant = participantMap.get(participantIdStr);

                // Use participant data if available, otherwise show placeholder
                const displayName = participant?.username || `User ${participantIdStr.substring(0, 8)}`;
                const remoteVideoEnabled = participant?.videoEnabled ?? true;
                const remoteAudioEnabled = participant?.audioEnabled ?? true;
                const participantIsHost = participant?.isHost === true;

                console.log('[VideoGrid] Rendering remote video for:', participantIdStr, {
                    name: displayName,
                    hasParticipantData: !!participant,
                    videoEnabled: remoteVideoEnabled,
                    audioEnabled: remoteAudioEnabled
                });

                return (
                    <div key={participantIdStr} className="video-container remote">
                        {stream && remoteVideoEnabled ? (
                            <video
                                ref={(el) => {
                                    if (el && stream) {
                                        console.log('[VideoGrid] ✅ Setting stream for:', participantIdStr);
                                        el.srcObject = stream;
                                    }
                                }}
                                autoPlay
                                playsInline
                                className="video-element"
                            />
                        ) : (
                            <div className="video-placeholder">
                                <div className="avatar-circle">
                                    {displayName?.[0]?.toUpperCase() || '?'}
                                </div>
                            </div>
                        )}

                        <div className="video-label">
                            {displayName}
                            {participantIsHost && <span className="host-badge">👑</span>}
                            {!remoteVideoEnabled && <span className="status-badge">🔹</span>}
                            {!remoteAudioEnabled && <span className="status-badge">🔇</span>}
                        </div>

                        {/* Kick button for host - only show if we have participant data and it's not the current user */}
                        {isHost && participant && participantIdStr !== String(currentUser.id) && !participantIsHost && (
                            <button
                                className="kick-button"
                                onClick={() => onKickParticipant(participant.id)}
                                title={`Remove ${displayName}`}
                            >
                                ✖
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default VideoGrid;