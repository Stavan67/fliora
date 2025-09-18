import React from 'react';

const Dashboard = ({ user, onLogout }) => {
    const features = [
        {
            icon: '🎥',
            title: 'Video Calls',
            description: 'Connect with friends and family through high-quality video calls',
            status: 'Coming Soon'
        },
        {
            icon: '🍿',
            title: 'Watch Movies',
            description: 'Stream your favorite movies and shows together',
            status: 'Coming Soon'
        },
        {
            icon: '👥',
            title: 'Watch Parties',
            description: 'Host movie nights with friends in virtual rooms',
            status: 'Coming Soon'
        },
        {
            icon: '💬',
            title: 'Chat & Reactions',
            description: 'Chat and react while watching content together',
            status: 'Coming Soon'
        }
    ];

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
                        The ultimate platform combining video calling with movie streaming
                    </p>
                </div>

                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card">
                            <div className="feature-icon">{feature.icon}</div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                            <span className="feature-status">{feature.status}</span>
                        </div>
                    ))}
                </div>

                <div className="user-info-section">
                    <h2>Account Information</h2>
                    <div className="user-info-card">
                        <div className="info-item">
                            <strong>User ID:</strong> {user?.id}
                        </div>
                        <div className="info-item">
                            <strong>Username:</strong> {user?.username}
                        </div>
                        <div className="info-item">
                            <strong>Email:</strong> {user?.email}
                        </div>
                        <div className="info-item">
                            <strong>Email Verified:</strong>
                            <span className={`verification-badge ${user?.emailVerified ? 'verified' : 'unverified'}`}>
                {user?.emailVerified ? '✓ Verified' : '⚠ Unverified'}
              </span>
                        </div>
                    </div>
                </div>

                <div className="coming-soon-section">
                    <h2>🚀 Coming Soon</h2>
                    <p>
                        We're working hard to bring you the best video calling and movie streaming experience.
                        Stay tuned for exciting updates!
                    </p>

                    <div className="roadmap">
                        <div className="roadmap-item">
                            <span className="roadmap-phase">Phase 1</span>
                            <span className="roadmap-feature">HD Video Calling with Zoom Integration</span>
                        </div>
                        <div className="roadmap-item">
                            <span className="roadmap-phase">Phase 2</span>
                            <span className="roadmap-feature">Movie Streaming with Netflix-like Interface</span>
                        </div>
                        <div className="roadmap-item">
                            <span className="roadmap-phase">Phase 3</span>
                            <span className="roadmap-feature">Synchronized Watch Parties</span>
                        </div>
                        <div className="roadmap-item">
                            <span className="roadmap-phase">Phase 4</span>
                            <span className="roadmap-feature">Mobile Apps & Advanced Features</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;