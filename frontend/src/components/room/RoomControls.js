import React from 'react';

const RoomControls = ({
                          videoEnabled,
                          audioEnabled,
                          onToggleVideo,
                          onToggleAudio,
                          isHost,
                          onStartWatchParty,
                          loading
                      }) => {
    return (
        <div className="room-controls-container">
            <div className="media-controls">
                <button
                    className={`control-button ${!audioEnabled ? 'disabled' : ''}`}
                    onClick={onToggleAudio}
                    title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                    {audioEnabled ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="19" x2="12" y2="23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="8" y1="23" x2="16" y2="23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="19" x2="12" y2="23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="8" y1="23" x2="16" y2="23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                    <span className="control-label">
                        {audioEnabled ? 'Mute' : 'Unmute'}
                    </span>
                </button>

                <button
                    className={`control-button ${!videoEnabled ? 'disabled' : ''}`}
                    onClick={onToggleVideo}
                    title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                    {videoEnabled ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polygon points="23 7 16 12 23 17 23 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                    <span className="control-label">
                        {videoEnabled ? 'Stop Video' : 'Start Video'}
                    </span>
                </button>
            </div>

            {isHost && (
                <div className="host-actions">
                    <button
                        className="start-party-button"
                        onClick={onStartWatchParty}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Starting...
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                                Start Watch Party
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default RoomControls;