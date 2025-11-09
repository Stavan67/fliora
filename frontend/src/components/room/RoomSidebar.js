import React, { useEffect, useRef } from 'react';

const RoomSidebar = ({
                         isOpen,
                         activeView,
                         onClose,
                         roomCode,
                         participants,
                         chatMessages,
                         chatInput,
                         onChatInputChange,
                         onSendMessage,
                         onCopyLink,
                         onShareWhatsApp
                     }) => {
    const chatMessagesRef = useRef(null);

    useEffect(() => {
        if (chatMessagesRef.current && activeView === 'chat') {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [chatMessages, activeView, isOpen]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
    };

    return (
        <div className={`room-sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <h2 className="sidebar-title">
                    {activeView === 'participants' ? 'Participants' : 'Chat'}
                </h2>
                <button className="sidebar-close-btn" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>

            <div className="sidebar-content">
                {activeView === 'participants' && (
                    <>
                        <div className="sidebar-section room-info-section">
                            <h3 className="section-title">Room Information</h3>
                            <div className="room-code-box">
                                <span className="room-code-label">Room Code:</span>
                                <span className="room-code-value">{roomCode}</span>
                            </div>
                            <div className="share-buttons">
                                <button className="share-button copy" onClick={onCopyLink}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"/>
                                    </svg>
                                    Copy Link
                                </button>
                                <button className="share-button whatsapp" onClick={onShareWhatsApp}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    WhatsApp
                                </button>
                            </div>
                        </div>

                        <div className="sidebar-section participants-section">
                            <h3 className="section-title">
                                Participants ({participants.length})
                            </h3>
                            <div className="participants-list">
                                {participants.map(participant => (
                                    <div key={participant.id} className="participant-item">
                                        <div className="participant-avatar">
                                            {participant.username[0].toUpperCase()}
                                        </div>
                                        <div className="participant-details">
                                            <span className="participant-username">
                                                {participant.username}
                                                {participant.isHost && (
                                                    <span className="host-badge-small">👑</span>
                                                )}
                                            </span>
                                            <div className="participant-media-status">
                                                {!participant.audioEnabled && (
                                                    <span className="status-indicator muted" title="Microphone off">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                            <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2"/>
                                                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" strokeWidth="2"/>
                                                        </svg>
                                                    </span>
                                                )}
                                                {!participant.videoEnabled && (
                                                    <span className="status-indicator video-off" title="Camera off">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" strokeWidth="2"/>
                                                            <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2"/>
                                                        </svg>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeView === 'chat' && (
                    <div className="sidebar-section chat-section">
                        <div className="chat-messages" ref={chatMessagesRef}>
                            {chatMessages.length === 0 ? (
                                <div className="chat-empty">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                chatMessages.map(msg => (
                                    <div key={msg.id} className={`chat-message ${msg.type}`}>
                                        {msg.type === 'system' ? (
                                            <div className="system-message">
                                                <span className="system-icon">ℹ️</span>
                                                <span className="message-content">{msg.message}</span>
                                            </div>
                                        ) : (
                                            <div className="user-message">
                                                <div className="message-header">
                                                    <span className="message-username">{msg.username}</span>
                                                    <span className="message-time">{msg.timestamp}</span>
                                                </div>
                                                <div className="message-content">{msg.message}</div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="chat-input-container">
                            <input
                                type="text"
                                className="chat-input"
                                value={chatInput}
                                onChange={(e) => onChatInputChange(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a message..."
                                maxLength={500}
                            />
                            <button
                                className="send-message-button"
                                onClick={onSendMessage}
                                disabled={!chatInput.trim()}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <line x1="22" y1="2" x2="11" y2="13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomSidebar;