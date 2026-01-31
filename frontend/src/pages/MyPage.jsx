import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMemberInfo, updateNickname, withdraw, unlinkSocialAccount } from '../api/memberApi';
import ExitButton from '../components/common/ExitButton';
import TopButtons from '../components/common/TopButtons';
import { CameraIcon } from '@heroicons/react/24/solid';

// --- 소셜 아이콘 컴포넌트 - 크기는 부모에서 제어하므로 w/h는 100%로 설정하거나 상속받음 ---
const GoogleIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_d_1_2)">
      <path
        d="M28 13C29.9 13 31.7 13.7 33 14.9L38.4 9.5C35.6 6.9 32 5.3 28 5.3C19.3 5.3 11.9 10.8 9.2 18.5L15.5 23.4C17.4 17.4 22.3 13 28 13Z"
        fill="#EA4335"
      />
      <path
        d="M28 43C22.3 43 17.4 38.6 15.5 32.6L9.2 37.5C11.9 45.2 19.3 50.7 28 50.7C34.2 50.7 39.4 48.7 43.2 45.2L37.3 40.6C35.3 42 32.4 43 28 43Z"
        fill="#34A853"
      />
      <path
        d="M15.5 32.6C15 31.1 14.7 29.6 14.7 28C14.7 26.4 15 24.9 15.5 23.4L9.2 18.5C8.1 21.4 7.5 24.6 7.5 28C7.5 31.4 8.1 34.6 9.2 37.5L15.5 32.6Z"
        fill="#FBBC05"
      />
      <path
        d="M50 28C50 26.4 49.8 24.8 49.4 23.3H28V32H40.7C40.2 34.9 38.3 38.3 37.3 40.6L43.2 45.2C47 41.6 50 35.6 50 28Z"
        fill="#4285F4"
      />
    </g>
  </svg>
);

const KakaoIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_d_1_3)">
      <path
        d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z"
        fill="#FAE100"
        stroke="#E3CD12"
        strokeWidth="3"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M28 15C19.1634 15 12 20.7622 12 27.871C12 32.4842 14.9388 36.561 19.3891 38.8687C19.1416 40.4074 18.2435 44.2045 18.0667 44.8962C17.9252 45.5413 18.6675 45.9298 19.2042 45.5539C20.4777 44.6644 24.5772 41.8398 26.6997 40.354C27.1272 40.3952 27.5606 40.4187 28 40.4187C36.8366 40.4187 44 34.6565 44 27.5478C44 20.439 36.8366 15 28 15Z"
        fill="#371D1E"
      />
    </g>
  </svg>
);

const NaverIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_d_1_4)">
      <path
        d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z"
        fill="#03C75A"
        stroke="#02A449"
        strokeWidth="3"
      />
      <path d="M16.4 16H24.8L33.2 28.5V16H39.6V40H31.2L22.8 27.5V40H16.4V16Z" fill="white" />
    </g>
  </svg>
);

export default function MyPage() {
  const navigate = useNavigate();
  const nicknameInputRef = useRef(null);

  const [userData, setUserData] = useState({
    nickname: '',
    email: '',
    bell: 0,
    level: 1,
    role: 'MEMBER',
    characterId: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [isConfirmStep, setIsConfirmStep] = useState(false);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawConfirmStep, setIsWithdrawConfirmStep] = useState(false);

  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [unlinkProvider, setUnlinkProvider] = useState('');

  // 캐릭터 이미지 매핑
  const getCharacterImage = (id) => {
    // TODO: 실제 characterId 기반 이미지 매핑
    return '/images/room/char-apple-idle.webp';
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = sessionStorage.getItem('token');
      if (!token) return navigate('/');

      try {
        const res = await getMemberInfo();
        console.log('FETCHED USER DATA:', res.data);
        setUserData(res.data);
        setEditNickname(res.data.nickname);
        sessionStorage.setItem('role', res.data.role);
        setIsLoading(false);
      } catch (e) {
        console.error(e);
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleWithdraw = async () => {
    try {
      await withdraw();
      alert('그동안 마이홈과 함께해주셔서 감사합니다. 🕊️');
      sessionStorage.clear();
      navigate('/');
    } catch (e) {
      console.error(e);
      alert('탈퇴 처리 중 오류가 발생했습니다.');
      setIsWithdrawModalOpen(false);
    }
  };

  const handleLinkAccount = (provider) => {
    if (!userData.id) {
      alert('계정 식별 정보를 불러오지 못했습니다. 다시 시도해주세요.');
      return;
    }
    document.cookie = `LINK_MEMBER_ID=${userData.id}; path=/; max-age=600`;
    window.location.href = `/oauth2/authorization/${provider}`;
  };

  const handleUnlinkClick = (provider) => {
    setUnlinkProvider(provider);
    setIsUnlinkModalOpen(true);
  };

  const confirmUnlink = async () => {
    try {
      await unlinkSocialAccount(unlinkProvider);
      alert('연동이 해제되었습니다.');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert(`연동 해제 실패: ${e.message}`);
    } finally {
      setIsUnlinkModalOpen(false);
    }
  };

  const handleSaveNickname = async () => {
    try {
      await updateNickname({ nickname: editNickname });
      alert('닉네임이 변경되었습니다! 다시 로그인해 주세요.');
      sessionStorage.clear();
      navigate('/');
    } catch (e) {
      if (e.response && e.response.status === 409) {
        alert('이미 사용 중인 닉네임입니다.');
      } else {
        alert('변경에 실패했습니다.');
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsConfirmStep(false);
    setEditNickname(userData.nickname);
  };

  if (isLoading) return null;

  return (
    // 전체 뷰포트를 채우는 배경색 (보통 배경 이미지의 주색상이나 어두운 색)
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* 16:9 비율 유지 컨테이너
          - w-full aspect-video: 가로 꽉 채우고 16:9 비율 유지 (높이 자동)
          - max-h-screen: 높이가 화면보다 커지면 안됨 (이 경우 가로가 줄어듦)
          - container-type: size -> 내부에서 cqw 단위 사용 가능
      */}
      <div
        className="relative w-full aspect-video max-h-screen  overflow-hidden"
        style={{
          backgroundImage: "url('/images/mypage/bg-mypage.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          containerType: 'size',
        }}
      >
        {/* --- 상단 아이콘 영역 --- */}

        {/* 홈 버튼 (좌측 상단) - Top 40px, Left 40px (1920x1080 기준) -> Top 3.7%, Left 2.08% */}
        <div className="absolute top-[3.7%] left-[2.08%] z-50">
          <button
            onClick={() => navigate('/home')}
            className="w-[4.17cqw] h-[4.17cqw] bg-white rounded-full flex items-center justify-center  hover:scale-105 transition-transform cursor-pointer border-[0.16cqw] border-white"
          >
            <div
              className="w-[2.08cqw] h-[2.08cqw] bg-[#594E36]"
              style={{
                maskImage: 'url("/images/icon-home.svg")',
                WebkitMaskImage: 'url("/images/icon-home.svg")',
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />
          </button>
        </div>

        {/* TopButtons (우측 상단) - Top 40px, Right 40px -> Top 3.7%, Right 2.08% */}
        <div className="absolute top-[3.7%] right-[2.08%] z-50">
          {/* TopButtons 스케일링을 위해 div로 감쌈 */}
          <div style={{ transform: 'scale(1)', transformOrigin: 'top right' }}>
            <TopButtons
              nickname={userData.nickname || '주민'}
              onProfileClick={() => {}}
              onBellClick={() => navigate('/notifications')}
              onConfigClick={() => navigate('/config')}
              showShadow={false}
              colors={{
                text: '#594E36',
                badgeBg: '#FDFBF6',
                badgeText: '#594E36',
              }}
            />
          </div>
        </div>

        {/* --- 주민증 카드 (메인 영역) --- */}

        {/* 1. 캐릭터 이미지 영역 
            - Top 36% (388px), Left 22% (422px) -> Top 36%, Left 22%
            - Width 292px (15.2%), Height 292px
            - Radius 64px (3.3%)
        */}
        <div className="absolute top-[36.5%] left-[22%] w-[15.21%] aspect-square bg-[#FFD7D7] rounded-[22%] flex items-center justify-center group relative">
          <img
            src={getCharacterImage(userData.characterId)}
            alt="character"
            className="w-[82%] h-[82%] object-contain"
          />

          {/* 역할 배지 (좌측 하단 외부) 
              - Bottom -12% (outside), Left 5%
              - Background Color: #00C73C (Jumin), #FF4F4F (Admin)
          */}
          <div
            className={`absolute -bottom-[24%] left-[5%] px-[0.8cqw] py-[0.3cqw] rounded-full text-white text-[0.9cqw] font-bold z-10 ${
              userData.role === 'ADMIN' ? 'bg-[#FF4F4F]' : 'bg-[#00C73C]'
            }`}
          >
            {userData.role === 'ADMIN' ? 'admin' : '주민'}
          </div>

          {/* 프로필 사진 변경 버튼 (우측 하단 외부)
              - Bottom -12% (outside), Right 5%
          */}
          <button
            className="absolute -bottom-[24%] right-[5%] w-[12%] aspect-square bg-[#6B5B45] rounded-[0.5cqw] flex items-center justify-center hover:scale-110 transition"
            title="프로필 사진 변경"
          >
            <CameraIcon className="w-[60%] h-[60%] text-[#FDFBF6]" />
          </button>
        </div>

        {/* 등록일 
            - Top 80.4%, Left 30%
            - Font 28px -> 1.46cqw
        */}
        <div className="absolute top-[80.4%] left-[30%] text-[1.46cqw] font-bold text-[#8B7D6B]">2026년 01월 28일</div>

        {/* 2. 우측 정보 영역 
            - Top 34%, Left 43%
            - Gap 32px -> 1.67cqw
        */}
        <div className="absolute top-[33%] left-[43%] flex flex-col items-start gap-[1.67cqw]">
          {/* 닉네임 섹션 */}
          <div className="flex flex-col gap-0">
            <span className="text-[1.04cqw] font-bold text-[#594E36] opacity-80 pl-[0.1cqw]">닉네임</span>
            <div className="flex items-center gap-[0.83cqw]">
              <span className="text-[2.6cqw] font-black text-[#594E36] leading-none pt-[0.2cqw]">
                {userData.nickname}
              </span>

              {/* 닉네임 수정 버튼 
                  - Size 38px -> 1.98cqw 
              */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-[1.98cqw] h-[1.98cqw] bg-[#7A7061] rounded-full flex items-center justify-center hover:scale-110 transition mt-[0.2cqw]"
                title="닉네임 변경"
              >
                <svg
                  width="50%"
                  height="50%"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* 이메일 섹션 */}
          <div className="flex flex-col gap-0 mt-[0.4cqw]">
            <span className="text-[1.04cqw] font-bold text-[#594E36] opacity-80 pl-[0.1cqw]">연결된 이메일</span>
            <span className="text-[1.46cqw] font-black text-[#7A7061] leading-tight pt-[0.2cqw]">
              {userData.email || '이메일 정보 없음'}
            </span>
          </div>

          {/* 소셜 계정 섹션 */}
          <div className="flex flex-col gap-[0.4cqw] mt-[0.8cqw]">
            <div className="flex items-end gap-[0.4cqw] mb-[0.2cqw]">
              <span className="text-[1.04cqw] font-bold text-[#594E36] pl-[0.1cqw]">소셜 계정 연동</span>
              <span className="text-[0.73cqw] font-bold text-[#8B7D6B] pb-[0.2cqw]">
                *아이콘을 눌러 연동하세요 (재클릭 시 해제)
              </span>
            </div>

            <div className="flex gap-[0.83cqw]">
              {/* Google - Size 56px -> 2.92cqw */}
              <button
                onClick={() => (userData.googleId ? handleUnlinkClick('google') : handleLinkAccount('google'))}
                className={`w-[2.92cqw] h-[2.92cqw] transition hover:scale-110 ${userData.googleId ? '' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
              >
                <GoogleIcon />
              </button>

              {/* Kakao */}
              <button
                onClick={() => (userData.kakaoId ? handleUnlinkClick('kakao') : handleLinkAccount('kakao'))}
                className={`w-[2.92cqw] h-[2.92cqw] transition hover:scale-110 ${userData.kakaoId ? '' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
              >
                <KakaoIcon />
              </button>

              {/* Naver */}
              <button
                onClick={() => (userData.naverId ? handleUnlinkClick('naver') : handleLinkAccount('naver'))}
                className={`w-[2.92cqw] h-[2.92cqw] transition hover:scale-110 ${userData.naverId ? '' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
              >
                <NaverIcon />
              </button>
            </div>
          </div>
        </div>

        {/* --- 좌측 하단 탈퇴하기 버튼 --- 
            - Bottom 32px (3%), Left 32px (1.67%)
            - Padding 16px 32px
            - Font 24px
        */}
        <button
          onClick={() => setIsWithdrawModalOpen(true)}
          className="absolute bottom-[3%] left-[1.67%] bg-[#FFFBF0] w-[10.6cqw] h-[3.2cqw] rounded-[1.6cqw] flex items-center justify-center text-[1.6cqw] font-black text-[#6B5B45] hover:bg-[#F2E8D5] transition active:scale-95 pt-[0.5cqw]"
        >
          탈퇴하기
        </button>

        {/* --- 우측 하단 나가기 버튼 --- 
            - Bottom 32px (3%), Right 32px (1.67%)
            - ExitButton 내부 스타일도 확인 필요하지만 일단 위치 잡기
        */}
        <div className="absolute bottom-[3%] right-[1.67%]">
          <ExitButton onClick={() => navigate('/home')} showShadow={false} />
        </div>
      </div>

      {/* --- 모달들 (z-index 최상위로 뷰포트 전체 커버) --- */}

      {/* 닉네임 변경 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#FFFCEF] w-[20.8cqw] p-[1.67cqw] rounded-[2cqw] border-[0.3cqw] border-[#8b5a2b]  text-center">
            {!isConfirmStep ? (
              <>
                <h3 className="text-[1.25cqw] font-black text-[#8b5a2b] mb-[1.1cqw]">이름 변경하기</h3>
                <input
                  ref={nicknameInputRef}
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full p-[0.83cqw] rounded-[0.83cqw] bg-white border-[0.16cqw] border-[#DED0A6] text-[#5d4037] font-bold text-center text-[1.04cqw] mb-[1.1cqw] outline-none"
                  placeholder="새 이름을 입력하세요"
                />
                <div className="flex gap-[0.83cqw]">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-[1.1cqw] bg-[#DED0A6] rounded-[0.83cqw] font-bold text-[#5d4037]"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setIsConfirmStep(true)}
                    className="flex-1 py-[1.1cqw] bg-[#8b5a2b] rounded-[0.83cqw] font-bold text-white"
                  >
                    변경
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-[1.25cqw] font-black text-[#8b5a2b] mb-[0.7cqw]">정말 바꿀까요?</h3>
                <p className="text-[#5d4037] text-[0.94cqw] font-bold mb-[1.1cqw]">
                  <span className="text-[#bc8a5f]">"{editNickname}"</span>(으)로
                  <br />
                  결정하시겠습니까?
                </p>
                <div className="flex gap-[0.83cqw]">
                  <button
                    onClick={() => setIsConfirmStep(false)}
                    className="flex-1 py-[1.1cqw] bg-[#DED0A6] rounded-[0.83cqw] font-bold text-[#5d4037]"
                  >
                    아니오
                  </button>
                  <button
                    onClick={handleSaveNickname}
                    className="flex-1 py-[1.1cqw] bg-[#e2f0a1] border-[0.16cqw] border-[#8b5a2b] rounded-[0.83cqw] font-bold text-[#8b5a2b]"
                  >
                    네!
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 탈퇴 모달 */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#FFFCEF] w-[20.8cqw] p-[1.67cqw] rounded-[2cqw] border-[0.3cqw] border-[#D32F2F]  text-center">
            {!isWithdrawConfirmStep ? (
              <>
                <h3 className="text-[1.25cqw] font-black text-[#D32F2F] mb-[0.7cqw]">마이홈을 떠나시나요?</h3>
                <p className="text-[#5d4037] mb-[1.1cqw] font-bold text-[0.83cqw]">모든 데이터가 삭제됩니다.</p>
                <div className="flex gap-[0.83cqw]">
                  <button
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="flex-1 py-[1.1cqw] bg-gray-200 rounded-[0.83cqw] font-bold text-[0.83cqw]"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setIsWithdrawConfirmStep(true)}
                    className="flex-1 py-[1.1cqw] bg-[#D32F2F] text-white rounded-[0.83cqw] font-bold text-[0.83cqw]"
                  >
                    탈퇴하기
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-[1.25cqw] font-black text-[#D32F2F] mb-[0.7cqw]">마지막 확인!</h3>
                <p className="text-[#5d4037] mb-[1.1cqw] font-bold text-[0.83cqw]">정말로 탈퇴하시겠습니까?</p>
                <div className="flex gap-[0.83cqw]">
                  <button
                    onClick={() => setIsWithdrawConfirmStep(false)}
                    className="flex-1 py-[1.1cqw] bg-gray-200 rounded-[0.83cqw] font-bold text-[0.83cqw]"
                  >
                    아니오
                  </button>
                  <button
                    onClick={handleWithdraw}
                    className="flex-1 py-[1.1cqw] bg-[#FFB3B3] text-[#D32F2F] border-[0.16cqw] border-[#D32F2F] rounded-[0.83cqw] font-bold text-[0.83cqw]"
                  >
                    네, 탈퇴합니다
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 연동 해제 모달 */}
      {isUnlinkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#FFFCEF] w-[20.8cqw] p-[1.67cqw] rounded-[2cqw] border-[0.3cqw] border-[#8b5a2b] text-center">
            <h3 className="text-[1.25cqw] font-black text-[#8b5a2b] mb-[0.7cqw]">{unlinkProvider} 연동 해제</h3>
            <p className="text-[#5d4037] mb-[1.1cqw] font-bold text-[0.83cqw]">연동을 해제하시겠습니까?</p>
            <div className="flex gap-[0.83cqw]">
              <button
                onClick={() => setIsUnlinkModalOpen(false)}
                className="flex-1 py-[1.1cqw] bg-gray-200 rounded-[0.83cqw] font-bold text-[0.83cqw]"
              >
                취소
              </button>
              <button
                onClick={confirmUnlink}
                className="flex-1 py-[1.1cqw] bg-[#8b5a2b] text-white rounded-[0.83cqw] font-bold text-[0.83cqw]"
              >
                해제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
