import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

  // 카테고리 옵션
  const categories = [
    { value: 'USER_REPORT', label: '🚨 유저 신고', color: 'bg-red-100' },
    { value: 'BUG_REPORT', label: '🐛 버그 신고', color: 'bg-orange-100' },
    { value: 'ETC', label: '📦 기타', color: 'bg-gray-100' },
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

      console.log('=== 문의 목록 요청 ===');
      console.log('URL:', url);
      console.log('Token:', token ? '있음' : '없음');

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('응답 데이터:', response.data);

      const newInquiries = response.data;

      console.log('=== 조회 결과 ===');
      console.log('받은 데이터 개수:', newInquiries.length);
      console.log('데이터:', newInquiries);

      if (newInquiries.length > 0) {
        // 기존 데이터에 추가
        setMyInquiries((prev) => [...prev, ...newInquiries]);

        // 마지막 항목의 id를 다음 커서로 설정
        const lastInquiry = newInquiries[newInquiries.length - 1];
        setCursor(lastInquiry.id);

        console.log('다음 커서:', lastInquiry.id);

        // size개 미만이면 더 이상 데이터가 없음
        if (newInquiries.length < size) {
          setHasMore(false);
          console.log(`더 이상 데이터 없음 (${size}개 미만)`);
        } else {
          console.log('더 보기 가능');
        }
      } else {
        setHasMore(false);
        console.log('데이터 없음');
      }
    } catch (error) {
      console.error('=== 문의 목록 조회 실패 ===');
      console.error('에러:', error);
      console.error('에러 응답:', error.response?.data);
      console.error('에러 상태:', error.response?.status);
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
    const statusConfig = {
      OPEN: { label: '답변 대기', color: 'bg-yellow-100 text-yellow-800' },
      ANSWERED: { label: '답변 완료', color: 'bg-green-100 text-green-800' },
    };
    const config = statusConfig[status] || statusConfig.OPEN;

    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>{config.label}</span>;
  };

  // 카테고리 배지 컴포넌트 추가
  const CategoryBadge = ({ category }) => {
    const categoryConfig = {
      USER_REPORT: { label: '🚨 유저 신고', color: 'bg-red-100 text-red-800' },
      BUG_REPORT: { label: '🐛 버그 신고', color: 'bg-orange-100 text-orange-800' },
      ETC: { label: '📦 기타', color: 'bg-gray-100 text-gray-800' },
    };
    const config = categoryConfig[category] || categoryConfig.ETC;

    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>{config.label}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#a8d5ba] to-[#e8f5e9] p-4">
      <style>
        {' '}
        {/* 스크롤 스타일 */}
        {`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #efe7d1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #8b5a2b;
                    border-radius: 10px;
                    border: 2px solid #efe7d1;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #bc8a5f;
                }
            `}
      </style>
      {/* 헤더 */}
      <div className="max-w-4xl mx-auto mb-4">
        <button
          onClick={() => navigate('/mypage')}
          className="mb-3 px-4 py-2 bg-white rounded-lg shadow hover:bg-gray-50 transition text-sm"
        >
          ← 마이페이지로 돌아가기
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-4 border-4 border-[#8b5a2b]">
          <h1 className="text-2xl font-black text-[#5d4037] mb-1">📮 문의하기</h1>
          <p className="text-sm text-gray-600">너굴에게 궁금한 점을 물어보세요! 🦝</p>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('write')}
            className={`flex-1 py-2.5 rounded-xl font-bold transition text-sm ${
              activeTab === 'write'
                ? 'bg-white text-[#5d4037] shadow-lg border-2 border-[#8b5a2b]'
                : 'bg-[#efe7d1] text-gray-600 hover:bg-white'
            }`}
          >
            ✍️ 문의 작성
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2.5 rounded-xl font-bold transition text-sm ${
              activeTab === 'list'
                ? 'bg-white text-[#5d4037] shadow-lg border-2 border-[#8b5a2b]'
                : 'bg-[#efe7d1] text-gray-600 hover:bg-white'
            }`}
          >
            📋 내 문의 내역
          </button>
        </div>
      </div>

      {/* 문의 작성 탭 */}
      {activeTab === 'write' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-4 border-[#8b5a2b]">
            {/* 카테고리 선택 */}
            <div className="mb-4">
              <label className="block text-base font-bold text-[#5d4037] mb-2">카테고리 선택</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`p-2.5 rounded-xl font-bold transition border-2 text-sm ${
                      category === cat.value
                        ? `${cat.color} border-[#8b5a2b] shadow-md`
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 제목 입력 */}
            <div className="mb-4">
              <label className="block text-base font-bold text-[#5d4037] mb-2">제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="문의 제목을 입력하세요"
                className="w-full p-2.5 border-2 border-[#8b5a2b] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a8d5ba] text-sm"
              />
            </div>

            {/* 내용 입력 */}
            <div className="mb-4">
              <label className="block text-base font-bold text-[#5d4037] mb-2">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="문의 내용을 상세히 작성해주세요"
                rows="6"
                className="w-full p-2.5 border-2 border-[#8b5a2b] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a8d5ba] text-sm"
              />
            </div>

            {/* 제출 버튼 */}
            <button
              onClick={handleSubmitInquiry}
              disabled={loading}
              className="w-full py-3 bg-[#a8d5ba] text-white font-black text-base rounded-xl hover:bg-[#8bc4a0] transition disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? '등록 중...' : '📮 문의 등록하기'}
            </button>
          </div>
        </div>
      )}

      {/* 내 문의 내역 탭 */}
      {activeTab === 'list' && (
        <div className="max-w-4xl mx-auto">
          {loading && myInquiries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl font-bold text-[#5d4037]">로딩 중...</p>
            </div>
          ) : myInquiries.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-4 border-[#8b5a2b]">
              <p className="text-xl font-bold text-gray-400">아직 문의 내역이 없어요 🌿</p>
              <button
                onClick={() => setActiveTab('write')}
                className="mt-4 px-6 py-3 bg-[#a8d5ba] text-white font-bold rounded-xl hover:bg-[#8bc4a0] transition"
              >
                첫 문의 작성하기
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* --- 1. 스크롤이 발생하는 리스트 영역 --- */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar border-b-2 border-dashed border-[#8b5a2b]/20 pb-4">
                {myInquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    onClick={() => handleSelectInquiry(inquiry.id)}
                    className="bg-white p-4 rounded-xl shadow-lg border-2 border-[#8b5a2b] hover:shadow-xl transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-bold text-[#5d4037] flex-1">{inquiry.title}</h3>
                      <StatusBadge status={inquiry.status} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryBadge category={inquiry.category} />
                    </div>
                    <p className="text-xs text-gray-500">{new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}</p>
                  </div>
                ))}
              </div>

              {/* --- 2. 스크롤 영역 밖의 하단 버튼 영역 --- */}
              <div className="mt-6 space-y-3">
                {hasMore && (
                  <div className="flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="px-8 py-3 bg-[#a8d5ba] text-white font-black rounded-xl hover:bg-[#8bc4a0] disabled:bg-gray-300 shadow-lg transition text-base border-2 border-[#8b5a2b]/20"
                    >
                      {loading ? '주민님 글 찾는 중...' : '📜 더 많은 문의 보기'}
                    </button>
                  </div>
                )}

                {!hasMore && (
                  <div className="text-center py-4 bg-white/30 rounded-full text-[#5d4037] font-bold text-sm">
                    모든 문의를 다 읽었습니다 🍃
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 문의 상세 모달 */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border-4 border-[#8b5a2b]">
            <div className="p-6">
              {/* 헤더 */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CategoryBadge category={selectedInquiry.category} />
                    <StatusBadge status={selectedInquiry.status} />
                  </div>
                  <h2 className="text-2xl font-black text-[#5d4037] mt-3">{selectedInquiry.title}</h2>
                  <p className="text-sm text-gray-500 mt-2">
                    작성일: {new Date(selectedInquiry.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>

              {/* 문의 내용 */}
              <div className="bg-[#efe7d1] p-6 rounded-xl mb-6">
                <h3 className="font-bold text-[#5d4037] mb-2">📝 문의 내용</h3>
                <p className="whitespace-pre-wrap text-gray-700">{selectedInquiry.content}</p>
              </div>

              {/* 답변 */}
              {selectedInquiry.answer ? (
                <div className="bg-[#e8f5e9] p-6 rounded-xl border-2 border-[#a8d5ba]">
                  <h3 className="font-bold text-[#5d4037] mb-2">💬 너굴의 답변</h3>
                  <p className="whitespace-pre-wrap text-gray-700 mb-3">{selectedInquiry.answer.content}</p>
                  <p className="text-sm text-gray-500">
                    답변일: {new Date(selectedInquiry.answer.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 p-6 rounded-xl border-2 border-yellow-200">
                  <p className="text-center text-yellow-700 font-bold">⏳ 아직 답변이 등록되지 않았어요</p>
                </div>
              )}

              {/* 닫기 버튼 */}
              <button
                onClick={() => setSelectedInquiry(null)}
                className="w-full mt-6 py-3 bg-[#8b5a2b] text-white font-bold rounded-xl hover:bg-[#6d4520] transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
