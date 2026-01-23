import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f5dc] text-[#5d4037]">
      <div className="text-9xl mb-4">🏠</div>
      <h1 className="text-6xl font-bold mb-4 font-['Gamja_Flower']">404</h1>
      <p className="text-2xl mb-8 font-['Gamja_Flower']">길을 잃으셨나요? 페이지를 찾을 수 없습니다.</p>
      <Link
        to="/home"
        className="px-6 py-3 bg-[#8d6e63] text-white rounded-lg hover:bg-[#6d4c41] transition-colors font-bold shadow-md"
      >
        마이홈으로 돌아가기
      </Link>
    </div>
  );
};

export default NotFound;
