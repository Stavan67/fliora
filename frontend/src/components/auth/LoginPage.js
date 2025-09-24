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
    const [showPassword, setShowPassword] = useState(false);

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
            newErrors.usernameOrEmail = 'Username Or Email Is Required';
        }

        if(!formData.password.trim()) {
            newErrors.password = 'Password Is Required';
        }

        return newErrors;
    }

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

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
                            Please Verify Your Email Address Before Logging In. Check Your Inbox For A Verification Link.
                        </p>
                        <div>
                            <button
                                className="resend-btn"
                                onClick={async () => {
                                    try {
                                        await authService.resendVerificationEmail(userEmail);
                                        alert('Verification Email Send!');
                                    } catch (error) {
                                        alert('Failed To Send Email: ' + error.message);
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
                <p className="login-subtitle">Sign In To Your Fliora Account</p>

                {errors.general && (
                    <div className="alert error">
                        {errors.general}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="usernameOrEmail" className="form-label">
                            Username Or Email
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
                        <div className="password-input-container">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="Enter your password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={togglePasswordVisibility}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
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
                    Don't Have An Account? <Link to="/register" className="form-link">Sign Up Here</Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;