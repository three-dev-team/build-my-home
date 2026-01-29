import axios from 'axios';

const API = axios.create({
  baseURL: '/api/member',
});

// 토큰 저장소가 섞여 있어도 안전하게 가져오도록 처리
function getToken() {
  return sessionStorage.getItem('token');
}

// 토큰이 있다면 모든 요청 헤더에 자동으로 포함
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// [중복 로그인 처리] 401 에러 감지 시 강제 로그아웃
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // 401 Unauthorized: 토큰 만료 혹은 중복 로그인으로 인한 차단
      const msg = error.response.data?.message || '로그아웃 되었습니다.';

      // 이미 로그아웃 처리 중이 아니라면 실행
      if (sessionStorage.getItem('token') || localStorage.getItem('token')) {
        // alert('다른 기기에서 접속하여 로그아웃 되었습니다.'); // alert 제거
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        // window.location.href = '/'; // 바로 이동하지 않고 이벤트 발송
        window.dispatchEvent(new CustomEvent('forceLogout'));
      }
    }
    return Promise.reject(error);
  },
);

export const join = (data) => API.post('/join', data);
export const login = (data) => API.post('/login', data);
export const getMemberInfo = () => API.get('/me');
export const updateNickname = (data) => API.put('/nickname', data);
export const withdraw = () => API.delete('/withdraw');
export const unlinkSocialAccount = (provider) => API.delete(`/social/${provider}`);
