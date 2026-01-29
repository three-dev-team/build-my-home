import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMemberInfo, updateNickname, withdraw, unlinkSocialAccount } from '../api/memberApi';
import ExitButton from '../components/common/ExitButton';
import TopButtons from '../components/common/TopButtons';
import { HomeIcon, CameraIcon } from '@heroicons/react/24/solid';

// --- 소셜 아이콘 컴포넌트 ---
const GoogleIcon = ({ width = '56', height = '56' }) => (
  <svg width={width} height={height} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
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

const KakaoIcon = ({ width = '56', height = '56' }) => (
  <svg width={width} height={height} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
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

const NaverIcon = ({ width = '56', height = '56' }) => (
  <svg width={width} height={height} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    characterId: 1, // Default character ID if missing
  });
  const [isLoading, setIsLoading] = useState(true);

  // 닉네임 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [isConfirmStep, setIsConfirmStep] = useState(false);

  // 회원 탈퇴 모달 상태
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawConfirmStep, setIsWithdrawConfirmStep] = useState(false);
  // 연동 해제 모달 상태
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [unlinkProvider, setUnlinkProvider] = useState('');

  // 캐릭터 이미지 매핑
  const getCharacterImage = (id) => {
    // TODO: 실제 characterId 기반 이미지 매핑 로직 필요
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
    <div
      className="relative w-full h-screen flex items-center justify-center overflow-hidden font-sans"
      style={{
        backgroundImage: "url('/images/mypage/bg-mypage.jpg')",
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
      }}
    >
      {/* 2026 배경 패턴(세모 등)은 CSS로 처리하거나 이미지에 포함되어 있다고 가정 */}

      {/* 1. 상단 아이콘 영역 */}
      {/* 홈 버튼 (좌측 상단) */}
      <div className="absolute top-[40px] left-[40px] z-50">
        <button
          onClick={() => navigate('/home')}
          className="w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer border-[3px] border-white"
        >
          <HomeIcon className="w-10 h-10 text-[#594E36]" />
        </button>
      </div>

      {/* TopButtons (우측 상단) */}
      <div className="absolute top-[40px] right-[40px] z-50">
        <TopButtons
          nickname={userData.nickname || '주민'}
          onProfileClick={() => {}} // 이미 마이페이지이므로 동작 없음 or 새로고침?
          onBellClick={() => navigate('/notifications')}
          onConfigClick={() => navigate('/config')}
          colors={{
            text: '#594E36',
            badgeBg: '#FDFBF6',
            badgeText: '#594E36',
          }}
        />
      </div>

      {/* --- 주민증 카드 (메인 영역) --- */}
      <div className="absolute inset-0 w-full h-full">
        {/* 1. 캐릭터 이미지 영역 - 수정된 디자인 적용 */}
        <div className="absolute top-[36%] left-[22%] w-[292px] h-[292px] bg-[#FFD7D7] rounded-[64px] flex items-center justify-center shadow-inner relative group">
          <img
            src={getCharacterImage(userData.characterId)}
            alt="character"
            className="w-[240px] h-[240px] object-contain drop-shadow-md"
          />
          {/* 프로필 사진 변경 버튼 */}
          <button
            className="absolute -bottom-[60px] -right-[20px] w-[45px] h-[45px] bg-[#594E36] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition border-[3px] border-white"
            title="프로필 사진 변경"
          >
            <CameraIcon className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* 관리자 배지 위치 및 스타일 조정 */}
        {userData.role === 'ADMIN' && (
          <div className="absolute top-[65%] left-[27.8%] bg-[#FF4F4F] text-white w-[100px] h-[40px] flex items-center justify-center rounded-[20px] text-[20px] font-black border-[2px] border-white shadow-md z-10">
            관리자
          </div>
        )}

        {/* 등록일 위치 조정 */}
        <div className="absolute top-[80.4%] left-[30%] text-[28px] font-bold text-[#8B7D6B]">2026년 01월 28일</div>

        {/* 2. 우측 정보 영역 - Top 37% (from char top), Left 46.6% */}
        <div className="absolute top-[34%] left-[43%] flex flex-col items-start gap-8">
          {/* 닉네임 섹션 */}
          <div className="flex flex-col gap-0">
            <span className="text-[20px] font-bold text-[#594E36] opacity-80 pl-1">닉네임</span>
            <div className="flex items-center gap-4">
              <span className="text-[40px] font-black text-[#594E36] leading-none pt-1">{userData.nickname}</span>
              {/* 닉네임 수정 버튼 */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-[38px] h-[38px] bg-[#7A7061] rounded-full flex items-center justify-center hover:scale-110 transition mt-1"
                title="닉네임 변경"
              >
                <svg
                  width="20"
                  height="20"
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
          <div className="flex flex-col gap-0 mt-2">
            <span className="text-[20px] font-bold text-[#594E36] opacity-80 pl-1">연결된 이메일</span>
            <span className="text-[28px] font-black text-[#7A7061] leading-tight pt-1">
              {userData.email || '이메일 정보 없음'}
            </span>
          </div>

          {/* 소셜 계정 섹션 */}
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex items-end gap-2 mb-1">
              <span className="text-[20px] font-bold text-[#594E36] pl-1">소셜 계정 연동</span>
              <span className="text-[14px] font-bold text-[#8B7D6B] pb-[3px]">
                *아이콘을 눌러 연동하세요 (재클릭 시 해제)
              </span>
            </div>

            <div className="flex gap-4">
              {/* Google */}
              <button
                onClick={() => (userData.googleId ? handleUnlinkClick('google') : handleLinkAccount('google'))}
                className={`transition hover:scale-110 ${userData.googleId ? '' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
              >
                <GoogleIcon width="64" height="64" />
              </button>

              {/* Kakao */}
              <button
                onClick={() => (userData.kakaoId ? handleUnlinkClick('kakao') : handleLinkAccount('kakao'))}
                className={`transition hover:scale-110 ${userData.kakaoId ? '' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
              >
                <KakaoIcon width="64" height="64" />
              </button>

              {/* Naver */}
              <button
                onClick={() => (userData.naverId ? handleUnlinkClick('naver') : handleLinkAccount('naver'))}
                className={`transition hover:scale-110 ${userData.naverId ? '' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
              >
                <NaverIcon width="64" height="64" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- 좌측 하단 탈퇴하기 버튼 --- */}
      <button
        onClick={() => setIsWithdrawModalOpen(true)}
        className="absolute bottom-8 left-8 bg-[#FFFBF0] px-8 py-3 rounded-full text-[24px] font-black text-[#594E36] shadow-lg border-2 border-[#EAD7B8] hover:bg-[#F2E8D5] transition active:scale-95"
      >
        탈퇴하기
      </button>

      {/* --- 우측 하단 나가기 버튼 --- */}
      <ExitButton onClick={() => navigate('/home')} className="absolute bottom-8 right-8" />

      {/* --- 모달들 (닉네임 변경, 탈퇴, 연동해제 등) --- */}
      {/* 1. 닉네임 변경 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#FFFCEF] w-[400px] p-8 rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl text-center">
            {!isConfirmStep ? (
              <>
                <h3 className="text-2xl font-black text-[#8b5a2b] mb-6">이름 변경하기</h3>
                <input
                  ref={nicknameInputRef}
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-white border-2 border-[#DED0A6] text-[#5d4037] font-bold text-center text-xl mb-6 outline-none"
                  placeholder="새 이름을 입력하세요"
                />
                <div className="flex gap-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 bg-[#DED0A6] rounded-2xl font-bold text-[#5d4037]"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setIsConfirmStep(true)}
                    className="flex-1 py-3 bg-[#8b5a2b] rounded-2xl font-bold text-white"
                  >
                    변경
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-black text-[#8b5a2b] mb-4">정말 바꿀까요?</h3>
                <p className="text-[#5d4037] text-lg font-bold mb-6">
                  <span className="text-[#bc8a5f]">"{editNickname}"</span>(으)로
                  <br />
                  결정하시겠습니까?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsConfirmStep(false)}
                    className="flex-1 py-3 bg-[#DED0A6] rounded-2xl font-bold text-[#5d4037]"
                  >
                    아니오
                  </button>
                  <button
                    onClick={handleSaveNickname}
                    className="flex-1 py-3 bg-[#e2f0a1] border-2 border-[#8b5a2b] rounded-2xl font-bold text-[#8b5a2b]"
                  >
                    네!
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. 탈퇴 모달 */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#FFFCEF] w-[400px] p-8 rounded-[40px] border-[6px] border-[#D32F2F] shadow-2xl text-center">
            {!isWithdrawConfirmStep ? (
              <>
                <h3 className="text-2xl font-black text-[#D32F2F] mb-4">마이홈을 떠나시나요?</h3>
                <p className="text-[#5d4037] mb-6 font-bold">모든 데이터가 삭제됩니다.</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="flex-1 py-3 bg-gray-200 rounded-2xl font-bold"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setIsWithdrawConfirmStep(true)}
                    className="flex-1 py-3 bg-[#D32F2F] text-white rounded-2xl font-bold"
                  >
                    탈퇴하기
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-black text-[#D32F2F] mb-4">마지막 확인!</h3>
                <p className="text-[#5d4037] mb-6 font-bold">정말로 탈퇴하시겠습니까?</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsWithdrawConfirmStep(false)}
                    className="flex-1 py-3 bg-gray-200 rounded-2xl font-bold"
                  >
                    아니오
                  </button>
                  <button
                    onClick={handleWithdraw}
                    className="flex-1 py-3 bg-[#FFB3B3] text-[#D32F2F] border-2 border-[#D32F2F] rounded-2xl font-bold"
                  >
                    네, 탈퇴합니다
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. 연동 해제 모달 */}
      {isUnlinkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#FFFCEF] w-[400px] p-8 rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl text-center">
            <h3 className="text-2xl font-black text-[#8b5a2b] mb-4">{unlinkProvider} 연동 해제</h3>
            <p className="text-[#5d4037] mb-6 font-bold">연동을 해제하시겠습니까?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setIsUnlinkModalOpen(false)}
                className="flex-1 py-3 bg-gray-200 rounded-2xl font-bold"
              >
                취소
              </button>
              <button onClick={confirmUnlink} className="flex-1 py-3 bg-[#8b5a2b] text-white rounded-2xl font-bold">
                해제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
