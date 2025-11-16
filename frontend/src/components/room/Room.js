import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import webRTCService from '../../services/WebRTCService';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import VideoGrid from './VideoGrid';
import RoomControls from './RoomControls';
import RoomSidebar from './RoomSidebar';
import '../../styles/Room.css';

const Room = ({ user, onLogout }) => {
    const [roomData, setRoomData] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const [localStream, setLocalStream] = useState(null);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [webRTCReady, setWebRTCReady] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeSidebarView, setActiveSidebarView] = useState('participants');
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const initializationRef = useRef(false);
    const videoStreamRef = useRef(null);
    const participantsRef = useRef([]);
    const roomDataRef = useRef(null);
    const isKickedRef = useRef(false);

    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    useEffect(() => {
        roomDataRef.current = roomData;
    }, [roomData]);

    useEffect(() => {
        const roomCode = searchParams.get('room');

        if (roomCode && !initializationRef.current && user) {
            initializationRef.current = true;
            joinRoomByCode(roomCode);
            return;
        }

        if (!location.state?.roomData && !initializationRef.current && !roomCode) {
            navigate('/dashboard');
            return;
        }

        if (location.state?.roomData && !initializationRef.current) {
            initializationRef.current = true;
            const room = location.state.roomData;
            setRoomData(room);
            setIsHost(room.isHost);
            initializeRoom(room);
        }

        return () => {
            cleanup();
        };
    }, [location.state, searchParams, user]);

    const joinRoomByCode = async (roomCode) => {
        try {
            setLoading(true);
            console.log('[Room] Joining room by code:', roomCode);

            const response = await apiClient.post(`/api/rooms/${roomCode}/join`);
            const room = {
                roomCode: response.data.roomCode,
                roomName: response.data.roomName,
                isHost: response.data.isHost
            };

            console.log('[Room] Successfully joined room:', room);

            setRoomData(room);
            setIsHost(room.isHost);

            await initializeRoom(room);
        } catch (err) {
            console.error('Error joining room:', err);
            setError(err.response?.data?.message || 'Failed to join room');
            setTimeout(() => navigate('/dashboard'), 2000);
        }
    };

    const initializeRoom = async (room) => {
        try {
            console.log('[Room] 🚀 Initializing room:', room.roomCode);

            await initializeMedia();
            await loadParticipants(room.roomCode);
            await connectWebSocket(room);

            addSystemMessage(`Welcome to ${room.roomName}!`);
        } catch (err) {
            console.error('Error initializing room:', err);
            setError('Failed to initialize room');
        } finally {
            setLoading(false);
        }
    };

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            videoStreamRef.current = stream;
            setLocalStream(stream);
            console.log('[Room] ✅ Media initialized successfully');
        } catch (err) {
            console.error('Error accessing media devices:', err);
            setError('Failed to access camera/microphone. Please check permissions.');
            throw err;
        }
    };

    const connectWebSocket = (room) => {
        return new Promise((resolve, reject) => {
            const socket = new SockJS('/ws');
            const client = new Client({
                webSocketFactory: () => socket,
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                onConnect: () => {
                    console.log('[Room] 🔌 WebSocket connected');
                    client.subscribe(`/topic/room/${room.roomCode}`, (message) => {
                        handleRoomNotification(JSON.parse(message.body));
                    });

                    const currentStream = videoStreamRef.current || localStream;
                    webRTCService.initialize(client, room.roomCode, user.id, currentStream);
                    webRTCService.onRemoteStream = handleRemoteStream;
                    webRTCService.onParticipantLeft = handleRemoteParticipantLeft;

                    setStompClient(client);
                    setWebRTCReady(true);

                    setTimeout(() => {
                        console.log('[Room] 📣 Notifying join to room');
                        webRTCService.notifyJoin();
                    }, 500);

                    setTimeout(() => {
                        console.log('[Room] 🔍 Checking for existing participants...');
                        const currentParticipants = participantsRef.current;
                        console.log('[Room] 📋 Participants to connect to:',
                            currentParticipants.map(p => `${p.username}(${p.id})`));
                        if (currentParticipants.length > 1) {
                            initiateConnectionsToExistingParticipants();
                        } else {
                            console.log('[Room] ℹ️ No existing participants to connect to');
                        }
                    }, 2000);
                    resolve();
                },
                onDisconnect: () => {
                    console.log('[Room] 🔌 WebSocket disconnected');
                    setWebRTCReady(false);
                },
                onStompError: (error) => {
                    console.error('[Room] ❌ WebSocket error:', error);
                    reject(error);
                }
            });
            client.activate();
        });
    };

    const initiateConnectionsToExistingParticipants = () => {
        const currentParticipants = participantsRef.current;
        console.log('[Room] 🔍 Checking for existing participants to connect to:',
            currentParticipants.map(p => `${p.id}:${p.username}`));

        if (currentParticipants.length === 0) {
            console.log('[Room] ℹ️ No existing participants found');
            return;
        }

        currentParticipants.forEach(participant => {
            const participantIdStr = String(participant.id);
            const currentUserIdStr = String(user.id);

            if (participantIdStr !== currentUserIdStr) {
                console.log('[Room] 🔗 Processing existing participant:',
                    participant.username, '(', participantIdStr, ')');

                webRTCService.createPeerConnection(participantIdStr).then(() => {
                    console.log('[Room] ✅ Peer connection created for existing participant:', participantIdStr);

                    if (webRTCService.shouldInitiateConnection(currentUserIdStr, participantIdStr)) {
                        console.log('[Room] 🎯 I should initiate to:', participantIdStr);
                        setTimeout(() => {
                            console.log('[Room] 🚀 Creating offer to existing participant:', participantIdStr);
                            webRTCService.createOffer(participantIdStr);
                        }, 1200);
                    } else {
                        console.log('[Room] ⏳ They should initiate to me:', participantIdStr);
                    }
                }).catch(error => {
                    console.error('[Room] ❌ Error creating peer connection for existing participant:', error);
                });
            }
        });
    };

    const handleRoomNotification = async (notification) => {
        const { type, message, userId, username, timestamp } = notification;
        console.log('[Room] 📢 Room notification received:', type, 'userId:', userId, 'currentUser:', user.id);

        switch (type) {
            case 'USER_JOINED':
                const updatedParticipants = await refreshParticipants();
                console.log('[Room] 📋 Participants after refresh:', updatedParticipants.map(p => ({ id: p.id, username: p.username })));

                addSystemMessage(message);

                if (userId && String(userId) !== String(user.id)) {
                    console.log('[Room] 🔗 New participant joined, setting up WebRTC:', userId);

                    if (webRTCReady) {
                        setTimeout(() => {
                            console.log('[Room] 🚀 Calling handleJoin for new participant:', userId);
                            webRTCService.handleJoin(userId);
                        }, 1000);
                    } else {
                        console.warn('[Room] ⚠️ WebRTC not ready yet, queueing connection');
                        setTimeout(() => {
                            if (webRTCReady) {
                                console.log('[Room] 🚀 WebRTC now ready, calling handleJoin:', userId);
                                webRTCService.handleJoin(userId);
                            }
                        }, 2000);
                    }
                }
                break;

            case 'USER_LEFT':
                await refreshParticipants();
                addSystemMessage(message);
                break;

            case 'USER_KICKED':
                // Check if the kicked user is the current user
                if (String(userId) === String(user.id)) {
                    console.log('[Room] 🚨 I have been kicked from the room');
                    isKickedRef.current = true;
                    addSystemMessage('You have been removed from the room by the host');
                    setTimeout(() => {
                        goBackToDashboard();
                    }, 3000);
                } else {
                    await refreshParticipants();
                    addSystemMessage(message);
                }
                break;

            case 'MEDIA_UPDATED':
                await refreshParticipants();
                break;

            case 'ROOM_ENDED':
                addSystemMessage(message);
                setTimeout(() => goBackToDashboard(), 3000);
                break;

            case 'CHAT_MESSAGE':
                console.log('[Room] 💬 Chat message received from:', username);
                // Add chat message to local state
                setChatMessages(prev => [...prev, {
                    id: Date.now() + Math.random(), // Ensure unique ID
                    type: 'user',
                    username: username,
                    userId: userId,
                    message: message,
                    timestamp: new Date(timestamp).toLocaleTimeString()
                }]);
                break;

            default:
                console.log('[Room] ❓ Unknown notification type:', type);
                break;
        }
    };

    const handleRemoteStream = useCallback(async (participantId, stream) => {
        const participantIdStr = String(participantId);
        console.log('[Room] 🎥 handleRemoteStream called for:', participantIdStr);
        console.log('[Room] 🎥 Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

        setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(participantIdStr, stream);
            console.log('[Room] 🎥 Updated remoteStreams, now has keys:', Array.from(newStreams.keys()));
            return newStreams;
        });

        const participantExists = participantsRef.current.some(p => String(p.id) === participantIdStr);
        console.log('[Room] 🎥 Participant exists in list?', participantExists);

        if (!participantExists) {
            console.log('[Room] 🔄 Participant not in list, refreshing...');
            await refreshParticipants();
            console.log('[Room] ✅ Participants refreshed');
        }
    }, []);

    const handleRemoteParticipantLeft = useCallback((participantId) => {
        console.log('[Room] 👋 Removing remote stream for participant:', participantId);
        setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(participantId);
            return newStreams;
        });
    }, []);

    const loadParticipants = async (roomCode) => {
        try {
            console.log('[Room] 📋 Loading participants for room:', roomCode);
            const response = await apiClient.get(`/api/rooms/${roomCode}/participants`);
            const loadedParticipants = response.data.participants;
            console.log('[Room] ✅ Loaded participants:', loadedParticipants.map(p => ({ id: p.id, username: p.username })));
            setParticipants(loadedParticipants);
            return loadedParticipants;
        } catch (err) {
            console.error('[Room] ❌ Failed to load participants:', err);
            return [];
        }
    };

    const refreshParticipants = async () => {
        const currentRoomData = roomDataRef.current;
        if (currentRoomData && currentRoomData.roomCode) {
            console.log('[Room] 🔄 Refreshing participants for room:', currentRoomData.roomCode);
            return await loadParticipants(currentRoomData.roomCode);
        } else {
            console.error('[Room] ❌ Cannot refresh participants: roomData not available');
            return [];
        }
    };

    // Use useCallback to memoize toggle functions
    const toggleVideo = useCallback(async () => {
        const newVideoState = !videoEnabled;
        setVideoEnabled(newVideoState);

        if (videoStreamRef.current) {
            const videoTracks = videoStreamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = newVideoState;
            });
            webRTCService.toggleTrack('video', newVideoState);
        }

        try {
            if (roomData && roomData.roomCode) {
                await apiClient.post(`/api/rooms/${roomData.roomCode}/media`, {
                    videoEnabled: newVideoState,
                    audioEnabled: audioEnabled
                });
            }
        } catch (err) {
            console.error('Failed to update video status:', err);
        }
    }, [videoEnabled, audioEnabled, roomData]);

    const toggleAudio = useCallback(async () => {
        const newAudioState = !audioEnabled;
        setAudioEnabled(newAudioState);

        if (videoStreamRef.current) {
            const audioTracks = videoStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = newAudioState;
            });
            webRTCService.toggleTrack('audio', newAudioState);
        }

        try {
            if (roomData && roomData.roomCode) {
                await apiClient.post(`/api/rooms/${roomData.roomCode}/media`, {
                    videoEnabled: videoEnabled,
                    audioEnabled: newAudioState
                });
            }
        } catch (err) {
            console.error('Failed to update audio status:', err);
        }
    }, [audioEnabled, videoEnabled, roomData]);

    const sendChatMessage = useCallback(() => {
        if (!chatInput.trim()) return;

        if (!stompClient || !stompClient.connected) {
            console.error('[Room] ❌ Cannot send message: WebSocket not connected');
            addSystemMessage('Cannot send message: Not connected to server');
            return;
        }

        const message = {
            type: 'chat',
            username: user.username,
            userId: user.id,
            message: chatInput,
            timestamp: new Date().toISOString()
        };

        console.log('[Room] 💬 Sending chat message:', message);

        try {
            stompClient.publish({
                destination: `/app/chat/${roomData.roomCode}`,
                body: JSON.stringify(message)
            });
            console.log('[Room] ✅ Chat message sent');
            setChatInput('');
        } catch (error) {
            console.error('[Room] ❌ Error sending chat message:', error);
            addSystemMessage('Failed to send message');
        }
    }, [chatInput, user.username, user.id, stompClient, roomData, addSystemMessage]);

    const addSystemMessage = useCallback((message) => {
        setChatMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message,
            timestamp: new Date().toLocaleTimeString()
        }]);
    }, []);

    const copyRoomLink = useCallback(() => {
        const link = `${window.location.origin}/?room=${roomData.roomCode}`;
        navigator.clipboard.writeText(link);
        alert('Room link copied to clipboard!');
    }, [roomData]);

    const shareToWhatsApp = useCallback(() => {
        const link = `${window.location.origin}/?room=${roomData.roomCode}`;
        const message = `Join my Fliora Watch Party!\n\nRoom Code: ${roomData.roomCode}\n${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }, [roomData]);

    const handleStartWatchParty = useCallback(async () => {
        try {
            setLoading(true);
            if (roomData && roomData.roomCode) {
                await apiClient.post(`/api/rooms/${roomData.roomCode}/start`);
                addSystemMessage('Starting Watch Party...');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start watch party');
        } finally {
            setLoading(false);
        }
    }, [roomData, addSystemMessage]);

    const handleKickParticipant = useCallback(async (participantId) => {
        try {
            if (roomData && roomData.roomCode) {
                await apiClient.post(`/api/rooms/${roomData.roomCode}/kick/${participantId}`);
                console.log('[Room] ✅ Kick request sent for participant:', participantId);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to kick participant');
        }
    }, [roomData]);

    const goBackToDashboard = async () => {
        await cleanup();
        navigate('/dashboard');
    };

    const cleanup = async () => {
        console.log('[Room] 🧹 Starting cleanup');
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
            videoStreamRef.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        webRTCService.cleanup();
        if (stompClient) {
            stompClient.deactivate();
        }

        const currentRoomData = roomDataRef.current;
        // Don't send leave request if user was kicked
        if (currentRoomData && currentRoomData.roomCode && !isKickedRef.current) {
            try {
                await apiClient.post(`/api/rooms/${currentRoomData.roomCode}/leave`);
            } catch (err) {
                console.error('Failed to leave room:', err);
            }
        }
    };

    const toggleSidebar = useCallback((view) => {
        if (sidebarOpen && activeSidebarView === view) {
            setSidebarOpen(false);
        } else {
            setActiveSidebarView(view);
            setSidebarOpen(true);
        }
    }, [sidebarOpen, activeSidebarView]);

    if (loading) {
        return (
            <div className="room-loading">
                <div className="loading-spinner"></div>
                <p>Initializing room...</p>
            </div>
        );
    }

    return (
        <div className="room-container">
            <nav className="room-navbar">
                <div className="navbar-brand">
                    Fliora - {roomData?.roomName}
                </div>
                <div className="navbar-info">
                    <span className="room-code-display">
                        Room: <strong>{roomData?.roomCode}</strong>
                    </span>
                    <span className="participant-count">
                        {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
                    </span>
                </div>
                <div className="navbar-actions">
                    <span className="user-welcome">Welcome, {user?.username}!</span>
                    <button className="leave-room-btn" onClick={goBackToDashboard}>
                        Leave Room
                    </button>
                    <button className="logout-btn" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </nav>
            {error && (
                <div className="room-error-message">
                    {error}
                    <button onClick={() => setError('')}>×</button>
                </div>
            )}
            <div className="room-content">
                <div className={`room-main ${sidebarOpen ? 'sidebar-open' : ''}`}>
                    <div className="sidebar-toggle-buttons">
                        <button
                            className={`sidebar-toggle-btn ${sidebarOpen && activeSidebarView === 'participants' ? 'active' : ''}`}
                            onClick={() => toggleSidebar('participants')}
                            title="Participants"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="9" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>{participants.length}</span>
                        </button>
                        <button
                            className={`sidebar-toggle-btn ${sidebarOpen && activeSidebarView === 'chat' ? 'active' : ''}`}
                            onClick={() => toggleSidebar('chat')}
                            title="Chat"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Chat</span>
                            {!sidebarOpen && chatMessages.length > 0 && (
                                <span className="badge">{chatMessages.length}</span>
                            )}
                        </button>
                    </div>

                    <VideoGrid
                        localStream={localStream}
                        remoteStreams={remoteStreams}
                        participants={participants}
                        currentUser={user}
                        videoEnabled={videoEnabled}
                        audioEnabled={audioEnabled}
                        isHost={isHost}
                        onKickParticipant={handleKickParticipant}
                    />
                    <RoomControls
                        videoEnabled={videoEnabled}
                        audioEnabled={audioEnabled}
                        onToggleVideo={toggleVideo}
                        onToggleAudio={toggleAudio}
                        isHost={isHost}
                        onStartWatchParty={handleStartWatchParty}
                        loading={loading}
                    />
                </div>
                <RoomSidebar
                    isOpen={sidebarOpen}
                    activeView={activeSidebarView}
                    onClose={() => setSidebarOpen(false)}
                    roomCode={roomData?.roomCode}
                    participants={participants}
                    chatMessages={chatMessages}
                    chatInput={chatInput}
                    onChatInputChange={setChatInput}
                    onSendMessage={sendChatMessage}
                    onCopyLink={copyRoomLink}
                    onShareWhatsApp={shareToWhatsApp}
                />
            </div>
        </div>
    );
};

export default Room;