import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AspectLayout from '../components/layout/AspectLayout';

const NotFound = () => {
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const fullText = '거긴 길이 없다고!\n갑자기 툭 튀어나오면 어쩌자는 거야!\n제대로 된 주소 치고 돌아가!';
  const typingSpeed = 30; // ms per character

  // 타이핑 애니메이션
  useEffect(() => {
    if (!isTyping) return;

    let currentIndex = 0;
    const timer = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [isTyping]);

  // 클릭 핸들러 (타이핑 중이면 완료, 완료됐으면 선택지 표시)
  const handleBubbleClick = () => {
    if (isTyping) {
      setDisplayedText(fullText);
      setIsTyping(false);
    } else {
      setShowOptions(true);
    }
  };

  // 스페이스바로 타이핑 스킵 또는 선택지 표시
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleBubbleClick();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isTyping, showOptions]);

  // 엔터키로 나가기 선택
  useEffect(() => {
    if (!showOptions) return;

    const handleKeyPress = (e) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        navigate('/home');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showOptions, navigate]);

  return (
    <AspectLayout>
      <div
        className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/404.png)' }}
      >
        {/* 커스텀 말풍선 (404 페이지 전용) */}
        <div
          className="absolute bottom-12 left-0 right-0 px-4 flex justify-center z-[2000] cursor-pointer font-gaegu"
          onClick={handleBubbleClick}
        >
          <div className="relative w-full max-w-[70cqw]">
            {/* 도루묵 이름표 */}
            <div
              className="absolute -top-4 left-10 h-9 px-6 flex items-center justify-center rounded-full z-20 shadow-sm"
              style={{ backgroundColor: '#8b5a2b' }}
            >
              <span className="text-[#FFF8EC] font-bold text-xl tracking-wider pt-1">도루묵씨</span>
            </div>

            {/* 말풍선 */}
            <div
              className="relative rounded-[50px] p-8 pb-10 text-left w-full z-10 min-h-[140px] flex items-center justify-center"
              style={{
                backgroundColor: '#FFF8EC',
                color: '#594E36',
                boxShadow: '0 8px 0 rgba(0,0,0,0.05), 0 15px 20px rgba(0,0,0,0.1)',
              }}
            >
              <div className="relative z-10 text-[2cqw] font-bold leading-relaxed whitespace-pre-wrap word-break-keep-all pt-2">
                {displayedText}
              </div>
            </div>

            {/* 꼬리 */}
            <div
              className="absolute left-1/2 -bottom-4 transform -translate-x-1/2 z-20 drop-shadow-sm"
              style={{ color: '#FFF8EC' }}
            >
              <svg width="40" height="25" viewBox="0 0 40 25" fill="currentColor">
                <path d="M0 0 Q20 25 40 0 Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 선택지 (타이핑 완료 후 표시) */}
        {showOptions && (
          <div className="absolute bottom-[40%] right-[8%] z-[2001]">
            <div className="bg-[#FFFACD] rounded-[2.08cqw] px-[2.08cqw] py-[1.04cqw] shadow-lg">
              <div className="flex items-center gap-[1.04cqw]">
                <img
                  src="/images/icon-cursor.webp"
                  alt="cursor"
                  className="w-[2.5cqw] h-auto animate-pulse rotate-90"
                />
                <button
                  onClick={() => navigate('/home')}
                  className="text-[1.56cqw] font-black text-[#594E36] hover:text-[#8b5a2b] transition-colors"
                >
                  돌아가자..
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AspectLayout>
  );
};

export default NotFound;
