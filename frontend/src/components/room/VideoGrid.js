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
    const getGridClass = () => {
        const totalParticipants = participants.length;
        if (totalParticipants === 1) return 'grid-1';
        if (totalParticipants === 2) return 'grid-2';
        if (totalParticipants <= 4) return 'grid-4';
        if (totalParticipants <= 6) return 'grid-6';
        if (totalParticipants <= 9) return 'grid-9';
        return 'grid-many';
    };

    const currentParticipant = participants.find(p => p.id === currentUser.id);

    return (
        <div className={`video-grid ${getGridClass()}`}>
            {/* Local video */}
            <VideoTile
                stream={localStream}
                participant={{
                    ...currentParticipant,
                    username: currentUser.username,
                    videoEnabled: videoEnabled,
                    audioEnabled: audioEnabled
                }}
                isLocal={true}
                isHost={isHost}
            />

            {/* Remote videos */}
            {participants
                .filter(p => p.id !== currentUser.id)
                .map(participant => (
                    <VideoTile
                        key={participant.id}
                        stream={remoteStreams.get(participant.id)}
                        participant={participant}
                        isLocal={false}
                        isHost={isHost}
                        onKick={onKickParticipant}
                        showKickButton={isHost}
                    />
                ))
            }
        </div>
    );
};

export default VideoGrid;