import React, { useRef, useEffect, memo } from 'react';

// Memoized individual video component to prevent unnecessary re-renders
const VideoElement = memo(({ stream, isLocal, videoEnabled }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            // Only update srcObject if it's actually different
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }
        }
    }, [stream]); // Only re-run if stream object changes

    if (!stream || !videoEnabled) {
        return null;
    }

    return (
        <video
            ref={videoRef}
            autoPlay
            muted={isLocal}
            playsInline
            className="video-element"
        />
    );
}, (prevProps, nextProps) => {
    // Custom comparison: only re-render if stream object or videoEnabled changes
    return prevProps.stream === nextProps.stream &&
        prevProps.videoEnabled === nextProps.videoEnabled;
});

VideoElement.displayName = 'VideoElement';

// Memoized local video container
const LocalVideoContainer = memo(({
                                      localStream,
                                      currentUser,
                                      videoEnabled,
                                      audioEnabled
                                  }) => {
    return (
        <div className="video-container local">
            {localStream && videoEnabled ? (
                <VideoElement
                    stream={localStream}
                    isLocal={true}
                    videoEnabled={videoEnabled}
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
                {!videoEnabled && <span className="status-badge">📹 Off</span>}
                {!audioEnabled && <span className="status-badge">🔇 Muted</span>}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return prevProps.localStream === nextProps.localStream &&
        prevProps.videoEnabled === nextProps.videoEnabled &&
        prevProps.audioEnabled === nextProps.audioEnabled;
});

LocalVideoContainer.displayName = 'LocalVideoContainer';

// Memoized remote video container
const RemoteVideoContainer = memo(({
                                       participantId,
                                       stream,
                                       participant,
                                       currentUser,
                                       isHost,
                                       onKickParticipant
                                   }) => {
    const displayName = participant?.username || `User ${participantId.substring(0, 8)}`;
    const remoteVideoEnabled = participant?.videoEnabled ?? true;
    const remoteAudioEnabled = participant?.audioEnabled ?? true;
    const participantIsHost = participant?.isHost === true;

    return (
        <div className="video-container remote">
            {stream && remoteVideoEnabled ? (
                <VideoElement
                    stream={stream}
                    isLocal={false}
                    videoEnabled={remoteVideoEnabled}
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
                {!remoteVideoEnabled && <span className="status-badge">📹</span>}
                {!remoteAudioEnabled && <span className="status-badge">🔇</span>}
            </div>

            {isHost && participant && participantId !== String(currentUser.id) && !participantIsHost && (
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
}, (prevProps, nextProps) => {
    // Only re-render if essential props change
    return prevProps.stream === nextProps.stream &&
        prevProps.participant?.videoEnabled === nextProps.participant?.videoEnabled &&
        prevProps.participant?.audioEnabled === nextProps.participant?.audioEnabled &&
        prevProps.participant?.username === nextProps.participant?.username &&
        prevProps.isHost === nextProps.isHost;
});

RemoteVideoContainer.displayName = 'RemoteVideoContainer';

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
    const totalParticipants = 1 + remoteStreams.size;

    // Create a stable participant map using useMemo
    const participantMap = React.useMemo(() =>
            new Map(participants.map(p => [String(p.id), p])),
        [participants]
    );

    // Convert remoteStreams to array for stable iteration
    const remoteStreamArray = React.useMemo(() =>
            Array.from(remoteStreams.entries()),
        [remoteStreams]
    );

    return (
        <div className="video-grid" data-participant-count={totalParticipants}>
            <LocalVideoContainer
                localStream={localStream}
                currentUser={currentUser}
                videoEnabled={videoEnabled}
                audioEnabled={audioEnabled}
            />

            {remoteStreamArray.map(([participantId, stream]) => {
                const participantIdStr = String(participantId);
                const participant = participantMap.get(participantIdStr);

                return (
                    <RemoteVideoContainer
                        key={participantIdStr}
                        participantId={participantIdStr}
                        stream={stream}
                        participant={participant}
                        currentUser={currentUser}
                        isHost={isHost}
                        onKickParticipant={onKickParticipant}
                    />
                );
            })}
        </div>
    );
};

// Memoize the entire VideoGrid component
export default memo(VideoGrid, (prevProps, nextProps) => {
    // Deep comparison for the props that matter
    const streamsEqual = prevProps.remoteStreams === nextProps.remoteStreams;
    const localStreamEqual = prevProps.localStream === nextProps.localStream;
    const videoEqual = prevProps.videoEnabled === nextProps.videoEnabled;
    const audioEqual = prevProps.audioEnabled === nextProps.audioEnabled;

    // For participants, do a shallow comparison of the array
    const participantsEqual = prevProps.participants.length === nextProps.participants.length &&
        prevProps.participants.every((p, i) => {
            const nextP = nextProps.participants[i];
            return p.id === nextP.id &&
                p.videoEnabled === nextP.videoEnabled &&
                p.audioEnabled === nextP.audioEnabled &&
                p.username === nextP.username;
        });

    return streamsEqual && localStreamEqual && videoEqual && audioEqual && participantsEqual;
});