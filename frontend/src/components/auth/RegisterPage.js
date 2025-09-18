import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import '../../styles/RegisterPage.css';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [availability, setAvailability] = useState({
        username: { status: 'idle', message: '' },
        email: { status: 'idle', message: '' }
    });
    const [showSuccess, setShowSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '' });

    const navigate = useNavigate();

    const checkPasswordStrength = (password) => {
        let score = 0;
        let feedback = [];

        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[@$!%*?&]/.test(password)) score++;

        const strengthLevels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        return {
            score,
            text: strengthLevels[score] || ''
        };
    };

    const checkAvailability = async (type, value) => {
        if (!value.trim()) return;

        console.log(`🔍 Checking availability for ${type}: ${value}`);

        setAvailability(prev => ({
            ...prev,
            [type]: { status: 'checking', message: 'Checking...' }
        }));

        try {
            const response = await authService.checkAvailability(type, value);
            console.log(`✅ Availability response for ${type}:`, response);

            setAvailability(prev => ({
                ...prev,
                [type]: {
                    status: response.available ? 'available' : 'unavailable',
                    message: response.available ? 'Available' : `${type} already taken`
                }
            }));
        } catch (error) {
            console.error(`❌ Availability check failed for ${type}:`, error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText
            });

            setAvailability(prev => ({
                ...prev,
                [type]: {
                    status: 'error',
                    message: `Check failed: ${error.response?.status || 'Network error'}`
                }
            }));
        }
    };

    // Debounced availability check
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (formData.username && formData.username.length >= 3) {
                checkAvailability('username', formData.username);
            } else if (formData.username && formData.username.length > 0) {
                console.log('⚠️ Username too short for check:', formData.username);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.username]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (formData.email && formData.email.includes('@')) {
                checkAvailability('email', formData.email);
            } else if (formData.email && formData.email.length > 0) {
                console.log('⚠️ Email invalid for check:', formData.email);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.email]);

    useEffect(() => {
        if (formData.password) {
            setPasswordStrength(checkPasswordStrength(formData.password));
        } else {
            setPasswordStrength({ score: 0, text: '' });
        }
    }, [formData.password]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Username validation
        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3 || formData.username.length > 50) {
            newErrors.username = 'Username must be between 3 and 50 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers and underscores';
        }

        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please provide a valid email address';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8 || formData.password.length > 128) {
            newErrors.password = 'Password must be between 8 and 128 characters';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character';
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Confirm password is required';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        // Check availability
        if (availability.username.status === 'unavailable') {
            newErrors.username = 'Username is not available';
        }
        if (availability.email.status === 'unavailable') {
            newErrors.email = 'Email is already registered';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const response = await authService.register(formData);

            if (response.success) {
                setRegisteredEmail(formData.email);
                setShowSuccess(true);
            }
        } catch (error) {
            console.error('Registration error:', error);

            if (error.errors) {
                setErrors(error.errors);
            } else {
                setErrors({
                    general: error.message || 'Registration failed. Please try again.'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="auth-page">
                <div className="form-container">
                    <div className="verification-container">
                        <div className="verification-icon success">✅</div>
                        <h2 className="verification-title">Registration Successful!</h2>
                        <p className="verification-description">
                            We've sent a verification email to <strong>{registeredEmail}</strong>.
                            Please check your inbox and click the verification link to activate your account.
                        </p>
                        <div>
                            <button
                                className="resend-btn"
                                onClick={async () => {
                                    try {
                                        await authService.resendVerificationEmail(registeredEmail);
                                        alert('Verification email sent!');
                                    } catch (error) {
                                        alert('Failed to send email: ' + error.message);
                                    }
                                }}
                            >
                                Resend Email
                            </button>
                            <button
                                className="back-btn"
                                onClick={() => navigate('/login')}
                            >
                                Go to Login
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
                <h2 className="form-title">Join Fliora</h2>
                <p className="register-subtitle">Create your account to get started</p>

                {errors.general && (
                    <div className="alert error">
                        {errors.general}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">
                            Username
                        </label>
                        <div className="input-with-availability">
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className={`form-input ${errors.username ? 'error' :
                                    availability.username.status === 'available' ? 'success' : ''}`}
                                placeholder="Choose a username"
                            />
                            {formData.username && (
                                <span className={`availability-indicator ${availability.username.status}`}>
                  {availability.username.message}
                                    {availability.username.status === 'available' && <span className="checkmark">✓</span>}
                                    {availability.username.status === 'unavailable' && <span className="checkmark">✗</span>}
                </span>
                            )}
                        </div>
                        {errors.username && (
                            <span className="error-message">{errors.username}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email Address
                        </label>
                        <div className="input-with-availability">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`form-input ${errors.email ? 'error' :
                                    availability.email.status === 'available' ? 'success' : ''}`}
                                placeholder="Enter your email address"
                            />
                            {formData.email && formData.email.includes('@') && (
                                <span className={`availability-indicator ${availability.email.status}`}>
                  {availability.email.message}
                                    {availability.email.status === 'available' && <span className="checkmark">✓</span>}
                                    {availability.email.status === 'unavailable' && <span className="checkmark">✗</span>}
                </span>
                            )}
                        </div>
                        {errors.email && (
                            <span className="error-message">{errors.email}</span>
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
                            placeholder="Create a strong password"
                        />
                        {formData.password && (
                            <div className="password-strength">
                                <div className={`password-strength-bar ${passwordStrength.text.toLowerCase()}`}></div>
                                <div className={`password-strength-text ${passwordStrength.text.toLowerCase()}`}>
                                    {passwordStrength.text && `Password strength: ${passwordStrength.text}`}
                                </div>
                            </div>
                        )}
                        {errors.password && (
                            <span className="error-message">{errors.password}</span>
                        )}
                        <div className="password-requirements">
                            <small>Password must contain: lowercase, uppercase, number, and special character</small>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={`form-input ${errors.confirmPassword ? 'error' :
                                formData.confirmPassword && formData.password === formData.confirmPassword ? 'success' : ''}`}
                            placeholder="Confirm your password"
                        />
                        {errors.confirmPassword && (
                            <span className="error-message">{errors.confirmPassword}</span>
                        )}
                        {formData.confirmPassword && formData.password === formData.confirmPassword && (
                            <span className="success-message">Passwords match ✓</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading && <span className="loading-spinner"></span>}
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="form-footer">
                    Already have an account? <Link to="/login" className="form-link">Sign in here</Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;