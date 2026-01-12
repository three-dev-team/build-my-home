import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8088/api/member',
});

// 토큰이 있다면 모든 요청 헤더에 자동으로 포함
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const join = (data) => API.post('/join', data);
export const login = (data) => API.post('/login', data);