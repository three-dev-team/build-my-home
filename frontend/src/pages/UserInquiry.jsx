import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopButtons from '../components/common/TopButtons';
import ExitButton from '../components/common/ExitButton';

export default function UserInquiryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('write'); // write, list

  // 문의 작성 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('USER_REPORT');

  // 문의 목록 상태
  const [myInquiries, setMyInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [cursor, setCursor] = useState(null); // 커서
  const [hasMore, setHasMore] = useState(true); // 더 불러올 데이터가 있는지

  const [loading, setLoading] = useState(false);

  // 카테고리 옵션 (이미지 경로 설정)
  const categories = [
    { value: 'USER_REPORT', label: '유저 신고', icon: '/images/user-inquiry/icon-siren.svg', color: 'bg-red-100' },
    { value: 'BUG_REPORT', label: '버그 신고', icon: '/images/user-inquiry/icon-bug.svg', color: 'bg-orange-100' },
    { value: 'ETC', label: '기타', icon: '/images/user-inquiry/icon-etc.svg', color: 'bg-gray-100' },
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

  // 문의 작성
  const handleSubmitInquiry = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요! 🌿');
      return;
    }

    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      await axios.post(
        '/api/member/inquiries',
        { title, content, category },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert('문의가 등록되었습니다! 🎉');
      setTitle('');
      setContent('');
      setCategory('USER_REPORT');
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
        className={`px-[1.25vw] py-[0.6vh] rounded-full text-[0.83vw] font-bold text-white ${
          isAnswered ? 'bg-[#10E3A8]' : 'bg-[#00C9E0]'
        }`}
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
        color: 'bg-[#FFF8E1] text-[#594E36]',
      },
      BUG_REPORT: {
        label: '버그 신고',
        icon: '/images/user-inquiry/icon-bug.svg',
        color: 'bg-[#F9F0A3] text-[#594E36]',
      },
      ETC: { label: '기타', icon: '/images/user-inquiry/icon-etc.svg', color: 'bg-[#F3F4F6] text-[#616161]' },
    };
    const config = categoryConfig[category] || categoryConfig.ETC;

    return (
      <div className={`flex items-center gap-[0.42vw] px-[1.04vw] py-[0.6vh] rounded-full ${config.color}`}>
        <div
          className="w-[1.04vw] h-[1.04vw]"
          style={{
            backgroundColor: config.color.includes('text-[#594E36]') ? '#594E36' : '#616161',
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
        <span className="text-[0.83vw] font-bold">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden font-gosanja">
      {/* 16:9 비율 컨테이너 */}
      <div
        className="relative w-full aspect-video max-h-screen overflow-hidden bg-[url('/images/user-inquiry/bg-inquiry.jpg')] bg-cover bg-center flex flex-col items-center"
        style={{ containerType: 'size' }}
      >
        {/* 1. 상단 아이콘 영역 */}
        {/* 홈 버튼 (좌측 상단) */}
        <div className="absolute top-[2.08cqw] left-[2.08cqw] z-50">
          <button
            onClick={() => navigate('/home')}
            className="w-[4.17cqw] h-[4.17cqw] bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer border-[0.16cqw] border-white"
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

        {/* TopButtons (우측 상단) */}
        <div className="absolute top-[2.08cqw] right-[2.08cqw] z-50">
          <TopButtons
            nickname={sessionStorage.getItem('nickname') || '주민'}
            onProfileClick={() => navigate('/mypage')}
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

        {/* 헤더 타이틀 - 80px = 4.17vw font size, top margin adjustment */}
        <div className="flex flex-col items-center gap-[1.56vh] mb-[1.85vh]">
          <h1 className="text-[4.17vw] font-black text-[#594E36] mt-[4.63vh]">
            {activeTab === 'write' ? '문의하기' : '내 문의내역'}
          </h1>
          {/* 구분선 (점선) */}
          <div className="flex items-center w-[40vw] gap-[0.52vw]">
            <div className="w-[0.63vw] h-[0.63vw] rounded-full bg-[#594E36]" />
            <div className="flex-1 h-[0.16vh] border-b-[0.26vh] border-[#594E36] border-dashed opacity-80" />
            <div className="w-[0.63vw] h-[0.63vw] rounded-full bg-[#594E36]" />
          </div>
        </div>

        {/* 메인 컨텐트 카드 - 1280px = 66.67vw width, 680px = 62.96vh height */}
        <div className="w-[66.67vw] h-[62.96vh] bg-[#FDF5E6] rounded-[2.08vw] flex flex-col items-center py-[3.7vh] px-[4.17vw] relative">
          {/* 탭 메뉴 (하단 중앙 배치 또는 상단 배치? 디자인 시안에는 하단에 위치함) */}
          {/* 디자인 시안대로라면 컨텐츠 영역이 먼저 나오고 하단에 버튼이 있음. 
              하지만 UX상 상단 탭이 익숙할 수 있으나, 요구사항에 맞춰 하단 탭 버튼(초록/파랑)으로 구현 */}

          {/* 1. 문의 작성 탭 컨텐츠 */}
          {activeTab === 'write' && (
            <div className="w-full flex flex-col gap-[2.22vh]">
              {/* 카테고리 선택 - 60px = 3.13vw height */}
              <div className="flex items-center gap-[2.08vw]">
                <span className="text-[1.25vw] font-bold text-[#594E36] w-[8.33vw] text-right">카테고리 선택</span>
                <div className="flex gap-[1.04vw]">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-[0.42vw] px-[1.25vw] py-[0.93vh] rounded-[1.04vw] font-bold text-[1.04vw] transition-all border-[0.16vw] ${
                        category === cat.value
                          ? 'bg-[#F9F0A3] border-[#F2C94C] text-[#594E36] shadow-sm'
                          : 'bg-[#FFF8E7] border-[#EAD7B8] text-[#9CA3AF] hover:bg-[#FFF8EA]'
                      }`}
                    >
                      <div
                        className="w-[1.25vw] h-[1.25vw]"
                        style={{
                          backgroundColor: category === cat.value ? '#594E36' : '#9CA3AF',
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

              {/* 제목 입력 - 60px = 5.56vh height */}
              <div className="flex items-center gap-[2.08vw]">
                <span className="text-[1.25vw] font-bold text-[#594E36] w-[8.33vw] text-right">제목</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목"
                  className="flex-1 h-[5.56vh] px-[1.25vw] rounded-[1.04vw] bg-[#FFFBF0] border-[0.16vw] border-transparent focus:border-[#F2C94C] outline-none text-[1.04vw] font-bold text-[#594E36] placeholder:text-[#D1D5DB]"
                  maxLength={25}
                />
              </div>

              {/* 내용 입력 - 300px = 27.78vh height */}
              <div className="flex items-start gap-[2.08vw]">
                <span className="text-[1.25vw] font-bold text-[#594E36] w-[8.33vw] text-right mt-[0.93vh]">내용</span>
                <div className="flex-1 flex flex-col gap-[1.48vh]">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용"
                    className="w-full h-[23.15vh] p-[1.25vw] rounded-[1.04vw] bg-[#FFFBF0] border-[0.16vw] border-transparent focus:border-[#F2C94C] outline-none text-[1.04vw] font-bold text-[#594E36] resize-none placeholder:text-[#D1D5DB]"
                  />
                  {/* 첨부파일 버튼 (더미) - 24px height approx */}
                  <button className="self-start px-[0.83vw] py-[0.46vh] bg-[#E5E7EB] rounded-[1.04vw] text-[0.73vw] font-bold text-[#6B7280] hover:bg-[#D1D5DB]">
                    첨부파일
                  </button>
                </div>
              </div>

              {/* 등록하기 버튼 (카드 내부 하단) - 160px width, 60px height */}
              <div className="flex justify-center mt-[1.85vh]">
                <button
                  onClick={handleSubmitInquiry}
                  disabled={loading}
                  className="px-[3.33vw] py-[1.39vh] bg-[#594E36] text-[#FDFBF6] text-[1.25vw] font-bold rounded-[1.04vw] hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
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
                  <p className="text-[1.25vw] font-bold text-[#594E36]">로딩 중...</p>
                </div>
              ) : myInquiries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-[1.85vh]">
                  <p className="text-[1.25vw] font-bold text-[#9CA3AF]">아직 문의 내역이 없어요 🌿</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-[1.04vw] py-[0.93vh] space-y-[1.48vh] scrollbar-thin scrollbar-thumb-[#D1D5DB] scrollbar-track-transparent">
                  {myInquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      onClick={() => handleSelectInquiry(inquiry.id)}
                      className="bg-white px-[2.08vw] py-[1.85vh] rounded-[2.08vw] flex flex-col gap-[1.11vh] cursor-pointer hover:bg-gray-50 transition"
                    >
                      {/* 1열: 문의번호 | 날짜 */}
                      <div className="flex justify-between items-center text-[0.83vw] text-[#9CA3AF] font-bold">
                        <span>[문의번호] {inquiry.id}</span>
                        <span>{new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>

                      {/* 2열: 제목 */}
                      <h3 className="text-[1.04vw] font-black text-[#594E36] line-clamp-1">{inquiry.title}</h3>

                      {/* 3열: 카테고리 | 상태 */}
                      <div className="flex justify-between items-center">
                        <CategoryBadge category={inquiry.category} />
                        <StatusBadge status={inquiry.status} />
                      </div>
                    </div>
                  ))}

                  {hasMore ? (
                    <div className="flex justify-center pt-[0.93vh]">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="px-[1.67vw] py-[0.93vh] bg-[#FFF8E1] text-[#F57F17] font-bold rounded-[1.04vw] text-[0.83vw] hover:bg-[#FFECB3] transition"
                      >
                        {loading ? '로딩 중...' : '더 보기'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center pt-[0.93vh] pb-[0.93vh]">
                      <div className="w-full bg-[#FFFBF0] py-[1.39vh] rounded-[1.04vw] flex justify-center items-center">
                        <span className="text-[0.94vw] font-bold text-[#9CA3AF]">모든 문의를 다 읽었습니다</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 탭 전환 버튼들 - 180px width, 60px height approx */}
        <div className="flex gap-[1.04vw] mt-[2.78vh]">
          <button
            onClick={() => setActiveTab('write')}
            className={`px-[2.5vw] py-[1.39vh] rounded-[2.08vw] text-[1.25vw] font-bold transition-transform hover:scale-105 active:scale-95 ${
              activeTab === 'write' ? 'bg-[#10E3A8] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'
            }`}
          >
            문의작성
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-[2.5vw] py-[1.39vh] rounded-[2.08vw] text-[1.25vw] font-bold transition-transform hover:scale-105 active:scale-95 ${
              activeTab === 'list' ? 'bg-[#00C9E0] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'
            }`}
          >
            내 문의내역
          </button>
        </div>

        {/* 나가기 버튼 (우측 하단 고정) */}
        <ExitButton onClick={() => navigate('/home')} className="absolute bottom-[2.78vh] right-[2.08vw]" />

        {/* 문의 상세 모달 */}
        {selectedInquiry && (
          <div
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm"
            onClick={() => setSelectedInquiry(null)}
          >
            <div
              className="w-[50vw] max-h-[80vh] bg-[#FDFBF6] rounded-[2.08vw] p-[2.08vw] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-[1.85vh]">
                <div className="flex flex-col gap-[0.93vh]">
                  <div className="flex items-center gap-[0.63vw]">
                    <CategoryBadge category={selectedInquiry.category} />
                    <StatusBadge status={selectedInquiry.status} />
                  </div>
                  <h2 className="text-[1.67vw] font-black text-[#594E36]">{selectedInquiry.title}</h2>
                  <span className="text-[0.83vw] text-[#9CA3AF]">
                    {new Date(selectedInquiry.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="text-[1.67vw] font-bold text-[#9CA3AF] hover:text-[#594E36]"
                >
                  ✕
                </button>
              </div>

              <div className="bg-[#FFF8E1] p-[1.25vw] rounded-[1.04vw] mb-[1.85vh]">
                <h3 className="text-[1.04vw] font-bold text-[#594E36] mb-[0.93vh]">📝 문의 내용</h3>
                <p className="text-[0.94vw] text-[#4B5563] whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.content}
                </p>
              </div>

              {selectedInquiry.answer ? (
                <div className="bg-[#E8F5E9] p-[1.25vw] rounded-[1.04vw] border-[0.16vw] border-[#81C784]">
                  <h3 className="text-[1.04vw] font-bold text-[#2E7D32] mb-[0.93vh]">💬 답변</h3>
                  <p className="text-[0.94vw] text-[#1B5E20] whitespace-pre-wrap leading-relaxed mb-[0.93vh]">
                    {selectedInquiry.answer.content}
                  </p>
                  <span className="text-[0.73vw] text-[#4CAF50]">
                    답변일: {new Date(selectedInquiry.answer.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ) : (
                <div className="bg-[#F3F4F6] p-[1.25vw] rounded-[1.04vw] flex justify-center">
                  <span className="text-[0.94vw] font-bold text-[#9CA3AF]">⏳ 아직 답변이 등록되지 않았어요</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
