import apiClient from "./apiClient";

const authService = {
    register: async (userData) => {
        try {
            const response = await apiClient.post('/api/auth/register', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Registration failed' };
        }
    },

    login: async (credentials) => {
        try {
            const response = await apiClient.post('/api/auth/login', credentials);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Login failed' };
        }
    },

    logout: async () => {
        try {
            const response = await apiClient.post('/api/auth/logout');
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Logout failed' };
        }
    },

    checkSession: async () => {
        try {
            const response = await apiClient.get('/api/auth/session');
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Session check failed' };
        }
    },

    resendVerificationEmail: async (email) => {
        try {
            const response = await apiClient.post('/api/auth/resend-verification', { email });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to resend verification email' };
        }
    },

    checkAvailability: async (type, value) => {
        try {
            const response = await apiClient.get(`/api/auth/check-availability?type=${type}&value=${encodeURIComponent(value)}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Availability check failed' };
        }
    }
};

export default authService;