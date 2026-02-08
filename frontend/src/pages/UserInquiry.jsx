import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopButtons from '../components/common/TopButtons';
import ExitButton from '../components/common/ExitButton';
import HomeButton from '../components/common/HomeButton';
import AspectLayout from '../components/layout/AspectLayout';
import { COLORS } from '../constants/colors';

export default function UserInquiryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('write'); // write, list

  // 문의 작성 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('USER_REPORT');
  const [imageFile, setImageFile] = useState(null); // 이미지 파일
  const [imagePreview, setImagePreview] = useState(null); // 등록할때 이미지 미리보기

  // 문의 목록 상태
  const [myInquiries, setMyInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [cursor, setCursor] = useState(null); // 커서
  const [hasMore, setHasMore] = useState(true); // 더 불러올 데이터가 있는지

  const [loading, setLoading] = useState(false);

  // 카테고리 옵션 (이미지 경로 설정)
  const categories = [
    { value: 'USER_REPORT', label: '유저 신고', icon: '/images/user-inquiry/icon-siren.svg' },
    { value: 'BUG_REPORT', label: '버그 신고', icon: '/images/user-inquiry/icon-bug.svg' },
    { value: 'ETC', label: '기타', icon: '/images/user-inquiry/icon-etc.svg' },
  ];

  // 내 문의 목록 불러오기
  useEffect(() => {
    if (activeTab === 'list') {
      // 탭 전환 시 초기화
      setMyInquiries([]);
      setCursor(null);
      setHasMore(true);
      fetchMyInquiries(null, 5); // 첫 로드는 5개만
    }
  }, [activeTab]);

  const fetchMyInquiries = async (currentCursor, size = 5) => {
    // 기본 5개씩
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');

      // 커서가 있으면 쿼리 파라미터에 추가
      const url = currentCursor
        ? `/api/member/inquiries/my?cursor=${currentCursor}&size=${size}`
        : `/api/member/inquiries/my?size=${size}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newInquiries = response.data;

      if (newInquiries.length > 0) {
        // 기존 데이터에 추가
        setMyInquiries((prev) => [...prev, ...newInquiries]);

        // 마지막 항목의 id를 다음 커서로 설정
        const lastInquiry = newInquiries[newInquiries.length - 1];
        setCursor(lastInquiry.id);

        // size개 미만이면 더 이상 데이터가 없음
        if (newInquiries.length < size) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('문의 목록 조회 실패:', error);
      alert('문의 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 더 불러오기
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchMyInquiries(cursor, 5); // 5개씩 추가 로드
    }
  };

  // 이미지 파일 선택 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      // 이미지 파일 유효성 검사
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('이미지 파일만 업로드 가능합니다. (jpg, png, gif, webp)');
        e.target.value = '';
        return;
      }

      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB를 초과할 수 없습니다.');
        e.target.value = '';
        return;
      }

      setImageFile(file);

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 이미지 제거
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // 문의 작성
  const handleSubmitInquiry = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요!');
      return;
    }

    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      // FormData 생성
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', category);

      // 이미지 파일이 있으면 추가
      if (imageFile) {
        formData.append('imageFile', imageFile);
      }

      await axios.post('/api/member/inquiries', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('문의가 등록되었습니다!');
      setTitle('');
      setContent('');
      setCategory('USER_REPORT');
      setImageFile(null);
      setImagePreview(null);
      setActiveTab('list');
    } catch (error) {
      console.error('문의 등록 실패:', error);
      alert('문의 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 문의 상세 조회
  const handleSelectInquiry = async (inquiryId) => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`/api/member/inquiries/my/${inquiryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedInquiry(response.data);
    } catch (error) {
      console.error('문의 상세 조회 실패:', error);
      alert('문의 내용을 불러오는데 실패했습니다.');
    }
  };

  // 상태 배지 컴포넌트
  const StatusBadge = ({ status }) => {
    const isAnswered = status === 'ANSWERED';
    return (
      <span
        className="px-[1.25cqw] py-[0.6cqh] rounded-full text-[0.83cqw] font-bold text-white"
        style={{
          backgroundColor: isAnswered ? COLORS.userInquiry.nookMint : COLORS.userInquiry.nookCyan,
        }}
      >
        {isAnswered ? '답변완료' : '답변대기'}
      </span>
    );
  };

  // 카테고리 배지 컴포넌트
  const CategoryBadge = ({ category }) => {
    const categoryConfig = {
      USER_REPORT: {
        label: '유저 신고',
        icon: '/images/user-inquiry/icon-siren.svg',
        bgColor: COLORS.userInquiry.creamIvory,
        textColor: COLORS.userInquiry.darkBrown,
      },
      BUG_REPORT: {
        label: '버그 신고',
        icon: '/images/user-inquiry/icon-bug.svg',
        bgColor: COLORS.userInquiry.softYellow,
        textColor: COLORS.userInquiry.darkBrown,
      },
      ETC: {
        label: '기타',
        icon: '/images/user-inquiry/icon-etc.svg',
        bgColor: COLORS.userInquiry.purpleGray,
        textColor: '#616161',
      },
    };
    const config = categoryConfig[category] || categoryConfig.ETC;

    return (
      <div
        className="flex items-center gap-[0.42cqw] px-[1.04cqw] py-[0.6cqh] rounded-full"
        style={{ backgroundColor: config.bgColor, color: config.textColor }}
      >
        <div
          className="w-[1.04cqw] h-[1.04cqw]"
          style={{
            backgroundColor: config.textColor,
            maskImage: `url("${config.icon}")`,
            WebkitMaskImage: `url("${config.icon}")`,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }}
        />
        <span className="text-[0.83cqw] font-bold">{config.label}</span>
      </div>
    );
  };

  return (
    <AspectLayout>
      <div className="relative w-full h-full bg-cover bg-center flex flex-col items-center justify-start overflow-hidden font-gosanja bg-[url('/images/user-inquiry/bg-inquiry.jpg')]">
        {/* TopButtons (우측 상단)
            - Top: 3.7cqh
            - Right: 2.08cqw
        */}
        <div className="absolute top-[3.7cqh] right-[2.08cqw] z-50">
          <TopButtons
            nickname={sessionStorage.getItem('nickname') || '주민'}
            profileImage={sessionStorage.getItem('profileImage')}
            onProfileClick={() => navigate('/mypage')}
            onBellClick={() => navigate('/notifications')}
            onConfigClick={() => navigate('/config')}
            showShadow={false}
            colors={{
              text: COLORS.userInquiry.darkBrown,
              badgeBg: '#7B6C53', // coffeeBrown
              badgeText: '#FFFEE0', // creamIvory
            }}
          />
        </div>

        {/* 홈 버튼 (좌측 상단) */}
        <div className="absolute top-[2.08cqw] left-[2.08cqw] z-50">
          <HomeButton />
        </div>

        {/* 타이틀 영역 - 상단 고정 (Config.jsx와 동일한 레이아웃) */}
        <div className="absolute top-[7cqh] left-1/2 -translate-x-1/2 flex flex-col items-center gap-[0.88cqw] w-[40cqw] z-20">
          <h1 className="text-[3.125cqw] font-black text-[#594E36] whitespace-nowrap">
            {activeTab === 'write' ? '문의하기' : '내 문의내역'}
          </h1>

          {/* Divider - 직접 점선 구현 (Config.jsx와 동일) */}
          <div className="flex items-center w-full">
            <div className="w-[1.04cqw] h-[1.04cqw] rounded-full bg-[#594E36]" />
            <div className="flex-1 flex items-center justify-between mx-[0.42cqw]">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-[0.31cqw] rounded-full bg-[#594E36]" style={{ width: '2.08cqw' }} />
              ))}
            </div>
            <div className="w-[1.04cqw] h-[1.04cqw] rounded-full bg-[#594E36]" />
          </div>
        </div>

        {/* 메인 컨텐트 카드 - Config.jsx와 동일한 크기 */}
        <div
          className="w-[70.1cqw] h-[37qw] rounded-[2.08cqw] flex flex-col items-center py-[3.7cqh] px-[4.17cqw] relative mt-[22cqh]"
          style={{ backgroundColor: COLORS.userInquiry.creamPink }}
        >
          {/* 1. 문의 작성 탭 컨텐츠 */}
          {activeTab === 'write' && (
            <div className="w-full flex flex-col gap-[2.22cqh]">
              {/* 카테고리 선택 - 60px = 3.13cqw height (approx) */}
              <div className="flex items-center gap-[2.08cqw]">
                <span
                  className="text-[1.25cqw] font-bold w-[8.33cqw] text-right"
                  style={{ color: COLORS.userInquiry.darkBrown }}
                >
                  카테고리 선택
                </span>
                <div className="flex gap-[1.04cqw]">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className="flex items-center gap-[0.42cqw] px-[1.25cqw] py-[0.93cqh] rounded-[1.04cqw] font-bold text-[1.04cqw] transition-all"
                      style={{
                        backgroundColor:
                          category === cat.value ? COLORS.userInquiry.yellow : COLORS.userInquiry.creamIvory,
                        color: category === cat.value ? COLORS.userInquiry.darkBrown : '#9CA3AF',
                      }}
                    >
                      <div
                        className="w-[1.25cqw] h-[1.25cqw]"
                        style={{
                          backgroundColor: category === cat.value ? COLORS.userInquiry.darkBrown : '#9CA3AF',
                          maskImage: `url("${cat.icon}")`,
                          WebkitMaskImage: `url("${cat.icon}")`,
                          maskSize: 'contain',
                          WebkitMaskSize: 'contain',
                          maskRepeat: 'no-repeat',
                          WebkitMaskRepeat: 'no-repeat',
                          maskPosition: 'center',
                          WebkitMaskPosition: 'center',
                        }}
                      />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 제목 입력 - 60px = 5.56cqh height */}
              <div className="flex items-center gap-[2.08cqw]">
                <span
                  className="text-[1.25cqw] font-bold w-[8.33cqw] text-right"
                  style={{ color: COLORS.userInquiry.darkBrown }}
                >
                  제목
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목"
                  className="flex-1 h-[5.56cqh] px-[1.25cqw] rounded-[1.04cqw] border-[0.16cqw] outline-none text-[1.04cqw] font-bold placeholder:text-[#D1D5DB]"
                  style={{
                    backgroundColor: COLORS.userInquiry.creamIvory,
                    borderColor: 'transparent',
                    color: COLORS.userInquiry.darkBrown,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = COLORS.userInquiry.yellow)}
                  onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                  maxLength={25}
                />
              </div>

              {/* 내용 입력 - 300px = 27.78cqh height */}
              <div className="flex items-start gap-[2.08cqw]">
                <span
                  className="text-[1.25cqw] font-bold w-[8.33cqw] text-right mt-[0.93cqh]"
                  style={{ color: COLORS.userInquiry.darkBrown }}
                >
                  내용
                </span>
                <div className="flex-1 flex flex-col gap-[1.48cqh]">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용"
                    className="w-full h-[23.15cqh] p-[1.25cqw] rounded-[1.04cqw] border-[0.16cqw] outline-none text-[1.04cqw] font-bold resize-none placeholder:text-[#D1D5DB]"
                    style={{
                      backgroundColor: COLORS.userInquiry.creamIvory,
                      borderColor: 'transparent',
                      color: COLORS.userInquiry.darkBrown,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = COLORS.userInquiry.yellow)}
                    onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                  />
                  {/* 첨부파일 영역 */}
                  {!imagePreview ? (
                    // ✅ 이미지 없을 때는 기존 그대로 (라벨 없음)
                    <div className="flex flex-col gap-[0.93cqh]">
                      <label
                        htmlFor="imageFile"
                        className="self-start px-[1.25cqw] py-[0.93cqh] rounded-[1.04cqw] text-[0.83cqw] font-bold cursor-pointer hover:scale-105 transition-transform"
                        style={{
                          backgroundColor: COLORS.userInquiry.creamIvory,
                          color: COLORS.userInquiry.darkBrown,
                          border: `0.16cqw solid ${COLORS.userInquiry.darkBrown}`,
                        }}
                      >
                        이미지 첨부
                      </label>
                      <input
                        type="file"
                        id="imageFile"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <span className="text-[0.73cqw] text-[#9CA3AF]">jpg, png, gif, webp 형식만 가능 (최대 5MB)</span>
                    </div>
                  ) : (
                    <div className="relative w-full">
                      {/* ✅ 라벨은 왼쪽 컬럼 위치로 “떠서” 배치 */}
                      <span
                        className="absolute left-[-10.41cqw] text-[1.25cqw] font-bold w-[8.33cqw] text-right mt-[0.93cqh]"
                        style={{ color: COLORS.userInquiry.darkBrown }}
                      >
                        첨부파일
                      </span>

                      {/* ✅ 미리보기 박스는 오른쪽 컬럼의 w-full 그대로 사용 */}
                      <div
                        className="flex items-center gap-[1.04cqw] p-[1.04cqw] rounded-[1.04cqw] w-full"
                        style={{ backgroundColor: COLORS.userInquiry.creamIvory }}
                      >
                        <img
                          src={imagePreview}
                          alt="미리보기"
                          className="w-[5.21cqw] h-[3.21cqw] object-cover rounded-[0.52cqw] border-[0.16cqw]"
                          style={{ borderColor: COLORS.userInquiry.darkBrown }}
                        />

                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[0.83cqw] font-bold truncate"
                            style={{ color: COLORS.userInquiry.darkBrown }}
                          >
                            {imageFile?.name}
                          </p>
                          <p className="text-[0.73cqw] text-[#9CA3AF]">
                            {imageFile && (imageFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="w-[2.5cqw] h-[2.5cqw] rounded-full flex items-center justify-center font-bold text-[1.04cqw] hover:scale-110 transition-transform flex-shrink-0"
                          style={{
                            backgroundColor: COLORS.userInquiry.darkBrown,
                            color: COLORS.userInquiry.creamWhite,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 등록하기 버튼 (카드 내부 하단) */}
              <div className="flex justify-center mt-[1.85cqh]">
                <button
                  onClick={handleSubmitInquiry}
                  disabled={loading}
                  className="px-[3.33cqw] py-[1.39cqh] text-[1.25cqw] font-bold rounded-[1.04cqw] hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                  style={{
                    backgroundColor: COLORS.userInquiry.darkBrown,
                    color: COLORS.userInquiry.creamWhite,
                  }}
                >
                  {loading ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </div>
          )}

          {/* 2. 내 문의 내역 탭 컨텐츠 */}
          {activeTab === 'list' && (
            <div className="w-full h-full flex flex-col">
              {loading && myInquiries.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[1.25cqw] font-bold" style={{ color: COLORS.userInquiry.darkBrown }}>
                    로딩 중...
                  </p>
                </div>
              ) : myInquiries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-[1.85cqh]">
                  <p className="text-[1.25cqw] font-bold text-[#9CA3AF]">아직 문의 내역이 없어요</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-[1.04cqw] py-[0.93cqh] space-y-[1.48cqh] scrollbar-thin scrollbar-thumb-[#D1D5DB] scrollbar-track-transparent">
                  {myInquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      onClick={() => handleSelectInquiry(inquiry.id)}
                      className="bg-white px-[2.08cqw] py-[1.85cqh] rounded-[2.08cqw] flex flex-col gap-[1.11cqh] cursor-pointer hover:bg-gray-50 transition"
                    >
                      {/* 1열: 문의번호 | 날짜 */}
                      <div className="flex justify-between items-center text-[0.83cqw] text-[#9CA3AF] font-bold">
                        <span>[문의번호] {inquiry.id}</span>
                        <span>{new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>

                      {/* 2열: 제목 */}
                      <h3
                        className="text-[1.04cqw] font-black line-clamp-1"
                        style={{ color: COLORS.userInquiry.darkBrown }}
                      >
                        {inquiry.title}
                      </h3>

                      {/* 3열: 카테고리 | 상태 */}
                      <div className="flex justify-between items-center">
                        <CategoryBadge category={inquiry.category} />
                        <StatusBadge status={inquiry.status} />
                      </div>
                    </div>
                  ))}

                  {hasMore ? (
                    <div className="flex justify-center pt-[0.93cqh]">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="px-[1.67cqw] py-[0.93cqh] text-[0.83cqw] font-bold rounded-[1.04cqw] transition"
                        style={{
                          backgroundColor: COLORS.userInquiry.creamIvory,
                          color: '#F57F17',
                        }}
                      >
                        {loading ? '로딩 중...' : '더 보기'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center pt-[0.93cqh] pb-[0.93cqh]">
                      <div
                        className="w-full py-[1.39cqh] rounded-[1.04cqw] flex justify-center items-center"
                        style={{ backgroundColor: COLORS.userInquiry.creamIvory }}
                      >
                        <span className="text-[0.94cqw] font-bold text-[#9CA3AF]">모든 문의를 다 읽었습니다</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 탭 전환 버튼들 */}
        <div className="flex gap-[1.04cqw] mt-[2.78cqh]">
          <button
            onClick={() => setActiveTab('write')}
            className={`px-[2.5cqw] py-[1.39cqh] rounded-[2.08cqw] text-[1.25cqw] font-bold transition-transform hover:scale-105 active:scale-95`}
            style={{
              backgroundColor: activeTab === 'write' ? COLORS.userInquiry.nookMint : '#E5E7EB',
              color: activeTab === 'write' ? 'white' : '#9CA3AF',
            }}
          >
            문의작성
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-[2.5cqw] py-[1.39cqh] rounded-[2.08cqw] text-[1.25cqw] font-bold transition-transform hover:scale-105 active:scale-95`}
            style={{
              backgroundColor: activeTab === 'list' ? COLORS.userInquiry.nookCyan : '#E5E7EB',
              color: activeTab === 'list' ? 'white' : '#9CA3AF',
            }}
          >
            내 문의내역
          </button>
        </div>

        {/* 나가기 버튼 */}
        <ExitButton onClick={() => navigate('/home')} className="absolute bottom-[2.78cqh] right-[2.08cqw]" />

        {/* 문의 상세 모달 */}
        {selectedInquiry && (
          <div
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm"
            onClick={() => setSelectedInquiry(null)}
          >
            <div
              className="w-[50cqw] max-h-[80cqh] rounded-[2.08cqw] p-[2.08cqw] overflow-y-auto"
              style={{ backgroundColor: COLORS.userInquiry.creamWhite }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-[1.85cqh]">
                <div className="flex flex-col gap-[0.93cqh]">
                  <div className="flex items-center gap-[0.63cqw]">
                    <CategoryBadge category={selectedInquiry.category} />
                    <StatusBadge status={selectedInquiry.status} />
                  </div>
                  <h2 className="text-[1.67cqw] font-black" style={{ color: COLORS.userInquiry.darkBrown }}>
                    {selectedInquiry.title}
                  </h2>
                  <span className="text-[0.83cqw] text-[#9CA3AF]">
                    {new Date(selectedInquiry.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="text-[1.67cqw] font-bold text-[#9CA3AF] hover:text-[#594E36]"
                >
                  ✕
                </button>
              </div>

              <div
                className="p-[1.25cqw] rounded-[1.04cqw] mb-[1.85cqh]"
                style={{ backgroundColor: COLORS.userInquiry.creamIvory }}
              >
                <h3 className="text-[1.04cqw] font-bold mb-[0.93cqh]" style={{ color: COLORS.userInquiry.darkBrown }}>
                  문의 내용
                </h3>
                <p className="text-[0.94cqw] text-[#4B5563] whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.content}
                </p>

                {/* 첨부 이미지 표시 */}
                {selectedInquiry.imageUrl && (
                  <div className="mt-[1.85cqh]">
                    <h4
                      className="text-[0.94cqw] font-bold mb-[0.93cqh]"
                      style={{ color: COLORS.userInquiry.darkBrown }}
                    >
                      첨부 이미지
                    </h4>
                    <img
                      src={selectedInquiry.imageUrl}
                      alt="첨부 이미지"
                      className="max-w-full rounded-[1.04cqw] border-[0.21cqw]"
                      style={{ borderColor: COLORS.userInquiry.darkBrown }}
                    />
                  </div>
                )}
              </div>

              {selectedInquiry.answer ? (
                <div className="bg-[#E8F5E9] p-[1.25cqw] rounded-[1.04cqw] border-[0.16cqw] border-[#81C784]">
                  <h3 className="text-[1.04cqw] font-bold text-[#2E7D32] mb-[0.93cqh]">답변</h3>
                  <p className="text-[0.94cqw] text-[#1B5E20] whitespace-pre-wrap leading-relaxed mb-[0.93cqh]">
                    {selectedInquiry.answer.content}
                  </p>
                  <span className="text-[0.73cqw] text-[#4CAF50]">
                    답변일: {new Date(selectedInquiry.answer.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ) : (
                <div className="bg-[#F3F4F6] p-[1.25cqw] rounded-[1.04cqw] flex justify-center">
                  <span className="text-[0.94cqw] font-bold text-[#9CA3AF]">⏳ 아직 답변이 등록되지 않았어요</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AspectLayout>
  );
}
