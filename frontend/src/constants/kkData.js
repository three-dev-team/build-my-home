// src/constants/kkConstants.js
// TODO: 반드시 서버 데이터(GameConstants.java)와 일치해야 함

export const KK_CONFIG = {
  ENTRY_FEE: 100, // 나중에 서버에서 받아오기 전까지 임시로 사용
};

export const KK_SONGS = [
  { id: 1, title: '발라드', audio: '/audio/kk-ballad.mp3', mood: 'ballad' },
  { id: 2, title: '힙합', audio: '/audio/kk-hiphop.mp3', mood: 'hiphop' },
];

export const KK_MOOD_CONFIG = {
  ballad: { image: '/images/kk-ballad-background.jpeg' },
  hiphop: { image: '/images/kk-hiphop-background.jpeg' },
};
