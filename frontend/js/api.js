const API_BASE_URL = '/api';

// Core Fetch Wrapper
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token expired or invalid authorization
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.endsWith('index.html') && 
                    !window.location.pathname.endsWith('login.html') && 
                    !window.location.pathname.endsWith('register.html') && 
                    window.location.pathname !== '/') {
                    window.location.href = 'login.html';
                }
            }
            throw new Error(data.message || 'API request failed.');
        }

        return data;
    } catch (err) {
        console.error(`[API FETCH ERROR - ${endpoint}]`, err.message);
        throw err;
    }
}

// Authentication Check Helper
function checkAuth(requiredRole = null) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        window.location.href = 'login.html';
        return null;
    }

    if (requiredRole && user.role !== requiredRole) {
        alert('Access denied. Insufficient permissions.');
        window.location.href = user.role === 'ADMIN' ? 'admin-dashboard.html' : 'student-dashboard.html';
        return null;
    }

    return user;
}

// Logout Utility
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}