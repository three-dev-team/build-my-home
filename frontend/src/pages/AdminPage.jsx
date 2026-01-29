import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('inquiry');

  // 문의 관련 상태
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [answerContent, setAnswerContent] = useState('');

  // 페이징 관련 상태 추가
  const [currentPage, setCurrentPage] = useState(0); // 현재 페이지
  const [totalPages, setTotalPages] = useState(0); // 전체 페이지 수
  const [totalElements, setTotalElements] = useState(0); // 전체 문의 개수

  // 회원 관련 상태
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // 카테고리 배지 컴포넌트
  const CategoryBadge = ({ category }) => {
    const categoryConfig = {
      USER_REPORT: { label: '🚨 유저신고', color: 'bg-red-100 text-red-800' },
      BUG_REPORT: { label: '🐛 버그신고', color: 'bg-orange-100 text-orange-800' },
      ETC: { label: '📦 기타', color: 'bg-white text-black' },
    };
    const config = categoryConfig[category] || categoryConfig.ETC;

    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${config.color}`}>{config.label}</span>;
  };

  // 문의 목록 조회
  useEffect(() => {
    if (activeTab === 'inquiry') {
      fetchInquiries();
    }
  }, [activeTab]);

  // 회원 목록 조회
  useEffect(() => {
    if (activeTab === 'member') {
      fetchMembers();
    }
  }, [activeTab]);

  // 문의 목록 가져오기
  const fetchInquiries = async (page = 0) => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`/api/admin/inquiries?page=${page}&size=4`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInquiries(response.data.content);
      setCurrentPage(response.data.number); // 현재 페이지
      setTotalPages(response.data.totalPages); // 전체 페이지 수
      setTotalElements(response.data.totalElements); // 전체 개수
    } catch (error) {
      console.error('문의 목록 조회 실패:', error);
      if (error.response?.status === 403) {
        alert('관리자 권한이 필요합니다.');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // 회원 목록 가져오기
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const response = await axios.get('/api/admin/members?page=0&size=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(response.data.content);
    } catch (error) {
      console.error('회원 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 문의 상세 조회
  const handleSelectInquiry = async (inquiryId) => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`/api/admin/inquiries/${inquiryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedInquiry(response.data);
      setAnswerContent('');
    } catch (error) {
      console.error('문의 상세 조회 실패:', error);
      alert('문의를 불러오는데 실패했습니다.');
    }
  };

  // 답변 등록
  const handleSubmitAnswer = async () => {
    if (!answerContent.trim()) {
      alert('답변 내용을 입력해주세요!');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.post(
        `/api/admin/inquiries/${selectedInquiry.id}/answer`,
        { content: answerContent },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert('답변이 등록되었습니다! 🌟');
      setAnswerContent('');
      setSelectedInquiry(null);
      fetchInquiries();
    } catch (error) {
      console.error('답변 등록 실패:', error);
      if (error.response?.data?.message?.includes('이미 답변')) {
        alert('이미 답변이 등록된 문의입니다.');
      } else {
        alert('답변 등록에 실패했습니다.');
      }
    }
  };

  // 페이지 변경
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchInquiries(newPage);
    setSelectedInquiry(null); // 선택 초기화
  };

  return (
    <div
      className="relative w-full min-h-screen bg-[#fdf6e3] flex items-center justify-center overflow-auto p-8"
      style={{ backgroundImage: "url('/images/background.jpg')", backgroundSize: 'cover' }}
    >
      <div className="relative w-full max-w-[1200px] bg-[#d1d1d1] p-8 rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🦝</span>
            <h1 className="text-3xl font-black text-[#5d4037]">너굴 관리소</h1>
          </div>
          <button
            onClick={() => navigate('/mypage')}
            className="bg-[#bc8a5f] text-white px-6 py-2 rounded-full font-black hover:brightness-110"
          >
            돌아가기
          </button>
        </div>

        {/* 탭 버튼 */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('inquiry')}
            className={`px-8 py-3 rounded-2xl font-black text-lg transition-all shadow-md ${
              activeTab === 'inquiry'
                ? 'bg-[#e2f0a1] text-[#5d4037] border-4 border-[#8b5a2b]'
                : 'bg-white text-[#8b5a2b] hover:bg-[#efe7d1]'
            }`}
          >
            📬 문의 관리
          </button>
          <button
            onClick={() => setActiveTab('member')}
            className={`px-8 py-3 rounded-2xl font-black text-lg transition-all shadow-md ${
              activeTab === 'member'
                ? 'bg-[#e2f0a1] text-[#5d4037] border-4 border-[#8b5a2b]'
                : 'bg-white text-[#8b5a2b] hover:bg-[#efe7d1]'
            }`}
          >
            👥 회원 관리
          </button>
        </div>

        {/* 문의 관리 탭 */}
        {activeTab === 'inquiry' && (
          <div className="flex gap-4 h-[600px]">
            {/* 왼쪽: 문의 목록 */}
            <div className="w-1/3 bg-white rounded-[30px] p-6 border-4 border-[#8b5a2b]/20 shadow-inner flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-[#8b5a2b] flex items-center gap-2">
                  <span>📬</span> 문의 목록
                </h2>
                <span className="text-sm text-[#8d7b6d] font-bold">전체 {totalElements}개</span>
              </div>

              {/* 문의 리스트 */}
              <div className="flex-1 overflow-y-auto mb-4">
                {loading ? (
                  <p className="text-center text-[#8b5a2b] py-8">불러오는 중...</p>
                ) : inquiries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-2">🍃</p>
                    <p className="text-[#8b5a2b] font-bold">문의가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inquiries.map((inquiry) => (
                      <button
                        key={inquiry.id}
                        onClick={() => handleSelectInquiry(inquiry.id)}
                        className={`w-full text-left p-4 rounded-2xl transition-all ${
                          selectedInquiry?.id === inquiry.id
                            ? 'bg-[#e2f0a1] border-3 border-[#8b5a2b]'
                            : 'bg-[#f5f5f5] hover:bg-[#efe7d1]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            <CategoryBadge category={inquiry.category} />
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-bold ${
                                inquiry.status === 'ANSWERED'
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-yellow-200 text-yellow-800'
                              }`}
                            >
                              {inquiry.status === 'ANSWERED' ? '답변완료' : '답변대기'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(inquiry.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-bold text-[#5d4037] text-sm mb-1 truncate">{inquiry.title}</p>
                        <p className="text-xs text-[#8b5a2b]">작성자: {inquiry.memberNickname}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 페이징 버튼 */}
              {!loading && totalPages > 0 && (
                <div className="flex items-center justify-center gap-2 pt-4 border-t-2 border-gray-200">
                  {/* 이전 버튼 */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                      currentPage === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#efe7d1] text-[#8b5a2b] hover:bg-[#e2f0a1]'
                    }`}
                  >
                    ◀
                  </button>

                  {/* 페이지 번호 버튼들 */}
                  {Array.from({ length: totalPages }, (_, i) => i).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                        currentPage === pageNum
                          ? 'bg-[#bc8a5f] text-white'
                          : 'bg-[#efe7d1] text-[#8b5a2b] hover:bg-[#e2f0a1]'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  ))}

                  {/* 다음 버튼 */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                    className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                      currentPage === totalPages - 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#efe7d1] text-[#8b5a2b] hover:bg-[#e2f0a1]'
                    }`}
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>

            {/* 오른쪽: 문의 상세 & 답변 */}
            <div className="flex-1 bg-white rounded-[30px] p-6 border-4 border-[#8b5a2b]/20 shadow-inner overflow-y-auto">
              {!selectedInquiry ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <span className="text-6xl mb-4">🌳</span>
                  <p className="text-xl font-black text-[#8b5a2b] mb-2">문의를 선택해주세요</p>
                  <p className="text-sm text-[#8d7b6d]">왼쪽 목록에서 문의를 클릭하면 내용을 볼 수 있어요</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 문의 정보 */}
                  <div className="bg-[#fef9ed] rounded-2xl p-6 border-2 border-[#bc8a5f]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-[#5d4037] mb-2">{selectedInquiry.title}</h3>
                        <div className="flex items-center gap-2">
                          <CategoryBadge category={selectedInquiry.category} />
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-bold ${
                              selectedInquiry.status === 'ANSWERED'
                                ? 'bg-green-200 text-green-800'
                                : 'bg-yellow-200 text-yellow-800'
                            }`}
                          >
                            {selectedInquiry.status === 'ANSWERED' ? '답변완료' : '답변대기'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#8b5a2b] mb-4">
                      <span>👤 {selectedInquiry.memberNickname}</span>
                      <span>📅 {new Date(selectedInquiry.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="bg-white rounded-xl p-4 min-h-[100px]">
                      <p className="text-[#5d4037] whitespace-pre-wrap">{selectedInquiry.content}</p>
                    </div>
                  </div>

                  {/* 기존 답변 */}
                  {selectedInquiry.answer && (
                    <div className="bg-[#e8f5e9] rounded-2xl p-6 border-2 border-green-300">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">💬</span>
                        <h4 className="font-black text-green-800">등록된 답변</h4>
                      </div>
                      <div className="bg-white rounded-xl p-4">
                        <p className="text-[#5d4037] mb-2">{selectedInquiry.answer.content}</p>
                        <p className="text-xs text-gray-500">
                          {selectedInquiry.answer.adminNickname} ·{' '}
                          {new Date(selectedInquiry.answer.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 답변 작성 */}
                  {!selectedInquiry.answer && (
                    <div className="bg-[#fff3e0] rounded-2xl p-6 border-2 border-[#ff9800]">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">✍️</span>
                        <h4 className="font-black text-[#f57c00]">답변 작성</h4>
                      </div>
                      <textarea
                        value={answerContent}
                        onChange={(e) => setAnswerContent(e.target.value)}
                        placeholder="주민에게 친절한 답변을 남겨주세요! 🌟"
                        className="w-full h-[200px] bg-white rounded-xl p-4 font-bold text-[#5d4037] border-2 border-[#bc8a5f] outline-none resize-none"
                      />
                      <button
                        onClick={handleSubmitAnswer}
                        className="w-full mt-4 bg-[#bc8a5f] text-white py-3 rounded-xl font-black text-lg shadow-md hover:brightness-110 transition-all"
                      >
                        답변 등록하기 ✨
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 회원 관리 탭 */}
        {activeTab === 'member' && (
          <div className="bg-white rounded-[30px] p-8 border-4 border-[#8b5a2b]/20 shadow-inner min-h-[600px]">
            <h2 className="text-2xl font-black text-[#8b5a2b] mb-6 flex items-center gap-2">
              <span>👥</span> 회원 관리
            </h2>

            {loading ? (
              <p className="text-center text-[#8b5a2b] py-20">불러오는 중...</p>
            ) : members.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🍃</p>
                <p className="text-xl font-black text-[#8b5a2b]">회원이 없습니다</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#8b5a2b]">
                      <th className="px-4 py-3 text-left font-black text-[#8b5a2b]">닉네임</th>
                      <th className="px-4 py-3 text-left font-black text-[#8b5a2b]">이메일</th>
                      <th className="px-4 py-3 text-center font-black text-[#8b5a2b]">레벨</th>
                      <th className="px-4 py-3 text-center font-black text-[#8b5a2b]">보유 벨</th>
                      <th className="px-4 py-3 text-center font-black text-[#8b5a2b]">플레이 횟수</th>
                      <th className="px-4 py-3 text-center font-black text-[#8b5a2b]">역할</th>
                      <th className="px-4 py-3 text-center font-black text-[#8b5a2b]">가입일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member, index) => (
                      <tr
                        key={member.id}
                        className={`border-b border-gray-200 hover:bg-[#fef9ed] transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-bold text-[#5d4037]">{member.nickname}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#8b5a2b]">{member.email}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold text-[#5d4037]">Lv.{member.level}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-[#5d4037]">
                          {member.bell.toLocaleString()} 🔔
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-[#5d4037]">{member.playCount}회</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-bold ${
                              member.role === 'ADMIN' ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'
                            }`}
                          >
                            {member.role === 'ADMIN' ? '관리자' : '일반'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
