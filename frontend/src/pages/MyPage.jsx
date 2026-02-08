import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getMemberInfo, updateNickname, withdraw } from '../api/memberApi';
import TopButtons from '../components/common/TopButtons';
import HomeButton from '../components/common/HomeButton';
import { CameraIcon } from '@heroicons/react/24/solid';
import AspectLayout from '../components/layout/AspectLayout';

const PROFILE_IMAGES = [
  { id: 'apple', src: '/images/mypage/char-apple-profile.webp', label: '사과' },
  { id: 'bingti', src: '/images/mypage/char-bingti-profile.webp', label: '빙티' },
  { id: 'maple', src: '/images/mypage/char-maple-profile.webp', label: '단풍' },
  { id: 'michel', src: '/images/mypage/char-michel-profile.webp', label: '미셸' },
];

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
    createdAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editNickname, setEditNickname] = useState('');

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawConfirmStep, setIsWithdrawConfirmStep] = useState(false);

  // 프로필 이미지 선택 모달 상태
  const [isProfileImageModalOpen, setIsProfileImageModalOpen] = useState(false);
  const [selectedProfileImage, setSelectedProfileImage] = useState(null);

  // pending 상태 (로컬에서만 변경, 저장 버튼 클릭 시 서버 반영)
  const [pendingNickname, setPendingNickname] = useState(null);
  const [pendingProfileImage, setPendingProfileImage] = useState(null);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isSaveSuccessOpen, setIsSaveSuccessOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertCallback, setAlertCallback] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // 변경사항 있는지 여부 (실제로 값이 다를 때만)
  const hasChanges =
    (pendingNickname !== null && pendingNickname !== userData.nickname) ||
    (pendingProfileImage !== null && pendingProfileImage !== userData.profileImage);

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
      setAlertCallback(() => () => {
        sessionStorage.clear();
        navigate('/');
      });
      setAlertMessage('그동안 마이홈과 함께해주셔서 감사합니다.');
    } catch (e) {
      console.error(e);
      setAlertMessage('탈퇴 처리 중 오류가 발생했습니다.');
      setIsWithdrawModalOpen(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditNickname(pendingNickname ?? userData.nickname);
  };

  // 프로필 이미지 로컬 선택 (서버 저장 X)
  const handleProfileImageSelect = (imageSrc) => {
    setPendingProfileImage(imageSrc);
    setIsProfileImageModalOpen(false);
    setSelectedProfileImage(null);
  };

  // 닉네임 로컬 변경 (서버 저장 X)
  const handleNicknameChange = () => {
    setPendingNickname(editNickname);
    setIsModalOpen(false);
  };

  // 저장하기 버튼: 변경사항 서버 반영
  const handleSaveAll = async () => {
    try {
      const token = sessionStorage.getItem('token');

      // 닉네임 변경 저장
      if (pendingNickname !== null && pendingNickname !== userData.nickname) {
        await updateNickname({ nickname: pendingNickname });
      }

      // 프로필 이미지 변경 저장
      if (pendingProfileImage !== null && pendingProfileImage !== userData.profileImage) {
        await axios.post(
          '/api/member/profile-image',
          { profileImage: pendingProfileImage },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      const nicknameChanged = pendingNickname !== null && pendingNickname !== userData.nickname;

      // 저장 성공 후 처리
      if (nicknameChanged) {
        // 닉네임 변경 시 → 재로그인 필요
        setAlertCallback(() => () => {
          sessionStorage.clear();
          navigate('/');
        });
        setAlertMessage('닉네임이 변경되었습니다.\n다시 로그인해 주세요.');
      } else {
        // 프로필 이미지만 변경
        const res = await getMemberInfo();
        setUserData(res.data);
        sessionStorage.setItem('profileImage', res.data.profileImage);
        setIsSaveSuccessOpen(true);
      }
      setPendingNickname(null);
      setPendingProfileImage(null);
    } catch (e) {
      console.error('저장 실패:', e);
      if (e.response?.status === 409) {
        setAlertMessage('중복된 닉네임입니다.');
      } else if (e.response?.data?.message) {
        setAlertMessage(e.response.data.message);
      } else {
        setAlertMessage('저장에 실패했습니다.');
      }
    }
  };

  // 네비게이션 가드: 변경사항 있으면 확인 모달, 없으면 바로 이동
  const guardedNavigate = (path) => {
    if (hasChanges) {
      setPendingNavigation(path);
    } else {
      navigate(path);
    }
  };

  if (isLoading) return null;

  return (
    <AspectLayout>
      <div className="relative w-full h-full bg-cover bg-center flex items-center justify-center overflow-hidden bg-[url('/images/mypage/bg-mypage.jpg')]">
        {/* TopButtons (우측 상단)
            - Moved inside aspect-ratio container
            - top-[3.7cqh] (~40px on 1080h), right-[2.08cqw] (~40px on 1920w)
        */}
        <div className="absolute top-[3.7cqh] right-[2.08cqw] z-50">
          <div style={{ transform: 'scale(1)', transformOrigin: 'top right' }}>
            <TopButtons
              nickname={userData.nickname || '주민'}
              profileImage={userData.profileImage || sessionStorage.getItem('profileImage')}
              onProfileClick={() => {}}
              onBellClick={() => guardedNavigate('/notifications')}
              onConfigClick={() => guardedNavigate('/config')}
              onNavigate={guardedNavigate}
              showShadow={false}
              colors={{
                text: '#594E36',
                badgeBg: '#7B6C53', // coffeeBrown
                badgeText: '#FFFEE0', // creamIvory
              }}
            />
          </div>
        </div>

        {/* --- 상단 아이콘 영역 --- */}

        {/* 홈 버튼 (좌측 상단) - Top 3.7cqh, Left 2.08cqw */}
        <div className="absolute top-[3.7cqh] left-[2.08cqw] z-50">
          <HomeButton onClick={() => guardedNavigate('/home')} />
        </div>

        {/* --- 주민증 카드 (메인 영역) --- */}

        {/* 1. 캐릭터 이미지 영역
            - Left: 420px -> 21.875cqw
            - Width: 292px -> 15.21cqw
            - Radius: 64px -> 3.33cqw
        */}
        <div
          className="absolute aspect-square bg-[#FFD7D7] flex items-center justify-center group shadow-inner"
          style={{
            top: '36.5%',
            left: '21.875cqw',
            width: '15.21cqw',
            borderRadius: '3.33cqw',
          }}
        >
          <img
            src={pendingProfileImage || userData.profileImage || '/images/mypage/char-apple-profile.webp'}
            alt="character or profile"
            className="w-full h-full rounded-[3.33cqw] object-cover object-contain drop-shadow-md"
          />

          {/* 역할 배지 - 100*40px (5.21cqw * 3.7cqh), Radius 20px (1.04cqw), Font 24px (1.25cqw) */}
          <div
            className={`absolute -bottom-[22%] -left-[2%] w-[5.21cqw] h-[3.7cqh] rounded-[1.04cqw] flex items-center justify-center text-white text-[1.25cqw] font-bold z-10 shadow-md ${
              userData.role === 'ADMIN' ? 'bg-[#FF4F4F]' : 'bg-[#00C73C]'
            }`}
          >
            {userData.role === 'ADMIN' ? '관리자' : '주민'}
          </div>

          {/* 프로필 사진 변경 아이콘 */}
          <CameraIcon
            onClick={() => setIsProfileImageModalOpen(true)}
            className="absolute -bottom-[23%] -right-[2%] w-[2.5cqw] h-[2.5cqw] text-[#6B5B45] hover:scale-110 transition cursor-pointer drop-shadow-md"
            title="프로필 사진 변경"
          />
        </div>

        {/* 등록일
            - Top 80.4%, Left 30%
        */}
        <div className="absolute top-[80.4%] left-[30%] text-[1.46cqw] font-bold text-[#8B7D6B]">
          {userData.createdAt
            ? new Date(userData.createdAt)
                .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
                .replace(/\. /g, '월 ')
                .replace('.', '일')
            : '정보 없음'}
        </div>

        {/* 2. 우측 정보 영역
            - Top 33%, Left 43%
        */}
        <div className="absolute top-[38%] left-[43%] flex flex-col items-start gap-[1.67cqw]">
          {/* 닉네임 섹션 */}
          <div className="flex flex-col gap-0">
            <span className="text-[1.04cqw] font-bold text-[#594E36] opacity-80 pl-[0.1cqw]">닉네임</span>
            <div className="flex items-center gap-[0.83cqw]">
              <span className="text-[2cqw] font-black text-[#594E36] leading-none pt-[0.8cqw]">
                {pendingNickname ?? userData.nickname}
              </span>

              {/* 닉네임 수정 버튼 */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-[1.98cqw] h-[1.98cqw] bg-[#7A7061] rounded-full flex items-center justify-center hover:scale-110 transition mt-[0.8cqw]"
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
          <div className="flex flex-col gap-0 mt-[0.8cqw]">
            <span className="text-[1.04cqw] font-bold text-[#594E36] opacity-80 pl-[0.1cqw]">연결된 이메일</span>
            <span className="text-[1.46cqw] font-black text-[#7A7061] leading-tight pt-[0.5cqw]">
              {userData.email || '이메일 정보 없음'}
            </span>
          </div>
        </div>

        {/* --- 좌측 하단 탈퇴하기 버튼 ---
            - Bottom 10px, Left 10px (나가기 버튼과 대칭)
            - 나가기 버튼과 동일한 사이즈: w=204/1920=10.63cqw, h=62/1920=3.23cqw, r=32/1920=1.67cqw
        */}
        <button
          onClick={() => setIsWithdrawModalOpen(true)}
          className="absolute bottom-[20px] left-[20px] bg-[#FDFBF6] w-[10.63cqw] h-[3.23cqw] rounded-[1.67cqw] flex items-center justify-center text-[1.67cqw] font-bold text-[#7B6C53] hover:bg-[#F2E8D5] transition active:scale-95"
        >
          탈퇴하기
        </button>

        {/* --- 우측 하단 저장하기 버튼 --- */}
        {hasChanges && (
          <button
            onClick={() => setIsSaveConfirmOpen(true)}
            className="absolute bottom-[20px] right-[20px] bg-[#594E36] w-[10.63cqw] h-[3.23cqw] rounded-[1.67cqw] flex items-center justify-center text-[1.67cqw] font-bold text-[#FFFEE0] hover:bg-[#6d5d43] transition active:scale-95 shadow-md"
          >
            저장하기
          </button>
        )}

        {/* --- 모달들 --- */}

        {/* 닉네임 변경 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFCEF] w-[22cqw] p-[2cqw] rounded-[1.5cqw] shadow-2xl text-center">
              <h3 className="text-[1.35cqw] font-black text-[#594E36] mb-[1.5cqh]">이름 변경하기</h3>
              <input
                ref={nicknameInputRef}
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                className="w-full p-[0.94cqw] rounded-[0.83cqw] bg-white text-[#594E36] font-bold text-center text-[1.04cqw] mb-[1.8cqh] outline-none focus:ring-[0.16cqw] focus:ring-[#594E36]/20"
                placeholder="새 이름을 입력하세요"
              />
              <div className="flex gap-[0.83cqw]">
                <button
                  onClick={closeModal}
                  className="flex-1 py-[0.94cqw] bg-[#EEE9DB] hover:bg-[#E5E0D0] rounded-[0.83cqw] font-bold text-[#594E36] text-[1.04cqw] transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleNicknameChange}
                  className="flex-1 py-[0.94cqw] bg-[#594E36] hover:bg-[#6d5d43] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] transition-colors shadow-md"
                >
                  변경
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 저장 확인 모달 */}
        {isSaveConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFCEF] w-[22cqw] p-[2cqw] rounded-[1.5cqw] shadow-2xl text-center">
              <h3 className="text-[1.35cqw] font-black text-[#594E36] mb-[1cqh]">정말 바꾸실건가요?</h3>
              <div className="text-[#594E36] text-[0.94cqw] font-medium mb-[1.8cqh] leading-relaxed">
                {pendingNickname && pendingNickname !== userData.nickname && (
                  <p>
                    닉네임: <span className="text-[#8b5a2b] font-bold">"{pendingNickname}"</span>
                  </p>
                )}
                {pendingProfileImage && pendingProfileImage !== userData.profileImage && <p>프로필 이미지 변경</p>}
              </div>
              <div className="flex gap-[0.83cqw]">
                <button
                  onClick={() => setIsSaveConfirmOpen(false)}
                  className="flex-1 py-[0.94cqw] bg-[#EEE9DB] hover:bg-[#E5E0D0] rounded-[0.83cqw] font-bold text-[#594E36] text-[1.04cqw] transition-colors"
                >
                  아니오
                </button>
                <button
                  onClick={() => {
                    setIsSaveConfirmOpen(false);
                    handleSaveAll();
                  }}
                  className="flex-1 py-[0.94cqw] bg-[#594E36] hover:bg-[#6d5d43] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] transition-colors shadow-md"
                >
                  네!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 저장 성공 모달 */}
        {isSaveSuccessOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFCEF] w-[22cqw] p-[2cqw] rounded-[1.5cqw] shadow-2xl text-center">
              <h3 className="text-[1.35cqw] font-black text-[#594E36] mb-[1.5cqh]">변경사항이 저장되었습니다</h3>
              <button
                onClick={() => setIsSaveSuccessOpen(false)}
                className="w-full py-[0.94cqw] bg-[#594E36] hover:bg-[#6d5d43] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] transition-colors shadow-md"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 탈퇴 모달 */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFCEF] w-[20.8cqw] p-[1.67cqw] rounded-[2cqw] text-center">
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

        {/* 프로필 이미지 선택 모달 */}
        {isProfileImageModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFCEF] w-[22cqw] p-[2cqw] rounded-[1.5cqw] shadow-2xl text-center">
              <h3 className="text-[1.35cqw] font-black text-[#594E36] mb-[1.5cqh]">프로필 사진 변경</h3>

              {/* 프리셋 이미지 그리드 */}
              <div className="grid grid-cols-2 gap-[0.83cqw] mb-[1.5cqh]">
                {PROFILE_IMAGES.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedProfileImage(img.src)}
                    className={`relative aspect-square rounded-[1cqw] overflow-hidden border-[0.21cqw] transition-all hover:scale-105 ${
                      selectedProfileImage === img.src
                        ? 'border-[#594E36] ring-[0.21cqw] ring-[#594E36] shadow-lg'
                        : 'border-[#EAD7B8] hover:border-[#8b5a2b]'
                    }`}
                  >
                    <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                    {selectedProfileImage === img.src && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <span className="text-white text-[1.5cqw] font-black">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* 버튼 영역 */}
              <div className="flex gap-[0.83cqw]">
                <button
                  onClick={() => {
                    setIsProfileImageModalOpen(false);
                    setSelectedProfileImage(null);
                  }}
                  className="flex-1 py-[0.94cqw] bg-[#EEE9DB] hover:bg-[#E0D9C8] rounded-[0.83cqw] font-bold text-[#594E36] text-[1.04cqw] transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => selectedProfileImage && handleProfileImageSelect(selectedProfileImage)}
                  disabled={!selectedProfileImage}
                  className={`flex-1 py-[0.94cqw] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] transition-colors shadow-md ${
                    selectedProfileImage
                      ? 'bg-[#594E36] hover:bg-[#6d5d43] cursor-pointer'
                      : 'bg-gray-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  선택
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 범용 알림 모달 */}
        {alertMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFCEF] w-[22cqw] p-[2cqw] rounded-[1.5cqw] shadow-2xl text-center">
              <p className="text-[1.04cqw] font-bold text-[#594E36] mb-[1.5cqh] leading-relaxed whitespace-pre-line">
                {alertMessage}
              </p>
              <button
                onClick={() => {
                  setAlertMessage(null);
                  if (alertCallback) {
                    alertCallback();
                    setAlertCallback(null);
                  }
                }}
                className="w-full py-[0.94cqw] bg-[#594E36] hover:bg-[#6d5d43] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] transition-colors shadow-md"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 페이지 이탈 확인 모달 */}
        {pendingNavigation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFCEF] w-[22cqw] p-[2cqw] rounded-[1.5cqw] shadow-2xl text-center">
              <h3 className="text-[1.35cqw] font-black text-[#594E36] mb-[1cqh]">잠깐!</h3>
              <p className="text-[0.94cqw] font-medium text-[#594E36] mb-[1.8cqh] leading-relaxed">
                저장하지 않은 변경사항이 있습니다.
                <br />
                정말 나가시겠습니까?
              </p>
              <div className="flex gap-[0.83cqw]">
                <button
                  onClick={() => setPendingNavigation(null)}
                  className="flex-1 py-[0.94cqw] bg-[#EEE9DB] hover:bg-[#E5E0D0] rounded-[0.83cqw] font-bold text-[#594E36] text-[1.04cqw] transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    const path = pendingNavigation;
                    setPendingNavigation(null);
                    navigate(path);
                  }}
                  className="flex-1 py-[0.94cqw] bg-[#594E36] hover:bg-[#6d5d43] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] transition-colors shadow-md"
                >
                  나가기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AspectLayout>
  );
}
