// components/room/Room.js
import React, { useState, useEffect, useRef } from 'react';
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

    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const initializationRef = useRef(false);
    const videoStreamRef = useRef(null);

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

    useEffect(() => {
        console.log('[Room] Current participants:', participants.map(p => ({ id: p.id, username: p.username })));
        console.log('[Room] Remote streams keys:', Array.from(remoteStreams.keys()));
        console.log('[Room] Current user ID:', user.id);
    }, [participants, remoteStreams, user]);

    const joinRoomByCode = async (roomCode) => {
        try {
            setLoading(true);
            const response = await apiClient.post(`/api/rooms/${roomCode}/join`);
            const room = {
                roomCode: response.data.roomCode,
                roomName: response.data.roomName,
                isHost: response.data.isHost
            };
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
            await initializeMedia();
            await loadParticipants(room.roomCode);
            connectWebSocket(room);
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
        } catch (err) {
            console.error('Error accessing media devices:', err);
            setError('Failed to access camera/microphone. Please check permissions.');
            throw err;
        }
    };

    const connectWebSocket = (room) => {
        const socket = new SockJS('/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log('Connected to WebSocket');

                // Subscribe to room notifications
                client.subscribe(`/topic/room/${room.roomCode}`, (message) => {
                    handleRoomNotification(JSON.parse(message.body));
                });

                // Initialize WebRTC with current stream
                const currentStream = videoStreamRef.current || localStream;
                webRTCService.initialize(client, room.roomCode, user.id, currentStream);
                webRTCService.onRemoteStream = handleRemoteStream;
                webRTCService.onParticipantLeft = handleRemoteParticipantLeft;

                // Notify others of our presence after a short delay
                setTimeout(() => {
                    webRTCService.notifyJoin();
                }, 500);

                setStompClient(client);
            },
            onDisconnect: () => {
                console.log('Disconnected from WebSocket');
            },
            onStompError: (error) => {
                console.error('WebSocket error:', error);
            }
        });
        client.activate();
    };

    const handleRoomNotification = (notification) => {
        const { type, message, userId } = notification;

        switch (type) {
            case 'USER_JOINED':
                refreshParticipants();
                addSystemMessage(message);
                break;
            case 'USER_LEFT':
            case 'USER_KICKED':
                refreshParticipants();
                addSystemMessage(message);
                break;
            case 'MEDIA_UPDATED':
                refreshParticipants();
                break;
            case 'ROOM_ENDED':
                addSystemMessage(message);
                setTimeout(() => goBackToDashboard(), 3000);
                break;
            default:
                break;
        }
    };

    const handleRemoteStream = (participantId, stream) => {
        console.log('Adding remote stream for participant:', participantId);
        setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(participantId, stream);
            return newStreams;
        });
    };

    const handleRemoteParticipantLeft = (participantId) => {
        console.log('Removing remote stream for participant:', participantId);
        setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(participantId);
            return newStreams;
        });
    };

    const loadParticipants = async (roomCode) => {
        try {
            const response = await apiClient.get(`/api/rooms/${roomCode}/participants`);
            setParticipants(response.data.participants);
        } catch (err) {
            console.error('Failed to load participants:', err);
        }
    };

    const refreshParticipants = async () => {
        if (roomData) {
            await loadParticipants(roomData.roomCode);
        }
    };

    const toggleVideo = async () => {
        const newVideoState = !videoEnabled;
        setVideoEnabled(newVideoState);

        if (videoStreamRef.current) {
            // Simply enable/disable the existing track
            const videoTracks = videoStreamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = newVideoState;
            });
            webRTCService.toggleTrack('video', newVideoState);
        }

        try {
            await apiClient.post(`/api/rooms/${roomData.roomCode}/media`, {
                videoEnabled: newVideoState,
                audioEnabled: audioEnabled
            });
        } catch (err) {
            console.error('Failed to update video status:', err);
        }
    };

    const toggleAudio = async () => {
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
            await apiClient.post(`/api/rooms/${roomData.roomCode}/media`, {
                videoEnabled: videoEnabled,
                audioEnabled: newAudioState
            });
        } catch (err) {
            console.error('Failed to update audio status:', err);
        }
    };

    const sendChatMessage = () => {
        if (!chatInput.trim()) return;

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

    const addSystemMessage = (message) => {
        setChatMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const copyRoomLink = () => {
        const link = `${window.location.origin}/?room=${roomData.roomCode}`;
        navigator.clipboard.writeText(link);
        alert('Room link copied to clipboard!');
    };

    const shareToWhatsApp = () => {
        const link = `${window.location.origin}/?room=${roomData.roomCode}`;
        const message = `Join my Fliora Watch Party!\n\nRoom Code: ${roomData.roomCode}\n${link}`;
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
        await cleanup();
        navigate('/dashboard');
    };

    const cleanup = async () => {
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

        if (roomData) {
            try {
                await apiClient.post(`/api/rooms/${roomData.roomCode}/leave`);
            } catch (err) {
                console.error('Failed to leave room:', err);
            }
        }
    };

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
                <div className="room-main">
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