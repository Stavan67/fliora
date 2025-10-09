import React, { useRef, useEffect } from 'react';

const VideoTile = ({ stream, participant, isLocal, isHost, onKick, showKickButton }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const videoEnabled = participant?.videoEnabled ?? true;
    const audioEnabled = participant?.audioEnabled ?? true;
    const displayName = isLocal ? `${participant?.username} (You)` : participant?.username;

    return (
        <div className="video-tile">
            {stream && videoEnabled ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="video-element"
                />
            ) : (
                <div className="video-placeholder">
                    <div className="avatar-circle">
                        {participant?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                </div>
            )}

            <div className="video-overlay">
                <div className="participant-info">
                    <span className="participant-name">
                        {displayName}
                        {participant?.isHost && <span className="host-badge">👑</span>}
                    </span>
                    {!audioEnabled && (
                        <span className="status-icon muted">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2"/>
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="12" y1="19" x2="12" y2="23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="8" y1="23" x2="16" y2="23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                    )}
                </div>

                {showKickButton && !participant?.isHost && !isLocal && (
                    <button
                        className="kick-participant-btn"
                        onClick={() => onKick(participant.id)}
                        title="Remove participant"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

// If your VideoGrid.js looks something like this, here's the fix:

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
    const participantMap = new Map(
        participants.map(p => [String(p.id), p])
    );

    return (
        <div className="video-grid" data-participant-count={totalParticipants}>
            {/* Local video (current user) */}
            <div className="video-container local">
                <video
                    ref={(el) => {
                        if (el && localStream) {
                            el.srcObject = localStream;
                        }
                    }}
                    autoPlay
                    muted
                    playsInline
                />
                <div className="video-label">
                    {currentUser.username} (You)
                    {!videoEnabled && <span className="status-badge">📹 Off</span>}
                    {!audioEnabled && <span className="status-badge">🔇 Muted</span>}
                </div>
            </div>

            {/* Remote videos - show all remote streams */}
            {Array.from(remoteStreams.entries()).map(([participantId, stream]) => {
                const participantIdStr = String(participantId);

                // ✅ Try to find participant info, use placeholder if not found yet
                const participant = participantMap.get(participantIdStr);
                const displayName = participant ? participant.username : `User ${participantIdStr.substring(0, 8)}`;

                console.log('[VideoGrid] Rendering remote video for:', participantIdStr, 'name:', displayName);

                return (
                    <div key={participantIdStr} className="video-container remote">
                        <video
                            ref={(el) => {
                                if (el && stream) {
                                    console.log('[VideoGrid] Setting stream for:', participantIdStr);
                                    el.srcObject = stream;
                                }
                            }}
                            autoPlay
                            playsInline
                        />
                        <div className="video-label">
                            {displayName}
                            {participant && !participant.videoEnabled && (
                                <span className="status-badge">📹 Off</span>
                            )}
                            {participant && !participant.audioEnabled && (
                                <span className="status-badge">🔇 Muted</span>
                            )}
                        </div>

                        {/* Kick button for host */}
                        {isHost && participant && participantIdStr !== String(currentUser.id) && (
                            <button
                                className="kick-button"
                                onClick={() => onKickParticipant(participantIdStr)}
                                title="Remove participant"
                            >
                                ❌
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default VideoGrid;