import axios from 'axios';

const API = axios.create({
  baseURL: "/api/member",
});

// 토큰 저장소가 섞여 있어도 안전하게 가져오도록 처리
function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

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