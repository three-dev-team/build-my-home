import AspectLayout from '../layout/AspectLayout';

/**
 * 공용 로딩 컴포넌트
 * @param {string} message - 로딩 메시지 (기본값: "로딩 중입니다...")
 * @param {string} backgroundImage - 배경 이미지 URL (기본값: 없음, 단색 배경)
 * @param {string} backgroundColor - 배경 색상 (기본값: #fdf6e3)
 */
export default function Loading({ message = '로딩 중입니다...', backgroundImage = null, backgroundColor = '#fdf6e3' }) {
  return (
    <AspectLayout>
      <div
        className="w-full h-full flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundColor: backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        }}
      >
        <div className="flex flex-col items-center gap-[1cqw]">
          {/* 애니메이션 효과로 처리 중임을 알림 */}
          <div className="text-[3cqw] animate-bounce"></div>
          <div className="text-[2cqw] font-black text-[#8b5a2b]">{message}</div>
        </div>
      </div>
    </AspectLayout>
  );
}
