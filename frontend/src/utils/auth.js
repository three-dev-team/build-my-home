export const getMyIdFromToken = () => {
    const token = sessionStorage.getItem('token');
    if (!token) return null;

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.memberId;
};