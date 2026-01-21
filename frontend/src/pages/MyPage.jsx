import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMemberInfo,
  updateNickname,
  withdraw,
  unlinkSocialAccount,
} from "../api/memberApi";

// --- 소셜 아이콘 컴포넌트 ---
const GoogleIcon = ({ width = "56", height = "56" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 56 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g filter="url(#filter0_d_1_2)">
      <path
        d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z"
        fill="#FFFCEF"
        stroke="#DED0A6"
        strokeWidth="3"
      />
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
      <path
        d="M28 4C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52C41.2548 52 52 41.2548 52 28C52 14.7452 41.2548 4 28 4ZM28 49.3333C16.2176 49.3333 6.66667 39.7824 6.66667 28C6.66667 16.2176 16.2176 6.66667 28 6.66667C39.7824 6.66667 49.3333 16.2176 49.3333 28C49.3333 39.7824 39.7824 49.3333 28 49.3333Z"
        fill="#9E8F5C"
        opacity="0.3"
      />
    </g>
  </svg>
);

const KakaoIcon = ({ width = "56", height = "56" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 56 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
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
      <path
        d="M28 4C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52C41.2548 52 52 41.2548 52 28C52 14.7452 41.2548 4 28 4ZM28 49.3333C16.2176 49.3333 6.66667 39.7824 6.66667 28C6.66667 16.2176 16.2176 6.66667 28 6.66667C39.7824 6.66667 49.3333 16.2176 49.3333 28C49.3333 39.7824 39.7824 49.3333 28 49.3333Z"
        fill="#9E8F5C"
        opacity="0.3"
      />
    </g>
  </svg>
);

const NaverIcon = ({ width = "56", height = "56" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 56 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g filter="url(#filter0_d_1_4)">
      <path
        d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z"
        fill="#03C75A"
        stroke="#02A449"
        strokeWidth="3"
      />
      <path
        d="M16.4 16H24.8L33.2 28.5V16H39.6V40H31.2L22.8 27.5V40H16.4V16Z"
        fill="white"
      />
      <path
        d="M28 4C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52C41.2548 52 52 41.2548 52 28C52 14.7452 41.2548 4 28 4ZM28 49.3333C16.2176 49.3333 6.66667 39.7824 6.66667 28C6.66667 16.2176 16.2176 6.66667 28 6.66667C39.7824 6.66667 49.3333 16.2176 49.3333 28C49.3333 39.7824 39.7824 49.3333 28 49.3333Z"
        fill="#02A449"
        opacity="0.3"
      />
    </g>
  </svg>
);

export default function MyPage() {
  const navigate = useNavigate();
  const nicknameInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("account");
  const [userData, setUserData] = useState({
    nickname: "",
    email: "",
    bell: 0,
    level: 1,
    role: "MEMBER",
  });
  const [isLoading, setIsLoading] = useState(true);

  // 설정 및 문의 상태 관리
  const [bgmVolume, setBgmVolume] = useState(
    Number(localStorage.getItem("bgmVolume")) || 50,
  );
  const [sfxVolume, setSfxVolume] = useState(
    Number(localStorage.getItem("sfxVolume")) || 50,
  );
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");

  // 닉네임 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [isConfirmStep, setIsConfirmStep] = useState(false);

  // 회원 탈퇴 모달 상태
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawConfirmStep, setIsWithdrawConfirmStep] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) return navigate("/");

      try {
        const res = await getMemberInfo();
        console.log("FETCHED USER DATA:", res.data);
        setUserData(res.data);
        setEditNickname(res.data.nickname);
        sessionStorage.setItem("role", res.data.role);
        setIsLoading(false);
      } catch (e) {
        console.error(e);
        setIsLoading(false);
        // 401 처리는 interceptor가 하므로 여기서는 별도 처리 안 함
      }
    };
    fetchData();
  }, [navigate]);

  // 설정 변경 핸들러
  const handleVolumeChange = (type, value) => {
    if (type === "BGM") {
      setBgmVolume(value);
      localStorage.setItem("bgmVolume", value);
    } else {
      setSfxVolume(value);
      localStorage.setItem("sfxVolume", value);
    }
  };

  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠습니까? 🍃")) {
      sessionStorage.clear();
      navigate("/");
    }
  };

  // 회원 탈퇴 처리
  const handleWithdraw = async () => {
    try {
      await withdraw();
      alert("그동안 마이홈과 함께해주셔서 감사합니다. 🕊️");
      sessionStorage.clear();
      navigate("/");
    } catch (e) {
      console.error(e);
      alert("탈퇴 처리 중 오류가 발생했습니다.");
      setIsWithdrawModalOpen(false);
    }
  };

  // 소셜 계정 연동 요청 핸들러
  const handleLinkAccount = (provider) => {
    // 1. 유저 ID 확인 (필수)
    if (!userData.id) {
      console.error("Link Account Failed: userData.id is missing", userData);
      alert(
        "계정 식별 정보를 불러오지 못했습니다.\n잠시 후 다시 시도하거나 페이지를 새로고침해주세요.",
      );
      return;
    }

    // 2. 쿠키 설정
    document.cookie = `LINK_MEMBER_ID=${userData.id}; path=/; max-age=600`;

    // 3. 소셜 로그인 페이지로 리다이렉트
    window.location.href = `/oauth2/authorization/${provider}`;
  };

  // 연동 해제 모달 상태
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [unlinkProvider, setUnlinkProvider] = useState("");

  const handleUnlinkClick = (provider) => {
    setUnlinkProvider(provider);
    setIsUnlinkModalOpen(true);
  };

  const confirmUnlink = async () => {
    try {
      await unlinkSocialAccount(unlinkProvider);
      alert("연동이 해제되었습니다.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      const errorMsg =
        e.response?.data?.message ||
        e.response?.data ||
        e.message ||
        "Unknown Error";
      alert(`연동 해제 실패: ${errorMsg}`);
    } finally {
      setIsUnlinkModalOpen(false);
    }
  };

  // --- 닉네임 변경 성공 시 로그아웃 처리 ---
  const handleSaveNickname = async () => {
    try {
      await updateNickname({ nickname: editNickname });

      // 1. 사용자에게 알림
      alert(
        "닉네임이 성공적으로 변경되었습니다! ✨\n보안을 위해 다시 로그인해 주세요.",
      );

      // 2. 세션 정보 삭제 (로그아웃)
      sessionStorage.clear();

      // 3. 메인 또는 로그인 페이지로 이동
      navigate("/");
    } catch (e) {
      if (e.response && e.response.status === 409) {
        alert("이미 사용 중인 닉네임입니다. 다른 이름을 입력해주세요! 😢");
        setEditNickname("");
        setIsConfirmStep(false);
        setTimeout(() => nicknameInputRef.current?.focus(), 100);
      } else {
        alert("변경에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsConfirmStep(false);
    setEditNickname(userData.nickname);
  };

  const closeWithdrawModal = () => {
    setIsWithdrawModalOpen(false);
    setIsWithdrawConfirmStep(false);
  };

  const handleInquirySubmit = () => {
    alert("문의가 접수되었습니다. (기능 구현 예정)");
    setInquiryTitle("");
    setInquiryContent("");
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-[#FFFCEF]">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-4">🍃</div>
          <div className="text-xl font-black text-[#8b5a2b]">
            주민 정보를 불러오는 중...
          </div>
        </div>
      </div>
    );

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden font-sans">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/background.jpg')" }}
      />

      {/* --- 닉네임 변경 모달 --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#FFFCEF] w-[380px] p-8 rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl">
            {!isConfirmStep ? (
              <div className="space-y-6 text-center">
                <h3 className="text-2xl font-black text-[#8b5a2b]">
                  이름 변경하기 🍃
                </h3>
                <input
                  ref={nicknameInputRef}
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-white border-4 border-[#efe7d1] text-[#5d4037] font-bold text-center outline-none focus:border-[#bc8a5f]"
                  placeholder="새 이름을 입력하세요"
                />
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 bg-[#DED0A6] text-[#5d4037] rounded-2xl font-bold"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setIsConfirmStep(true)}
                    className="flex-1 py-3 bg-[#8b5a2b] text-white rounded-2xl font-bold"
                  >
                    변경
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <h3 className="text-2xl font-black text-[#8b5a2b]">
                  정말 바꿀까요?
                </h3>
                <p className="text-[#5d4037] font-bold text-lg">
                  <span className="text-[#bc8a5f]">"{editNickname}"</span>(으)로
                  <br />
                  결정하시겠습니까?
                </p>
                <p className="text-xs text-[#8b5a2b] font-bold">
                  * 변경 시 다시 로그인해야 합니다.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConfirmStep(false)}
                    className="flex-1 py-3 bg-[#DED0A6] text-[#5d4037] rounded-2xl font-bold"
                  >
                    아니오
                  </button>
                  <button
                    onClick={handleSaveNickname}
                    className="flex-1 py-3 bg-[#e2f0a1] border-4 border-[#8b5a2b] rounded-2xl font-black text-[#8b5a2b]"
                  >
                    네!
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 회원 탈퇴 모달 --- */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#FFFCEF] w-[380px] p-8 rounded-[40px] border-[6px] border-[#D32F2F] shadow-2xl animate-in zoom-in-95">
            {!isWithdrawConfirmStep ? (
              <div className="space-y-6 text-center">
                <h3 className="text-2xl font-black text-[#D32F2F]">
                  마이홈을 떠나시나요? 😢
                </h3>
                <p className="text-[#5d4037] font-bold">
                  탈퇴 시 모든 게임 데이터와
                  <br />
                  벨(Bell)이 영구 삭제됩니다.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={closeWithdrawModal}
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
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <h3 className="text-2xl font-black text-[#D32F2F]">
                  마지막 확인!
                </h3>
                <p className="text-[#5d4037] font-bold text-lg">
                  정말로 모든 정보를 삭제하고
                  <br />
                  주민 등록을 해지할까요?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsWithdrawConfirmStep(false)}
                    className="flex-1 py-3 bg-gray-200 rounded-2xl font-bold"
                  >
                    아니오
                  </button>
                  <button
                    onClick={handleWithdraw}
                    className="flex-1 py-3 bg-[#FFB3B3] border-4 border-[#D32F2F] rounded-2xl font-black text-[#D32F2F]"
                  >
                    네, 탈퇴합니다.
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 연동 해제 모달 --- */}
      {isUnlinkModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#FFFCEF] w-[380px] p-8 rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl animate-in zoom-in-95">
            <div className="space-y-6 text-center">
              <h3 className="text-2xl font-black text-[#8b5a2b]">
                {unlinkProvider} 연동 해제 🔗
              </h3>
              <p className="text-[#5d4037] font-bold">
                연동을 해제하면 이메일로만
                <br />
                로그인할 수 있습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsUnlinkModalOpen(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-2xl font-bold"
                >
                  취소
                </button>
                <button
                  onClick={confirmUnlink}
                  className="flex-1 py-3 bg-[#8b5a2b] text-white rounded-2xl font-bold"
                >
                  해제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-[95%] max-w-[850px] bg-[#efe7d1] p-8 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)]">
        <div className="flex flex-row gap-6">
          <div className="flex flex-col gap-3 min-w-[150px]">
            {[
              { id: "account", label: "계정 정보" },
              { id: "settings", label: "설정" },
              { id: "inquiry", label: "문의하기" },
              ...(userData.role?.includes("ADMIN")
                ? [{ id: "admin", label: "관리자" }]
                : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "admin") {
                    navigate("/admin");
                  } else if (tab.id === "inquiry") {
                    navigate("/user-inquiry");
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className={`py-4 px-6 rounded-[25px] font-black text-lg transition-all shadow-sm ${
                  activeTab === tab.id
                    ? "bg-[#e2f0a1] text-[#8b5a2b] border-[4px] border-[#8b5a2b] translate-x-2"
                    : "bg-white text-[#8b5a2b] hover:bg-[#FFFCEF]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 bg-[#FFFCEF] rounded-[40px] p-8 border-4 border-[#8b5a2b]/20 shadow-inner h-[450px] overflow-y-auto">
            {activeTab === "account" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-[30px] border-2 border-[#DED0A6]">
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-[#8b5a2b]">
                      Lv. {userData.level}
                    </p>
                    <p className="font-bold text-[#5d4037] text-lg">
                      {userData.bell.toLocaleString()} Bell 💰
                    </p>
                  </div>
                  <span className="px-4 py-1 bg-[#8b5a2b] text-white rounded-full text-xs font-bold uppercase">
                    {userData.role}
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[#8b5a2b] ml-2">
                      주민 이름
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={userData.nickname}
                        readOnly
                        className="flex-1 bg-[#F4F0D7] rounded-2xl p-4 font-bold text-[#8d7b6d] outline-none cursor-default border-2 border-transparent"
                      />
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#bc8a5f] text-white px-8 rounded-2xl font-black hover:bg-[#8b5a2b] shadow-md transition-all active:scale-95"
                      >
                        변경
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[#8b5a2b] ml-2">
                      연결된 이메일
                    </label>
                    <input
                      type="text"
                      value={userData.email || "정보 없음"}
                      readOnly
                      className="w-full bg-[#F4F0D7] rounded-2xl p-4 font-bold text-[#8d7b6d] outline-none cursor-default"
                    />
                  </div>

                  {/* 소셜 계정 연동 섹션 */}
                  <div className="space-y-4 pt-6 border-t-2 border-[#DED0A6]">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-[#8b5a2b] ml-2">
                        소셜 계정 연동
                      </label>
                      <span className="text-xs font-bold text-[#a67c52]">
                        * 아이콘을 눌러 연동하세요 (재클릭 시 해제)
                      </span>
                    </div>

                    <div className="flex justify-center gap-6 py-2">
                      {/* 1. Google */}
                      {(userData.googleId ||
                        (!userData.kakaoId && !userData.naverId)) && (
                        <div className="flex flex-col items-center gap-2">
                          {userData.googleId ? (
                            <button
                              onClick={() => handleUnlinkClick("google")}
                              className="relative group cursor-pointer transition-transform active:scale-95"
                              title="연동 해제하기"
                            >
                              <div className="grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <GoogleIcon width="64" height="64" />
                              </div>
                              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#8b5a2b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                                연동됨
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLinkAccount("google")}
                              className="hover:scale-110 transition-transform active:translate-y-1"
                              title="구글 계정 연동하기"
                            >
                              <GoogleIcon width="64" height="64" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* 2. Kakao */}
                      {(userData.kakaoId ||
                        (!userData.googleId && !userData.naverId)) && (
                        <div className="flex flex-col items-center gap-2">
                          {userData.kakaoId ? (
                            <button
                              onClick={() => handleUnlinkClick("kakao")}
                              className="relative group cursor-pointer transition-transform active:scale-95"
                              title="연동 해제하기"
                            >
                              <div className="grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <KakaoIcon width="64" height="64" />
                              </div>
                              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#8b5a2b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                                연동됨
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLinkAccount("kakao")}
                              className="hover:scale-110 transition-transform active:translate-y-1"
                              title="카카오 계정 연동하기"
                            >
                              <KakaoIcon width="64" height="64" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* 3. Naver */}
                      {(userData.naverId ||
                        (!userData.googleId && !userData.kakaoId)) && (
                        <div className="flex flex-col items-center gap-2">
                          {userData.naverId ? (
                            <button
                              onClick={() => handleUnlinkClick("naver")}
                              className="relative group cursor-pointer transition-transform active:scale-95"
                              title="연동 해제하기"
                            >
                              <div className="grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <NaverIcon width="64" height="64" />
                              </div>
                              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#8b5a2b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                                연동됨
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLinkAccount("naver")}
                              className="hover:scale-110 transition-transform active:translate-y-1"
                              title="네이버 계정 연동하기"
                            >
                              <NaverIcon width="64" height="64" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4 pt-6 border-t-2 border-[#DED0A6]">
                  <button
                    onClick={handleLogout}
                    className="flex-1 bg-[#e2f0a1] py-4 rounded-[25px] font-black text-[#5d7a22] shadow-sm hover:bg-[#d4e68d] transition-all"
                  >
                    로그아웃
                  </button>

                  <button
                    onClick={() => {
                      setIsWithdrawModalOpen(true);
                      setIsWithdrawConfirmStep(false);
                    }}
                    className="flex-1 bg-[#FFB3B3] py-4 rounded-[25px] font-black text-[#D32F2F] shadow-sm hover:bg-[#FF9999] transition-all text-sm"
                  >
                    주민 탈퇴
                  </button>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-10 py-4">
                <h3 className="text-2xl font-black text-[#8b5a2b] border-b-2 border-[#DED0A6] pb-2">
                  환경 설정 ⚙️
                </h3>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between font-black text-[#8b5a2b]">
                      <span>배경음악 (BGM)</span>
                      <span>{bgmVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bgmVolume}
                      onChange={(e) =>
                        handleVolumeChange("BGM", e.target.value)
                      }
                      className="w-full h-4 bg-[#F4F0D7] rounded-lg appearance-none cursor-pointer accent-[#8b5a2b]"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between font-black text-[#8b5a2b]">
                      <span>효과음 (SFX)</span>
                      <span>{sfxVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sfxVolume}
                      onChange={(e) =>
                        handleVolumeChange("SFX", e.target.value)
                      }
                      className="w-full h-4 bg-[#F4F0D7] rounded-lg appearance-none cursor-pointer accent-[#8b5a2b]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "inquiry" && (
              <div className="space-y-6 py-4 flex flex-col h-full">
                <h3 className="text-2xl font-black text-[#8b5a2b] border-b-2 border-[#DED0A6] pb-2">
                  도움센터 📮
                </h3>
                <div className="space-y-4 flex-1 flex flex-col">
                  <input
                    type="text"
                    placeholder="문의 제목을 입력하세요."
                    value={inquiryTitle}
                    onChange={(e) => setInquiryTitle(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-white border-2 border-[#DED0A6] text-[#5d4037] font-bold outline-none focus:border-[#bc8a5f]"
                  />
                  <textarea
                    placeholder="문의 내용을 상세히 적어주시면 확인 후 답변 드릴게요! 🍃"
                    value={inquiryContent}
                    onChange={(e) => setInquiryContent(e.target.value)}
                    className="w-full flex-1 p-4 rounded-2xl bg-white border-2 border-[#DED0A6] text-[#5d4037] font-bold outline-none focus:border-[#bc8a5f] resize-none"
                  />
                  <button
                    onClick={handleInquirySubmit}
                    className="w-full bg-[#bc8a5f] text-white py-4 rounded-2xl font-black text-lg shadow-md hover:bg-[#8b5a2b] transition-all"
                  >
                    문의 제출하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate("/home")}
            className="bg-white/90 hover:bg-white text-[#5d4037] px-24 py-3 rounded-full font-black text-xl border-4 border-[#8b5a2b]/30 shadow-md transition-all active:scale-95"
          >
            마이홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
