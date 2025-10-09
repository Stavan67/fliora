import React, { useState, useEffect} from "react";
import authService from './services/authService'
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import EmailVerification from './components/auth/EmailVerification';
import Dashboard from './components/dashboard/Dashboard';
import Room from './components/room/Room';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './styles/App.css'

// New component to handle root route with room code
function RootRedirect({ isAuthenticated }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const roomCode = searchParams.get('room');

    useEffect(() => {
        if (roomCode) {
            // Store room code for after login
            sessionStorage.setItem('pendingRoomCode', roomCode);

            if (isAuthenticated) {
                // User is logged in, go to room
                navigate(`/room?room=${roomCode}`, { replace: true });
            } else {
                // User not logged in, go to login with room code
                navigate(`/login?room=${roomCode}`, { replace: true });
            }
        } else {
            // No room code, normal redirect
            navigate(isAuthenticated ? "/dashboard" : "/login", { replace: true });
        }
    }, [roomCode, isAuthenticated, navigate]);

    return null; // This component just handles redirects
}

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await authService.checkSession();
            if (response.authenticated) {
                setUser({
                    id: response.userId,
                    username: response.username
                });
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.log('No active session');
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    if(loading) {
        return (
            <div className="App">
                <div className="auth-page">
                    <div className="form-container">
                        <div style={{ textAlign: 'center' }}>
                            <div className="loading-spinner" style={{ margin: '20px auto' }}></div>
                            <p>Loading...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route
                        path="/login"
                        element={
                            isAuthenticated ?
                                <Navigate to="/dashboard" replace /> :
                                <LoginPage onLogin={handleLogin} />
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            isAuthenticated ?
                                <Navigate to="/dashboard" replace /> :
                                <RegisterPage />
                        }
                    />
                    <Route
                        path="/verify-email"
                        element={<EmailVerification />}
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <Dashboard user={user} onLogout={handleLogout} />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/room"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <Room user={user} onLogout={handleLogout} />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/"
                        element={<RootRedirect isAuthenticated={isAuthenticated} />}
                    />
                </Routes>
            </div>
        </Router>
    );
}
export default App;