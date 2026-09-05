// lib/api.js - Axios instance configured for the backend API
import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token if available
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = Cookies.get('auth_token') || localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 gracefully without redirect loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/me') || url.includes('/auth/login');
      const isLoginPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/login');

      // Clear token
      if (typeof window !== 'undefined') {
        Cookies.remove('auth_token');
        localStorage.removeItem('auth_token');
      }

      // Only redirect if NOT already on login page and NOT an auth check
      if (typeof window !== 'undefined' && !isLoginPage && !isAuthEndpoint) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
