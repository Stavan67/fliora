import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";

const EmailVerification = ({email, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [resendEmail, setResendEmail] = useState(email || '');
    const navigate = useNavigate();

    const handleResendEmail = async () => {
        if(!resendEmail.trim()) {
            setMessage('Please enter your email address');
            return;
        }
        setLoading(true);
        setMessage('');

        try{
            const response = await authService.resendVerificationEmail(resendEmail);
            if(response.success){
                setMessage('Verification email sent successfully! Please check your inbox.');
            }
        } catch (error){
            setMessage(error.message || 'Failed to send verification email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="form-container">
                <div className="verification-container">
                    <div className="verification-icon">📧</div>
                    <h2 className="verification-title">Check Your Email</h2>
                    <p className="verification-description">
                        We've sent a verification link to your email address.
                        Please check your inbox and click on the link to verify your account.
                    </p>
                    {message && (
                        <div className={`alert ${message.includes('successfully') ? 'success' : 'error'}`}>
                            {message}
                        </div>
                    )}
                    <div className="resend-section">
                        <p style={{ marginBottom: '15px', color: '#666', fontSize: '0.9rem' }}>
                            Didn't receive the email?
                        </p>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <input
                                type="email"
                                value={resendEmail}
                                onChange={(e) => setResendEmail(e.target.value)}
                                placeholder="Enter your email address"
                                className="form-input"
                                style={{ textAlign: 'center' }}
                            />
                        </div>
                        <div>
                            <button
                                className="resend-btn"
                                onClick={handleResendEmail}
                                disabled={loading}
                            >
                                {loading && <span className="loading-spinner"></span>}
                                {loading ? 'Sending...' : 'Resend Verification Email'}
                            </button>
                            <button
                                className="back-btn"
                                onClick={() => onBack ? onBack() : navigate('/login')}
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                    <div className="form-footer" style={{ marginTop: '30px' }}>
                        <p style={{ fontSize: '0.8rem', color: '#999' }}>
                            Check your spam folder if you don't see the email in your inbox.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailVerification;