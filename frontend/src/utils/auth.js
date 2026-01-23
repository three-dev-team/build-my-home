export const getMyIdFromToken = () => {
  const token = sessionStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // 토큰 만료 시간 체크 (exp는 초 단위)
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      console.warn('토큰이 만료되었습니다. 로그아웃 처리합니다.');
      sessionStorage.removeItem('token');
      return null;
    }

    return payload.memberId;
  } catch (e) {
    console.error('토큰 파싱 실패:', e);
    sessionStorage.removeItem('token');
    return null;
  }
};
