// components/dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../services/apiClient'
import '../../styles/Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
    const [joinRoomCode, setJoinRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const inviteRoomCode = urlParams.get('room');
        if (inviteRoomCode) {
            setJoinRoomCode(inviteRoomCode);
            validateAndJoinRoom(inviteRoomCode);
        }
    }, [location]);

    const validateAndJoinRoom = async (code) => {
        try {
            setLoading(true);
            setError('');

            const validationResponse = await apiClient.get(`/api/rooms/${code}/validate`);
            if (!validationResponse.data.exists) {
                setError('Room not found. Please check the room code.');
                return;
            }
            if (validationResponse.data.isFull) {
                setError('Room is full. Cannot join.');
                return;
            }
            await handleJoinRoom(code);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join room');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.post('/api/rooms/create', {
                roomName: `${user.username}'s Room`
            });

            const room = response.data.room;

            // Navigate to room with room data
            navigate('/room', {
                state: { roomData: room }
            });
        } catch (err) {
            console.error('Room creation error:', err);
            const errorMessage = err.response?.data?.message || 'Failed to create room. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (code = joinRoomCode) => {
        if (!code.trim()) {
            setError('Please enter a room code');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.post(`/api/rooms/${code}/join`);
            const room = response.data.room;

            // Navigate to room with room data
            navigate('/room', {
                state: { roomData: room }
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join room. Please check the room code.');
        } finally {
            setLoading(false);
        }
    };

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