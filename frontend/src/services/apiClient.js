import axios from "axios";

// Use the same domain for API calls (since both frontend and backend are on Railway)
const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? window.location.origin  // Same domain as the frontend
    : 'http://localhost:8080';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

apiClient.interceptors.request.use(
    (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('Response error:', error);

        if(error.response?.status === 401) {
            console.log('Unauthorized access');
        }

        return Promise.reject(error);
    }
);

export default apiClient;