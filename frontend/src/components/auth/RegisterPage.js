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
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();

    const checkPasswordStrength = (password) => {
        let score = 0;

        // Check each requirement individually
        const hasMinLength = password.length >= 8;
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecialChar = /[@$!%*?&]/.test(password);

        if (hasMinLength) score++;
        if (hasLowercase) score++;
        if (hasUppercase) score++;
        if (hasDigit) score++;
        if (hasSpecialChar) score++;

        // Check if ALL requirements are met
        const hasAllRequirements = hasMinLength && hasLowercase && hasUppercase && hasDigit && hasSpecialChar;

        const strengthLevels = [
            { text: '', color: '', index: 0 },
            { text: 'Weak', color: '#e74c3c', index: 1 },
            { text: 'Fair', color: '#f39c12', index: 2 },
            { text: 'Good', color: '#f39c12', index: 3 },
            { text: 'Strong', color: '#27ae60', index: 4 }
        ];

        // Only show "Strong" if ALL requirements are met
        let displayScore = Math.min(score, 4);
        if (!hasAllRequirements && displayScore === 4) {
            displayScore = 3; // Cap at "Good" if not all requirements are met
        }

        const strengthData = strengthLevels[displayScore];

        return {
            score: displayScore,
            text: strengthData.text || '',
            color: strengthData.color || '',
            hasAllRequirements: hasAllRequirements
        };
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const isValidUsername = (username) => {
        return username.length >= 3 && username.length <= 15 && /^[a-zA-Z0-9_]+$/.test(username);
    };

    const checkAvailability = async (type, value) => {
        if (!value.trim()) return;

        // Client-side validation first
        if (type === 'username') {
            if (!isValidUsername(value)) {
                setAvailability(prev => ({
                    ...prev,
                    username: { status: 'unavailable', message: 'Unavailable' }
                }));
                return;
            }
        } else if (type === 'email') {
            if (!isValidEmail(value)) {
                setAvailability(prev => ({
                    ...prev,
                    email: { status: 'unavailable', message: 'Unavailable' }
                }));
                return;
            }
        }

        console.log(`🔍 Checking availability for ${type}: ${value}`);

        setAvailability(prev => ({
            ...prev,
            [type]: { status: 'checking', message: 'Checking...' }
        }));

        try {
            const response = await authService.checkAvailability(type, value);
            console.log(`✅ Availability response for ${type}:`, response);

            if (response.available) {
                setAvailability(prev => ({
                    ...prev,
                    [type]: {
                        status: 'available',
                        message: 'Available'
                    }
                }));
            } else {
                // Handle specific case for email already registered
                const message = type === 'email' ? 'Email already registered' : 'Unavailable';
                setAvailability(prev => ({
                    ...prev,
                    [type]: {
                        status: 'unavailable',
                        message: message
                    }
                }));
            }
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
            if (formData.username && formData.username.length >= 1) {
                checkAvailability('username', formData.username);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.username]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (formData.email && formData.email.length >= 1) {
                checkAvailability('email', formData.email);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.email]);

    useEffect(() => {
        if (formData.password) {
            setPasswordStrength(checkPasswordStrength(formData.password));
        } else {
            setPasswordStrength({ score: 0, text: '', color: '', hasAllRequirements: false });
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

    const togglePasswordVisibility = (field) => {
        if (field === 'password') {
            setShowPassword(!showPassword);
        } else if (field === 'confirmPassword') {
            setShowConfirmPassword(!showConfirmPassword);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Username validation
        if (!formData.username.trim()) {
            newErrors.username = 'Username Is Required';
        } else if (formData.username.length < 3 || formData.username.length > 15) {
            newErrors.username = 'Username Must Be Between 3 And 15 Characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username Can Only Contain Letters, Numbers And Underscores';
        }

        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email Is Required';
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = 'Please Provide A Valid Email Address';
        }

        // Password validation - Fixed the regex and logic
        if (!formData.password) {
            newErrors.password = 'Password Is Required';
        } else if (formData.password.length < 8 || formData.password.length > 128) {
            newErrors.password = 'Password Must Be Between 8 And 128 Characters';
        } else {
            // Check each requirement individually
            const hasLowercase = /[a-z]/.test(formData.password);
            const hasUppercase = /[A-Z]/.test(formData.password);
            const hasDigit = /\d/.test(formData.password);
            const hasSpecialChar = /[@$!%*?&]/.test(formData.password);

            if (!hasLowercase || !hasUppercase || !hasDigit || !hasSpecialChar) {
                newErrors.password = 'Password Must Contain At Least One Lowercase Letter, One Uppercase Letter, One Digit, And One Special Character (@$!%*?&)';
            }
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Confirm Password Is Required';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords Do Not Match';
        }

        // Check availability
        if (availability.username.status === 'unavailable') {
            newErrors.username = 'Username Is Not Available';
        }
        if (availability.email.status === 'unavailable') {
            newErrors.email = availability.email.message === 'Email Already Registered'
                ? 'Email Is Already Registered'
                : 'Email Is Not Available';
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
            console.error('Registration Error:', error);

            if (error.errors) {
                setErrors(error.errors);
            } else {
                setErrors({
                    general: error.message || 'Registration Failed. Please Try Again.'
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
                            We've Sent A Verification Email To <strong>{registeredEmail}</strong>.
                            Please Check Your Inbox And Click The Verification Link To Activate Your Account.
                        </p>
                        <div className="verification-buttons">
                            <button
                                className="resend-btn"
                                onClick={async () => {
                                    try {
                                        await authService.resendVerificationEmail(registeredEmail);
                                        alert('Verification Email Sent!');
                                    } catch (error) {
                                        alert('Failed To Send Email: ' + error.message);
                                    }
                                }}
                            >
                                Resend Email
                            </button>
                            <button
                                className="back-btn"
                                onClick={() => navigate('/login')}
                            >
                                Go To Login
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
                <div className="brand-section">
                    <h1 className="brand-title">Fliora</h1>
                    <p className="brand-tagline">Stream Movies Together</p>
                </div>

                <h2 className="form-title">Create Account</h2>
                <p className="register-subtitle">Join The Ultimate Movie Streaming Experience With Your Friends</p>

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
                                placeholder="Choose a unique username"
                                autoComplete="username"
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
                        <div className="field-hint">
                            <small>3-15 Characters, Letters, Numbers And Underscores Only</small>
                        </div>
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
                                autoComplete="email"
                            />
                            {formData.email && (
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
                        <div className="password-input-container">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="Create a strong password"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => togglePasswordVisibility('password')}
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
                        {formData.password && passwordStrength.text && (
                            <div className="password-strength">
                                <div className={`password-strength-bar strength-${passwordStrength.score}`}></div>
                                <div
                                    className="password-strength-text"
                                    style={{ color: passwordStrength.color }}
                                >
                                    Password Strength: {passwordStrength.text}
                                </div>
                            </div>
                        )}
                        {errors.password && (
                            <span className="error-message">{errors.password}</span>
                        )}
                        <div className="password-requirements">
                            <small>Must Contain: Lowercase, Uppercase, Number, And Special Character (@$!%*?&)</small>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">
                            Confirm Password
                        </label>
                        <div className="password-input-container">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`form-input ${errors.confirmPassword ? 'error' :
                                    formData.confirmPassword && formData.password === formData.confirmPassword ? 'success' : ''}`}
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => togglePasswordVisibility('confirmPassword')}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? (
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
                    Already Have An Account? <Link to="/login" className="form-link">Sign In Here</Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;