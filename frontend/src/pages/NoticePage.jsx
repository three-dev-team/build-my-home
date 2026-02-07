import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopButtons from '../components/common/TopButtons';
import ExitButton from '../components/common/ExitButton';
import HomeButton from '../components/common/HomeButton';
import AspectLayout from '../components/layout/AspectLayout';
import { COLORS } from '../constants/colors';

// 모달 컴포넌트
function Modal({ message, onConfirm, onCancel, type = 'alert' }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
      onClick={type === 'alert' ? onConfirm : undefined}
    >
      <div
        className="relative p-[2.08cqw] rounded-[2.08cqw] w-[36cqw] shadow-2xl"
        style={{ backgroundColor: COLORS.ac.creamWhite }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 메시지 */}
        <p
          className="text-[1.25cqw] font-bold text-center mb-[2.78cqh] whitespace-pre-wrap"
          style={{ color: COLORS.text }}
        >
          {message}
        </p>

        {/* 버튼 */}
        <div className="flex gap-[1.04cqw] justify-center">
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              className="px-[2.08cqw] py-[0.93cqh] text-[0.94cqw] rounded-[1.04cqw] transition-all hover:scale-105"
              style={{
                backgroundColor: COLORS.border,
                color: COLORS.text
              }}
            >
              취소
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-[2.08cqw] py-[0.93cqh] text-[0.94cqw] rounded-[1.04cqw] transition-all hover:scale-105"
            style={{
              backgroundColor: type === 'confirm' && onCancel ? COLORS.primary : COLORS.ac.coffeeBrown,
              color: COLORS.ac.creamWhite
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NoticePage() {
  const navigate = useNavigate();

  // 날짜 포맷 함수
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}. ${month}. ${day}`;
  };

  // 화면 모드: 'list' | 'detail' | 'write' | 'edit'
  const [mode, setMode] = useState('list');

  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // 작성/수정 폼
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  // 모달 상태
  const [modal, setModal] = useState({
    isOpen: false,
    message: '',
    type: 'alert', // 'alert' | 'confirm'
    onConfirm: null,
    onCancel: null
  });

  // 관리자 여부
  const [isAdmin, setIsAdmin] = useState(false);

  // 사용자 정보
  const [userData, setUserData] = useState({
    nickname: sessionStorage.getItem('nickname') || '주민',
    profileImage: sessionStorage.getItem('profileImage') || null,
  });

  // 모달 헬퍼 함수
  const showAlert = (message) => {
    setModal({
      isOpen: true,
      message,
      type: 'alert',
      onConfirm: () => setModal({ ...modal, isOpen: false }),
      onCancel: null
    });
  };

  const showConfirm = (message, onConfirm) => {
    setModal({
      isOpen: true,
      message,
      type: 'confirm',
      onConfirm: () => {
        setModal({ ...modal, isOpen: false });
        onConfirm();
      },
      onCancel: () => setModal({ ...modal, isOpen: false })
    });
  };

  // 관리자 여부 확인
  useEffect(() => {
    const role = sessionStorage.getItem('role');
    setIsAdmin(role === 'ADMIN');
  }, []);

  // 공지사항 목록 불러오기
  useEffect(() => {
    if (mode === 'list') {
      fetchNotices();
    }
  }, [mode]);

  const fetchNotices = async (pageNum = 0) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/notices`, {
        params: { page: pageNum, size: 10 }
      });

      const { content, last } = response.data;

      if (pageNum === 0) {
        setNotices(content);
      } else {
        setNotices(prev => [...prev, ...content]);
      }

      setHasMore(!last);
      setPage(pageNum);
    } catch (error) {
      console.error('공지사항 목록 조회 실패:', error);
      showAlert('공지사항을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotices(page + 1);
    }
  };

  const handleSelectNotice = async (noticeId) => {
    try {
      const response = await axios.get(`/api/notices/${noticeId}`);
      setSelectedNotice(response.data);
      setMode('detail');
    } catch (error) {
      console.error('공지사항 상세 조회 실패:', error);
      showAlert('공지사항을 불러오는데 실패했습니다.');
    }
  };

  // 작성 모드로 전환
  const handleCreate = () => {
    setFormData({ title: '', content: '' });
    setMode('write');
  };

  // 수정 모드로 전환
  const handleEdit = () => {
    setFormData({
      title: selectedNotice.title,
      content: selectedNotice.content
    });
    setMode('edit');
  };

  // 공지사항 저장 (작성/수정)
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showAlert('제목을 입력해주세요.');
      return;
    }
    if (!formData.content.trim()) {
      showAlert('내용을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');

      if (mode === 'edit') {
        // 수정
        await axios.put(`/api/admin/notices/${selectedNotice.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showAlert('공지사항이 수정되었습니다.');
      } else {
        // 작성
        await axios.post('/api/admin/notices', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showAlert('공지사항이 등록되었습니다.');
      }

      setMode('list');
      setSelectedNotice(null);
      fetchNotices(0);
    } catch (error) {
      console.error('공지사항 저장 실패:', error);
      if (error.response?.status === 401) {
        showAlert('관리자 권한이 필요합니다.');
      } else {
        showAlert('저장에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 삭제
  const handleDelete = () => {
    showConfirm('삭제하시겠습니까?', async () => {
      try {
        const token = sessionStorage.getItem('token');
        await axios.delete(`/api/admin/notices/${selectedNotice.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showAlert('삭제되었습니다.');
        setMode('list');
        setSelectedNotice(null);
        fetchNotices(0);
      } catch (error) {
        console.error('삭제 실패:', error);
        showAlert('삭제에 실패했습니다.');
      }
    });
  };

  // 취소
  const handleCancel = () => {
    if (mode === 'write' || mode === 'edit') {
      showConfirm('작성을 취소하시겠습니까?', () => {
        setMode(mode === 'edit' ? 'detail' : 'list');
        setFormData({ title: '', content: '' });
      });
    } else if (mode === 'detail') {
      setMode('list');
      setSelectedNotice(null);
    }
  };

  return (
    <AspectLayout>
      <div
        className="relative w-full h-full bg-cover bg-center flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: "url('/images/admin/bg-admin.jpg')" }}
      >
        {/* TopButtons */}
        <div className="absolute top-[3.7cqh] right-[2.08cqw] z-50">
          <div style={{ transform: 'scale(1)', transformOrigin: 'top right' }}>
            <TopButtons
              nickname={userData.nickname}
              profileImage={userData.profileImage}
              onProfileClick={() => navigate('/mypage')}
              onBellClick={() => navigate('/notifications')}
              onConfigClick={() => navigate('/config')}
              showShadow={false}
              colors={{
                text: COLORS.userInquiry.darkBrown,
                badgeBg: COLORS.userInquiry.coffeeBrown,
                badgeText: COLORS.userInquiry.creamIvory,
              }}
            />
          </div>
        </div>

        {/* 홈 버튼 */}
        <div className="absolute top-[3.7cqh] left-[2.08cqw] z-50">
          <HomeButton />
        </div>

        {/* 메인 카드 */}
        <div
          className="relative flex flex-col items-center justify-center"
          style={{
            width: '71.875cqw',
            height: '81.48cqh',
          }}
        >
          <div
            className="absolute inset-0 rounded-[3.33cqw] shadow-2xl"
            style={{ backgroundColor: COLORS.userInquiry.creamIvory }}
          />

          {/* 제목 + 버튼 */}
          <div className="absolute top-[4.63cqh] left-0 right-0 px-[4.17cqw]">
            <div className="grid items-center grid-cols-[1fr_auto_1fr]">
              {/* 왼쪽 빈 영역 (균형용) */}
              <div />

              {/* 제목 (항상 중앙 고정) */}
              <h1 className="text-[2.5cqw] font-black text-center" style={{ color: COLORS.userInquiry.darkBrown }}>
                {mode === 'write' && '공지사항 작성'}
                {mode === 'edit' && '공지사항 수정'}
                {(mode === 'list' || mode === 'detail') && '공지사항'}
              </h1>

              {/* 오른쪽 버튼 영역 */}
              <div className="justify-self-end">
                {isAdmin && mode === 'list' && (
                  <button
                    onClick={handleCreate}
                    className="px-[1.56cqw] py-[0.7cqh] text-[0.94cqw] rounded-[0.83cqw] transition-all hover:scale-105"
                    style={{
                      backgroundColor: COLORS.userInquiry.coffeeBrown,
                      color: COLORS.userInquiry.creamIvory,
                    }}
                  >
                    등록하기
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div
            className="absolute top-[11.11cqh] left-[4.17cqw] right-[4.17cqw] h-[0.2cqh]"
            style={{ backgroundColor: COLORS.userInquiry.darkBrown, opacity: 0.3 }}
          />

          {/* 내용 영역 */}
          <div className="absolute top-[13.89cqh] left-[4.17cqw] right-[4.17cqw] bottom-[4.63cqh] overflow-hidden">
            {/* 목록 모드 */}
            {mode === 'list' && (
              <div className="h-full overflow-y-auto pr-[1.04cqw]">
                {notices.length === 0 && !loading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[1.25cqw] font-bold" style={{ color: '#9CA3AF' }}>
                      등록된 공지사항이 없습니다
                    </p>
                  </div>
                ) : (
                  <div className="space-y-[1.39cqh]">
                    {notices.map((notice) => (
                      <div
                        key={notice.id}
                        onClick={() => handleSelectNotice(notice.id)}
                        className="p-[1.56cqw] rounded-[1.04cqw] cursor-pointer transition-all hover:shadow-md"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '0.16cqw solid #E8E1D3',
                        }}
                      >
                        <div className="flex justify-between items-start mb-[0.46cqh]">
                          <h3
                            className="text-[1.25cqw] font-bold flex-1"
                            style={{ color: COLORS.userInquiry.darkBrown }}
                          >
                            {notice.title}
                          </h3>
                          <span className="text-[0.83cqw] ml-[1.04cqw]" style={{ color: '#9CA3AF' }}>
                            조회수 {notice.viewCount}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[0.83cqw]" style={{ color: COLORS.userInquiry.coffeeBrown }}>
                            {notice.adminNickname}
                          </span>
                          <span className="text-[0.83cqw]" style={{ color: '#9CA3AF' }}>
                            {formatDate(notice.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {hasMore && (
                      <div className="flex justify-center pt-[1.39cqh]">
                        <button
                          onClick={loadMore}
                          disabled={loading}
                          className="px-[2.08cqw] py-[0.93cqh] text-[0.94cqw] font-bold rounded-[1.04cqw] transition-all hover:scale-105 disabled:opacity-50"
                          style={{
                            backgroundColor: COLORS.userInquiry.coffeeBrown,
                            color: COLORS.userInquiry.creamIvory,
                          }}
                        >
                          {loading ? '로딩 중...' : '더 보기'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 상세 모드 */}
            {mode === 'detail' && selectedNotice && (
              <div className="h-full overflow-y-auto pr-[1.04cqw]">
                <div className="space-y-[1.85cqh]">
                  <div>
                    <div className="flex justify-between items-start mb-[0.93cqh]">
                      <h2
                        className="text-[1.67cqw] font-black flex-1"
                        style={{ color: COLORS.userInquiry.coffeeBrown }}
                      >
                        {selectedNotice.title}
                      </h2>
                      {isAdmin && (
                        <div className="flex gap-[0.52cqw] ml-[1.04cqw]">
                          <button
                            onClick={handleEdit}
                            className="px-[1.04cqw] py-[0.46cqh] text-[0.73cqw] rounded-[0.52cqw] transition-all hover:scale-105"
                            style={{
                              backgroundColor: COLORS.userInquiry.nookMint,
                              color: COLORS.ac.creamWhite,
                            }}
                          >
                            수정
                          </button>
                          <button
                            onClick={handleDelete}
                            className="px-[1.04cqw] py-[0.46cqh] text-[0.73cqw] rounded-[0.52cqw] transition-all hover:scale-105"
                            style={{
                              backgroundColor: COLORS.admin.red,
                              color: COLORS.ac.creamWhite,
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[0.94cqw]" style={{ color: COLORS.userInquiry.coffeeBrown }}>
                        {selectedNotice.adminNickname}
                      </span>
                      <div className="flex gap-[1.04cqw] text-[0.83cqw]" style={{ color: '#9CA3AF' }}>
                        <span>{formatDate(selectedNotice.createdAt)}</span>
                        <span>조회수 {selectedNotice.viewCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[0.1cqh]" style={{ backgroundColor: COLORS.userInquiry.darkBrown, opacity: 0.2 }} />

                  <div className="p-[1.56cqw] rounded-[1.04cqw] min-h-[30cqh]" style={{ backgroundColor: '#FFFFFF' }}>
                    <p
                      className="text-[1.04cqw] leading-relaxed whitespace-pre-wrap"
                      style={{ color: COLORS.userInquiry.darkBrown }}
                    >
                      {selectedNotice.content}
                    </p>
                  </div>

                  <div className="flex justify-center pt-[1.39cqh]">
                    <button
                      onClick={handleCancel}
                      className="px-[2.08cqw] py-[0.93cqh] text-[0.94cqw] rounded-[1.04cqw] transition-all hover:scale-105"
                      style={{
                        backgroundColor: COLORS.userInquiry.coffeeBrown,
                        color: COLORS.userInquiry.creamIvory,
                      }}
                    >
                      목록으로
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 작성/수정 모드 */}
            {(mode === 'write' || mode === 'edit') && (
              <div className="h-full overflow-hidden pr-[1.04cqw]">
                <div className="space-y-[1.85cqh]">
                  {/* 제목 입력 */}
                  <div>
                    <label
                      className="block text-[1.04cqw] font-bold mb-[0.93cqh]"
                      style={{ color: COLORS.userInquiry.coffeeBrown }}
                    >
                      제목
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="제목을 입력하세요"
                      className="w-full p-[1.04cqw] rounded-[1.04cqw] text-[1.04cqw] outline-none transition-all"
                      style={{
                        backgroundColor: COLORS.ac.white,
                        color: COLORS.userInquiry.darkBrown,
                        border: '0.16cqw solid #E8E1D3',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = COLORS.userInquiry.coffeeBrown)}
                      onBlur={(e) => (e.target.style.borderColor = '#E8E1D3')}
                    />
                  </div>

                  {/* 내용 입력 */}
                  <div>
                    <label
                      className="block text-[1.04cqw] font-bold mb-[0.93cqh]"
                      style={{ color: COLORS.userInquiry.darkBrown }}
                    >
                      내용
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="내용을 입력하세요"
                      className="w-full h-[35cqh] p-[1.04cqw] rounded-[1.04cqw] text-[1.04cqw] outline-none resize-none transition-all"
                      style={{
                        backgroundColor: COLORS.ac.white,
                        color: COLORS.userInquiry.darkBrown,
                        border: '0.16cqw solid #E8E1D3',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = COLORS.userInquiry.coffeeBrown)}
                      onBlur={(e) => (e.target.style.borderColor = '#E8E1D3')}
                    />
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-[1.04cqw] justify-center pt-[1.85cqh]">
                    <button
                      onClick={handleCancel}
                      className="px-[2.6cqw] py-[1.11cqh] text-[1.04cqw] rounded-[1.04cqw] transition-all hover:scale-105"
                      style={{
                        backgroundColor: COLORS.border,
                        color: COLORS.ac.darkBrown,
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-[2.6cqw] py-[1.11cqh] text-[1.04cqw] rounded-[1.04cqw] transition-all hover:scale-105 disabled:opacity-50"
                      style={{
                        backgroundColor: COLORS.userInquiry.coffeeBrown,
                        color: COLORS.ac.creamWhite,
                      }}
                    >
                      {loading ? '저장 중...' : mode === 'edit' ? '수정' : '등록'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 모달 */}
          {modal.isOpen && (
            <Modal message={modal.message} type={modal.type} onConfirm={modal.onConfirm} onCancel={modal.onCancel} />
          )}
        </div>
      </div>
    </AspectLayout>
  );
}
