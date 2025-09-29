import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import '../../styles/Dashboard.css';

const Dashboard = ({user, onLogout }) => {
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'waiting-room'
    const [roomData, setRoomData] = useState(null);
    const [joinRoomCode, setJoinRoomCode] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [localStream, setLocalStream] = useState(null);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const localVideoRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const inviteRoomCode = urlParams.get('room');
        if(inviteRoomCode) {
            setJoinRoomCode(inviteRoomCode);
            validateAndJoinRoom(inviteRoomCode);
        }
    }, [location]);

    useEffect(() => {
        if(currentView === 'waiting-room') {
            intializeMedia();
            connectWebSocket();
        }
        return () => {
            if(localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if(stompClient) {
                stompClient.disconnect();
            }
        };
    }, [currentView]);

    const connectWebSoocket = () => {
        if(!roomData) return;

        const socket = new SockJS('/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            onconnect: () => {
                console.log('Connected to WebSocket');

                client.subscribe(`/topic/room/${roomData.roomCode}`, (message) => {
                    const notification = JSON.parse(message.body);
                    handleRoomNotification(notification);
                });
            },
            onDisconnect: () => {
                console.log('Disconnected from WebSocket');
            },
            onStompError: (error) => {
                console.error('WebSocket error:', error);
            }
        });
        client.activate();
        setStompClient(client);
    };

    const handleRoomNotification = (notification) => {
        const { type, message, timestamp } = notification;
        switch (type) {
            case 'USER_JOINED':
            case 'USER_LEFT':
            case 'USER_KICKED':
                refreshParticipants();
                addSystemMessage(message);
                break;
            case 'MEDIA_UPDATED':
                refreshParticipants();
                break;
            case 'WATCH_PARTY_STARTED':
                addSystemMessage(message);
                break;
            case 'ROOM_ENDED':
                addSystemMessage(message);
                setTimeout(() => goBackToDashboard(), 3000);
                break;
            default:
                break;
        }
    };

    const addSystemMessage = (message) => {
        setChatMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setLocalStream(stream);
            if(localVideoRef.current){
                localVideoRef.current.srcObject = stream;
            }
        } catch(err) {
            console.error('Error accessing media devices:', err);
            setError('Failed to access camera/microphone. Please check permissions.');
        }
    };

    const validateAndJoinRoom = async (code) => {
        try {
            setLoading(true);

            const validationResponse = await apiClient.get(`/api/rooms/${code}/validate`);
            if(!validationResponse.data.exists){
                setError('Room not found. Please check the room code.');
                return;
            }
            if(validationResponse.data.isFull){
                setError('Room is full. Cannot join.');
                return;
            }
            await handleJoinRoom(code);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join roo,');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async () => {
        setLoading(true);
        try {
            const response = await apiClient.post('/api/rooms/create', {
                roomName: `${user.username}'s Room`
            });
            const room = response.data.room;
            setRoomData(room);
            setIsHost(room.isHost);
            setCurrentView('waiting-room');

            await loadParticipants(room.roomCode);
            addSystemMessage(`Room ${room.roomCode} created successfully! Share the link to invite friends.`);
        } catch(err){
            setError(err.response?.data?.message || 'Failed to create room. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (code = joinRoomCode) => {
        if(!code.trim()) {
            setError('Please enter a room code');
            return;
        }
        setLoading(true);
        try {
            const response = await apiClient.post(`/api/rooms/${code}/join`);
            const room = response.data.room;
            setRoomData(room);
            setIsHost(room.isHost);
            setCurrentView('waiting-room');

            await loadParticipants(room.roomCode);
            addSystemMessage(`Welcome to ${room.roomName}!`);
        }  catch(err) {
            setError(err.response?.data?.message || 'Failed to join room. Please check the room code.')
        } finally {
            setLoading(false);
        }
    };

    const loadParticipants = async (roomCode) => {
        try {
            const response = await apiClient.get(`/api/rooms/${roomCode}/participants`);
            setParticipants(response.data.participants);
        } catch(err) {
            console.error('Failed to load participants:', err);
        }
    };

    const refreshParticipants = async () => {
        if(roomData) {
            await loadParticipants(roomData.roomCode);
        }
    };

    const toggleVideo = async () => {
        if(localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if(videoTrack){
                videoTrack.enabled = !videoEnabled;
                setVideoEnabled(!videoEnabled);

                try {
                    await apiClient.post(`/api/rooms/${roomData.roomCode}/media`, {
                        videoEnabled: !videoEnabled,
                        audioEnabled: audioEnabled
                    });
                } catch (err){
                    console.error('Failed to update video status:', err);
                }
            }
        }
    };

    const toggleAudio = async () => {
        if(localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if(audioTrack){
                audioTrack.enabled = !audioEnabled;
                setAudioEnabled(!audioEnabled);
                try {
                    await apiClient.post(`/api/rooms/${roomData.roomCode}/media`, {
                        videoEnabled: videoEnabled,
                        audioEnabled: !audioEnabled
                    });
                } catch(err){
                    console.error('Failed to update audio status:', err);
                }
            }
        }
    };

    const sendChatMessage = () => {
        if(!chatInput.trim()) return;

        const message = {
            id: Date.now(),
            type: 'user',
            username: user.username,
            message: chatInput,
            timestamp: new Date().toLocaleTimeString()
        };
        setChatMessages(prev => [...prev, message]);
        setChatInput('');
    };

    const copyRoomLink = () => {
        const link = `${window.location.origin}/?room=${roomData.roomCode}`;
        navigator.clipboard.writeText(link);
        alert('Room link copied to clipboard!');
    };

    const shareToWhatsApp = () => {
        const link = `${window.location.origin}/?room=${roomData.roomCode}`;
        const message = `Join My Fliora Watch Party! Room Code: ${roomData.roomCode}\n${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleStartWatchParty = async () => {
        try {
            setLoading(true);
            await apiClient.post(`/api/rooms/${roomData.roomCode}/start`);
            addSystemMessage('Starting Watch Party...');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start watch party');
        } finally {
            setLoading(false);
        }
    };

    const handleKickParticipant = async (participantId) => {
        try {
            await apiClient.post(`/api/rooms/${roomData.roomCode}/kick/${participantId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to kick participant');
        }
    };

    const goBackToDashboard = async () => {
        if(localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if(stompClient){
            stompClient.disconnect();
        }
        if(roomData){
            try {
                await apiClient.post(`/api/rooms/${roomData.roomCode}/leave`);
            } catch (err){
                console.error('Failed to leave room:', err);
            }
        }
        setCurrentView('dashboard');
        setRoomData(null);
        setJoinRoomCode('');
        setParticipants([]);
        setChatMessages([]);
        setLocalStream(null);
        setIsHost(false);
        setError('');
        setStompClient(null);
    };

    if(currentView === 'waiting-room') {
        return (
            <div className="waiting-room">
                <nav className="navbar">
                    <div className="navbar-brand">Fliora - {roomData?.roomName}</div>
                    <div className="navbar-user">
                        <span>Welcome, {user?.username}!</span>
                        <button className="back-btn" onClick={goBackToDashboard}>
                            Leave Room
                        </button>
                        <button className="logout-btn" onClick={onLogout}>
                            Logout
                        </button>
                    </div>
                </nav>

                <div className="waiting-room-content">
                    <div className="video-section">
                        <div className="video-grid">
                            {/* Local Video */}
                            <div className="video-container local-video">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={`video-element ${!videoEnabled ? 'video-disabled' : ''}`}
                                />
                                <div className="video-overlay">
                                    <span className="participant-name">{user.username} (You)</span>
                                    {!audioEnabled && <span className="muted-indicator">🔇</span>}
                                </div>
                                {!videoEnabled && (
                                    <div className="video-placeholder">
                                        <div className="avatar">{user.username[0]}</div>
                                    </div>
                                )}
                            </div>

                            {participants.filter(p => p.id !== user.id).map(participant => (
                                <div key={participant.id} className="video-container">
                                    <div className="video-element participant-video">
                                        <div className="video-placeholder">
                                            <div className="avatar">{participant.username[0]}</div>
                                        </div>
                                    </div>
                                    <div className="video-overlay">
                                        <span className="participant-name">
                                            {participant.username}
                                            {participant.isHost && <span className="host-badge">👑</span>}
                                        </span>
                                        {!participant.audioEnabled && <span className="muted-indicator">🔇</span>}
                                        {isHost && !participant.isHost && (
                                            <button
                                                className="kick-btn"
                                                onClick={() => handleKickParticipant(participant.id)}
                                            >
                                                ❌
                                            </button>
                                            )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="video-controls">
                            <button
                                className={`control-btn ${!audioEnabled ? 'disabled' : ''}`}
                                onClick={toggleAudio}
                            >
                                {audioEnabled ? '🎤' : '🔇'}
                            </button>
                            <button
                                className={`control-btn ${!videoEnabled ? 'disabled' : ''}`}
                                onClick={toggleVideo}
                            >
                                {videoEnabled ? '📹' : '📵'}
                            </button>
                        </div>

                        {isHost && (
                            <div className="host-controls">
                                <button
                                    className="start-party-btn"
                                    onClick={handleStartWatchParty}
                                    disabled={loading}
                                >
                                    {loading ? 'Starting...' : '✅ Start Watch Party'}
                                </button>
                                <button className="wait-btn">
                                    ⏳ Wait For More Friends
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="sidebar">
                        <div className="room-info">
                            <h3>Room: {roomData?.roomCode}</h3>
                            <div className="share-options">
                                <button className="share-btn" onClick={copyRoomLink}>
                                    📋 Copy Link
                                </button>
                                <button className="share-btn" onClick={shareToWhatsApp}>
                                    📱 WhatsApp
                                </button>
                            </div>
                        </div>

                        <div className="participants-list">
                            <h4>Participants ({participants.length})</h4>
                            {participants.map(participant => (
                                <div key={participant.id} className="participant-item">
                                    <div className="participant-info">
                                        <span className="participant-avatar">{participant.username[0]}</span>
                                        <span className="participant-name">
                                            {participant.username}
                                            {participant.isHost && <span className="host-badge">👑</span>}
                                        </span>
                                    </div>
                                    <div className="participant-status">
                                        {!participant.audioEnabled && <span>🔇</span>}
                                        {!participant.videoEnabled && <span>📵</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="chat-section">
                            <h4>Chat</h4>
                            <div className="chat-messages">
                                {chatMessages.map(msg => (
                                    <div key={msg.id} className={`chat-message ${msg.type}`}>
                                        {msg.type === 'system' ? (
                                            <span className="system-message">{msg.message}</span>
                                        ) : (
                                            <>
                                                <span className="message-user">{msg.username}:</span>
                                                <span className="message-text">{msg.message}</span>
                                            </>
                                        )}
                                        <span className="message-time">{msg.timestamp}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="chat-input">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                    placeholder="Type A Message..."
                                />
                                <button onClick={sendChatMessage}>Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <nav className="navbar">
                <div className="navbar-brand">Fliora</div>
                <div className="navbar-user">
                    <span>Welcome, {user?.username}!</span>
                    <button className="logout-btn" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="welcome-section">
                    <h1 className="dashboard-title">Welcome to Fliora!</h1>
                    <p className="dashboard-subtitle">
                        Watch Movies With Friends While Video Chatting
                    </p>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')}>×</button>
                    </div>
                )}

                <div className="main-actions">
                    <div className="action-card">
                        <div className="action-icon">🎬</div>
                        <h3>Create Room</h3>
                        <p>Start A New Watch Party And Invite Your Friends</p>
                        <button
                            className="action-btn create-btn"
                            onClick={handleCreateRoom}
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </div>

                    <div className="action-divider">OR</div>

                    <div className="action-card">
                        <div className="action-icon">🔗</div>
                        <h3>Join Room</h3>
                        <p>Enter A Room Code To Join An Existing Watch Party</p>
                        <div className="join-room-form">
                            <input
                                type="text"
                                value={joinRoomCode}
                                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                                placeholder="Enter room code"
                                maxLength={8}
                                className="room-code-input"
                            />
                            <button
                                className="action-btn join-btn"
                                onClick={() => handleJoinRoom()}
                                disabled={loading || !joinRoomCode.trim()}
                            >
                                {loading ? 'Joining...' : 'Join Room'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="features-preview">
                    <h2>Coming Soon Features</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">🍿</div>
                            <h3>Movie Streaming</h3>
                            <p>Stream Movies Together In Sync</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">💬</div>
                            <h3>Reactions</h3>
                            <p>React And Comment During Movies</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">📱</div>
                            <h3>Mobile App</h3>
                            <p>Watch On Your Mobile Device</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;