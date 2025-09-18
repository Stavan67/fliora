import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import '../../styles/LoginPage.css'


const LoginPage = ({ onLogin }) => {
    const [formData, setFormData] = useState({
        usernameOrEmail: '',
        password:''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    const navigate = useNavigate();

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
            [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if(!formData.usernameOrEmail.trim()) {
            newErrors.usernameOrEmail = 'Username or email is required';
        }

        if(!formData.password.trim()) {
            newErrors.password = 'Password is required';
        }

        return newErrors;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validateForm();
        if(Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const response = await authService.login(formData);

            if(response.success) {
                onLogin(response.user);
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Login error:', error);

            if(error.requiresEmailVerification) {
                setUserEmail(formData.usernameOrEmail);
            } else {
                setErrors({
                    general: error.message || 'Login failed. Please try again.'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    if(showEmailVerification) {
        return (
            <div className="auth-page">
                <div className="form-container">
                    <div className="verification-container">
                        <div className="verification-icon">📧</div>
                        <h2 className="verification-title">Email Verification Required</h2>
                        <p className="verification-description">
                            Please verify your email address before logging in. Check your inbox for a verification link.
                        </p>
                        <div>
                            <button
                                className="resend-btn"
                                onClick={async () => {
                                    try {
                                        await authService.resendVerificationEmail(userEmail);
                                        alert('Verification email send!');
                                } catch (error) {
                                        alert('Failed to send email: ' + error.message);
                                    }
                                }}
                            >
                                Resend Email
                            </button>
                            <button
                                className="back-btn"
                                onClick={() => setShowEmailVerification(false)}
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="form-container">
                <h2 className="form-title">Welcome Back</h2>
                <p className="login-subtitle">Sign in to your Fliora account</p>

                {errors.general && (
                    <div className="alert error">
                        {errors.general}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="usernameOrEmail" className="form-label">
                            Username or Email
                        </label>
                        <input
                            type="text"
                            id="usernameOrEmail"
                            name="usernameOrEmail"
                            value={formData.usernameOrEmail}
                            onChange={handleChange}
                            className={`form-input ${errors.usernameOrEmail ? 'error' : ''}`}
                            placeholder="Enter your username or email"
                        />
                        {errors.usernameOrEmail && (
                            <span className="error-message">{errors.usernameOrEmail}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={`form-input ${errors.password ? 'error' : ''}`}
                            placeholder="Enter your password"
                        />
                        {errors.password && (
                            <span className="error-message">{errors.password}</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading && <span className="loading-spinner"></span>}
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="form-footer">
                    Don't have an account? <Link to="/register" className="form-link">Sign up here</Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;