import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMemberInfo, updateNickname, withdraw, unlinkSocialAccount } from '../api/memberApi';
import ExitButton from '../components/common/ExitButton';
import TopButtons from '../components/common/TopButtons';
import HomeButton from '../components/common/HomeButton';
import { CameraIcon } from '@heroicons/react/24/solid';
import AspectLayout from '../components/layout/AspectLayout';
import Cropper from 'react-easy-crop';

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
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 3C6.477 3 2 6.918 2 11.75C2 14.932 4.062 17.729 7.16 19.16L5.972 23.362C5.875 23.704 6.297 23.951 6.578 23.714L11.516 19.553C11.676 19.563 11.837 19.568 12 19.568C17.523 19.568 22 15.65 22 10.818C22 5.986 17.523 3 12 3Z"
      fill="#371D1E"
    />
    <text
      x="12"
      y="12.5"
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#FAE100"
      fontSize="6.5"
      fontWeight="900"
      fontFamily="sans-serif"
      style={{ letterSpacing: '-0.5px' }}
    >
      TALK
    </text>
  </svg>
);

const NaverIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_d_1_4)">
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

  // 프로필 이미지 업로드 상태
  const [isProfileImageModalOpen, setIsProfileImageModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // 이미지 크롭 상태
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.3);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 크롭된 이미지 생성 함수
  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

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

  // const handleSaveNickname = async () => {
  //   try {
  //     await updateNickname({ nickname: editNickname });
  //     alert('닉네임이 변경되었습니다! 다시 로그인해 주세요.');
  //     sessionStorage.clear();
  //     navigate('/');
  //   } catch (e) {
  //     if (e.response && e.response.status === 409) {
  //       alert('이미 사용 중인 닉네임입니다.');
  //     } else {
  //       alert('변경에 실패했습니다.');
  //     }
  //   }
  // };

  const handleSaveNickname = async () => {
    try {
      await updateNickname({ nickname: editNickname });
      alert('닉네임이 변경되었습니다\n다시 로그인해 주세요');
      sessionStorage.clear();
      navigate('/');
    } catch (e) {
      if (e.response?.data?.message) {
        alert(e.response.data.message);
      } else {
        alert('변경에 실패했습니다');
      }
    }
  };



  const closeModal = () => {
    setIsModalOpen(false);
    setIsConfirmStep(false);
    setEditNickname(userData.nickname);
  };

  // 프로필 이미지 업로드 핸들러
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 이미지 파일 타입 검증
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }
      // 파일 크기 검증 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!imagePreviewUrl || !croppedAreaPixels) {
      alert('이미지를 선택하고 영역을 조정해주세요.');
      return;
    }

    try {
      // 크롭된 이미지 생성
      const croppedBlob = await getCroppedImg(imagePreviewUrl, croppedAreaPixels);

      const formData = new FormData();
      formData.append('file', croppedBlob, 'profile.png');

      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/member/profile-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('업로드 실패');

      const updatedMember = await response.json();
      console.log('UPLOAD SUCCESS:', updatedMember);

      setUserData(updatedMember);
      alert('프로필 이미지가 변경되었습니다.');
      handleProfileImageModalClose();
    } catch (error) {
      console.error('프로필 이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    }
  };

  const handleProfileImageModalClose = () => {
    setIsProfileImageModalOpen(false);
    setSelectedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
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
              onBellClick={() => navigate('/notifications')}
              onConfigClick={() => navigate('/config')}
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
          <HomeButton />
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
            src={userData.profileImage || '/images/default-profile.png'}
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
        <div className="absolute top-[80.4%] left-[30%] text-[1.46cqw] font-bold text-[#8B7D6B]">2026년 01월 28일</div>

        {/* 2. 우측 정보 영역
            - Top 33%, Left 43%
        */}
        <div className="absolute top-[33%] left-[43%] flex flex-col items-start gap-[1.67cqw]">
          {/* 닉네임 섹션 */}
          <div className="flex flex-col gap-0">
            <span className="text-[1.04cqw] font-bold text-[#594E36] opacity-80 pl-[0.1cqw]">닉네임</span>
            <div className="flex items-center gap-[0.83cqw]">
              <span className="text-[2.6cqw] font-black text-[#594E36] leading-none pt-[0.2cqw]">
                {userData.nickname}
              </span>

              {/* 닉네임 수정 버튼 */}
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
          <div className="flex flex-col gap-0 mt-[1.5cqw]">
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
              {/* Google */}
              <button
                onClick={() => (userData.googleId ? handleUnlinkClick('google') : handleLinkAccount('google'))}
                className={`w-[2.92cqw] h-[2.92cqw] rounded-[0.73cqw] flex items-center justify-center transition hover:scale-110 ${userData.googleId ? '' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 0.15cqw 0.25cqw rgba(0,0,0,0.1)',
                }}
              >
                <div className="w-[70%] h-[70%]">
                  <GoogleIcon />
                </div>
              </button>

              {/* Kakao */}
              <button
                onClick={() => (userData.kakaoId ? handleUnlinkClick('kakao') : handleLinkAccount('kakao'))}
                className={`w-[2.92cqw] h-[2.92cqw] rounded-[0.73cqw] flex items-center justify-center transition hover:scale-110 ${userData.kakaoId ? '' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
                style={{
                  backgroundColor: '#FAE100',
                  boxShadow: '0 0.15cqw 0.25cqw rgba(0,0,0,0.1)',
                }}
              >
                <div className="w-[70%] h-[70%]">
                  <KakaoIcon />
                </div>
              </button>

              {/* Naver */}
              <button
                onClick={() => (userData.naverId ? handleUnlinkClick('naver') : handleLinkAccount('naver'))}
                className={`w-[2.92cqw] h-[2.92cqw] rounded-[0.73cqw] flex items-center justify-center transition hover:scale-110 ${userData.naverId ? '' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
                style={{
                  backgroundColor: '#03C75A',
                  boxShadow: '0 0.15cqw 0.25cqw rgba(0,0,0,0.1)',
                }}
              >
                <div className="w-[70%] h-[70%]">
                  <NaverIcon />
                </div>
              </button>
            </div>
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

        {/* --- 우측 하단 나가기 버튼 --- */}
        <ExitButton onClick={() => navigate('/home')} showShadow={false} />

        {/* --- 모달들 --- */}

        {/* 닉네임 변경 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFCEF] w-[22cqw] p-[2cqw] rounded-[1.5cqw] border-[0.21cqw] border-[#8b5a2b] shadow-2xl text-center">
              {!isConfirmStep ? (
                <>
                  <h3 className="text-[1.35cqw] font-black text-[#594E36] mb-[1.5cqh]">이름 변경하기</h3>
                  <input
                    ref={nicknameInputRef}
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="w-full p-[0.94cqw] rounded-[0.83cqw] bg-white border-[0.16cqw] border-[#8b5a2b] text-[#594E36] font-bold text-center text-[1.04cqw] mb-[1.8cqh] outline-none focus:border-[#594E36] focus:ring-[0.16cqw] focus:ring-[#594E36]/20"
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
                      onClick={() => setIsConfirmStep(true)}
                      className="flex-1 py-[0.94cqw] bg-[#594E36] hover:bg-[#6d5d43] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] transition-colors shadow-md"
                    >
                      변경
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-[1.35cqw] font-black text-[#594E36] mb-[1cqh]">정말 바꿀까요?</h3>
                  <p className="text-[#594E36] text-[0.94cqw] font-medium mb-[1.8cqh] leading-relaxed">
                    <span className="text-[#8b5a2b] font-bold">"{editNickname}"</span>(으)로
                    <br />
                    결정하시겠습니까?
                  </p>
                  <div className="flex gap-[0.83cqw]">
                    <button
                      onClick={() => setIsConfirmStep(false)}
                      className="flex-1 py-[0.94cqw] bg-[#EEE9DB] hover:bg-[#E5E0D0] rounded-[0.83cqw] font-bold text-[#594E36] text-[1.04cqw] transition-colors"
                    >
                      아니오
                    </button>
                    <button
                      onClick={handleSaveNickname}
                      className="flex-1 py-[0.94cqw] bg-[#594E36] hover:bg-[#6d5d43] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] transition-colors shadow-md"
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

        {/* 프로필 이미지 업로드 모달 */}
        {isProfileImageModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFCEF] w-[26cqw] p-[2cqw] rounded-[1.5cqw] border-[0.21cqw] border-[#8b5a2b] shadow-2xl text-center">
              <h3 className="text-[1.35cqw] font-black text-[#594E36] mb-[1.5cqh]">프로필 사진 변경</h3>

              {/* 이미지 크롭 영역 */}
              <div className="relative w-full aspect-square max-w-[20cqw] mx-auto mb-[1.5cqh] bg-[#FFD7D7] rounded-[1.5cqw] overflow-hidden border-[0.21cqw] border-[#EAD7B8]">
                {imagePreviewUrl ? (
                  <Cropper
                    image={imagePreviewUrl}
                    crop={crop}
                    zoom={zoom}
                    minZoom={0.5}
                    maxZoom={3}
                    aspect={1}
                    cropShape="rect"
                    showGrid={false}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onWheelRequest={(e) => e.ctrlKey}
                    restrictPosition={false}
                    objectFit="cover"
                    style={{
                      cropAreaStyle: {
                        border: 'none',
                      },
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-[0.83cqw]">
                    <CameraIcon className="w-[4.17cqw] h-[4.17cqw] text-[#6B5B45] opacity-30" />
                    <span className="text-[0.94cqw] text-[#6B5B45] opacity-50 font-bold">이미지를 선택해주세요</span>
                  </div>
                )}
              </div>

              {/* 파일 선택 버튼 */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="profile-image-input"
              />
              <label
                htmlFor="profile-image-input"
                className="block w-full py-[0.94cqw] mb-[1.1cqh] bg-[#EEE9DB] hover:bg-[#E0D9C8] rounded-[0.83cqw] font-bold text-[#594E36] text-[1.04cqw] cursor-pointer transition-colors"
              >
                📁 이미지 선택
              </label>

              {/* 버튼 영역 */}
              <div className="flex gap-[0.83cqw]">
                <button
                  onClick={handleProfileImageModalClose}
                  className="flex-1 py-[0.94cqw] bg-[#EEE9DB] hover:bg-[#E0D9C8] rounded-[0.83cqw] font-bold text-[#8E8E8E] text-[1.04cqw] transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleImageUpload}
                  disabled={!imagePreviewUrl}
                  className={`flex-1 py-[0.94cqw] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] transition-colors shadow-md ${
                    imagePreviewUrl
                      ? 'bg-[#594E36] hover:bg-[#6d5d43] cursor-pointer'
                      : 'bg-gray-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  업로드
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AspectLayout>
  );
}
