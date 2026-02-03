import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Cog6ToothIcon } from '@heroicons/react/24/solid';
import AspectLayout from '../components/layout/AspectLayout';

import { COLORS } from '../constants/colors';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('inquiry');

  // 문의 관련 상태
  const [inquiries, setInquiries] = useState([]);
  const [inquiryError, setInquiryError] = useState(false); // 에러 상태 추가
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [answerContent, setAnswerContent] = useState('');

  // 페이징 관련 상태 추가
  const [currentPage, setCurrentPage] = useState(0); // 현재 페이지
  const [totalPages, setTotalPages] = useState(0); // 전체 페이지 수
  const [totalElements, setTotalElements] = useState(0); // 전체 문의 개수
  const [searchKeyword, setSearchKeyword] = useState(''); // 검색 키워드

  // 필터 관련 상태
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]); // ['USER_REPORT', 'BUG_REPORT', 'ETC']
  const [selectedStatuses, setSelectedStatuses] = useState([]); // ['PENDING', 'ANSWERED']

  // 정렬 관련 상태
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('latest'); // 'latest', 'oldest', 'pending'

  // 회원 관련 상태
  const [members, setMembers] = useState([]);
  const [memberSearchKeyword, setMemberSearchKeyword] = useState(''); // 회원 검색 키워드
  const [memberCurrentPage, setMemberCurrentPage] = useState(0); // 회원 현재 페이지
  const [memberTotalPages, setMemberTotalPages] = useState(0); // 회원 전체 페이지 수

  // 회원 필터/정렬 상태
  const [isMemberFilterOpen, setIsMemberFilterOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]); // ['USER', 'ADMIN']
  const [isMemberSortOpen, setIsMemberSortOpen] = useState(false);
  const [selectedMemberSort, setSelectedMemberSort] = useState('latest'); // 'latest', 'oldest', 'level', 'bell'

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // 카테고리 배지 컴포넌트
  const CategoryBadge = ({ category }) => {
    const categoryConfig = {
      USER_REPORT: { label: '유저신고', bg: COLORS.admin.red, text: 'white' },
      BUG_REPORT: { label: '버그신고', bg: COLORS.admin.yellow, text: COLORS.admin.darkBrown },
      ETC: { label: '기타', bg: COLORS.admin.purpleGray, text: '#616161' },
    };
    const config = categoryConfig[category] || categoryConfig.ETC;

    return (
      <span
        className="px-[0.63cqw] py-[0.1cqw] rounded-full font-bold text-[0.63cqw]"
        style={{
          backgroundColor: config.bg,
          color: config.text,
        }}
      >
        {config.label}
      </span>
    );
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
  const fetchInquiries = async (page = 0, keyword = '', categories = [], statuses = [], sort = 'latest') => {
    try {
      setLoading(true);
      setInquiryError(false); // 에러 초기화
      const token = sessionStorage.getItem('token');
      // 페이지 사이즈 4개로 조정
      const keywordParam = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
      const categoryParam = categories.length > 0 ? `&categories=${categories.join(',')}` : '';
      const statusParam = statuses.length > 0 ? `&statuses=${statuses.join(',')}` : '';
      const sortParam = `&sort=${sort}`;
      const response = await axios.get(
        `/api/admin/inquiries?page=${page}&size=4${keywordParam}${categoryParam}${statusParam}${sortParam}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setInquiries(response.data.content);
      setCurrentPage(response.data.number);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
    } catch (error) {
      console.error('문의 목록 조회 실패:', error);
      setInquiryError(true); // 에러 발생 설정
      if (error.response?.status === 403) {
        alert('관리자 권한이 필요합니다.');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // 회원 목록 가져오기
  const fetchMembers = async (page = 0, keyword = '', roles = [], sort = 'latest') => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      // 회원 목록 10개씩 페이지네이션
      const keywordParam = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
      const roleParam = roles.length > 0 ? `&roles=${roles.join(',')}` : '';
      const sortParam = `&sort=${sort}`;
      const response = await axios.get(
        `/api/admin/members?page=${page}&size=10${keywordParam}${roleParam}${sortParam}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setMembers(response.data.content);
      setMemberCurrentPage(response.data.number);
      setMemberTotalPages(response.data.totalPages);
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
      console.log('Inquiry detail response:', response.data);
      setSelectedInquiry(response.data);
      setAnswerContent('');
    } catch (error) {
      console.error('문의 상세 조회 실패:', error);
      alert('문의를 불러오는데 실패했습니다.');
    }
  };

  // 답변 등록
  const handleSubmitAnswer = async () => {
    console.log('handleSubmitAnswer called');
    console.log('Answer content:', answerContent);
    console.log('Selected inquiry:', selectedInquiry);

    if (!answerContent.trim()) {
      alert('답변 내용을 입력해주세요!');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      console.log('Submitting answer to inquiry:', selectedInquiry.id);

      await axios.post(
        `/api/admin/inquiries/${selectedInquiry.id}/answer`,
        { content: answerContent },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert('답변이 등록되었습니다! 🌟');
      setAnswerContent('');
      setSelectedInquiry(null);
      fetchInquiries(currentPage); // 현재 페이지 갱신
    } catch (error) {
      console.error('답변 등록 실패:', error);
      console.error('Error response:', error.response?.data);
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
    fetchInquiries(newPage, searchKeyword, selectedCategories, selectedStatuses, selectedSort);
    setSelectedInquiry(null);
  };

  // 검색 처리
  const handleSearch = () => {
    setCurrentPage(0);
    fetchInquiries(0, searchKeyword, selectedCategories, selectedStatuses, selectedSort);
    setSelectedInquiry(null);
  };

  // Enter 키로 검색
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 필터 토글
  const toggleFilter = () => {
    console.log('Filter toggle clicked, current state:', isFilterOpen);
    setIsFilterOpen(!isFilterOpen);
    if (!isFilterOpen) {
      setIsSortOpen(false); // 필터 열 때 정렬 닫기
    }
  };

  // 카테고리 필터 변경
  const handleCategoryFilter = (category) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(newCategories);
    setCurrentPage(0);
    fetchInquiries(0, searchKeyword, newCategories, selectedStatuses, selectedSort);
  };

  // 상태 필터 변경
  const handleStatusFilter = (status) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    setSelectedStatuses(newStatuses);
    setCurrentPage(0);
    fetchInquiries(0, searchKeyword, selectedCategories, newStatuses, selectedSort);
  };

  // 정렬 토글
  const toggleSort = () => {
    setIsSortOpen(!isSortOpen);
    if (!isSortOpen) {
      setIsFilterOpen(false); // 정렬 열 때 필터 닫기
    }
  };

  // 정렬 변경
  const handleSortChange = (sort) => {
    setSelectedSort(sort);
    setIsSortOpen(false);
    setCurrentPage(0);
    fetchInquiries(0, searchKeyword, selectedCategories, selectedStatuses, sort);
  };

  // 회원 검색 처리
  const handleMemberSearch = () => {
    setMemberCurrentPage(0);
    fetchMembers(0, memberSearchKeyword, selectedRoles, selectedMemberSort);
  };

  // 회원 검색 Enter 키
  const handleMemberSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleMemberSearch();
    }
  };

  // 회원 페이지 변경
  const handleMemberPageChange = (newPage) => {
    setMemberCurrentPage(newPage);
    fetchMembers(newPage, memberSearchKeyword, selectedRoles, selectedMemberSort);
  };

  // 회원 필터 토글
  const toggleMemberFilter = () => {
    setIsMemberFilterOpen(!isMemberFilterOpen);
    if (!isMemberFilterOpen) {
      setIsMemberSortOpen(false); // 필터 열 때 정렬 닫기
    }
  };

  // 역할 필터 변경
  const handleRoleFilter = (role) => {
    const newRoles = selectedRoles.includes(role) ? selectedRoles.filter((r) => r !== role) : [...selectedRoles, role];
    setSelectedRoles(newRoles);
    setMemberCurrentPage(0);
    fetchMembers(0, memberSearchKeyword, newRoles, selectedMemberSort);
  };

  // 회원 정렬 토글
  const toggleMemberSort = () => {
    setIsMemberSortOpen(!isMemberSortOpen);
    if (!isMemberSortOpen) {
      setIsMemberFilterOpen(false); // 정렬 열 때 필터 닫기
    }
  };

  // 회원 정렬 변경
  const handleMemberSortChange = (sort) => {
    setSelectedMemberSort(sort);
    setIsMemberSortOpen(false);
    setMemberCurrentPage(0);
    fetchMembers(0, memberSearchKeyword, selectedRoles, sort);
  };

  // CSV 다운로드
  const handleExportCSV = () => {
    if (inquiries.length === 0) {
      alert('다운로드할 문의 내역이 없습니다.');
      return;
    }

    // CSV 헤더
    const headers = ['문의번호', '제목', '작성자', '작성일', '카테고리', '상태'];

    // 데이터를 CSV 형식으로 변환
    const csvRows = [
      headers.join(','),
      ...inquiries.map((inquiry) =>
        [
          inquiry.id,
          `"${inquiry.title.replace(/"/g, '""')}"`, // 쉼표/따옴표 이스케이프
          inquiry.memberNickname,
          new Date(inquiry.createdAt).toLocaleDateString('ko-KR'),
          inquiry.category,
          inquiry.status === 'ANSWERED' ? '답변완료' : '답변대기',
        ].join(','),
      ),
    ];

    // CSV 문자열 생성
    const csvContent = csvRows.join('\n');

    // BOM 추가 (한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // 다운로드 트리거
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `문의목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 회원 목록 CSV 다운로드
  const handleExportMembersCSV = () => {
    if (members.length === 0) {
      alert('다운로드할 회원 내역이 없습니다.');
      return;
    }

    // CSV 헤더
    const headers = ['회원ID', '닉네임', '이메일', '권한', '가입일'];

    // 데이터를 CSV 형식으로 변환
    const csvRows = [
      headers.join(','),
      ...members.map((member) =>
        [
          member.id,
          `"${member.nickname.replace(/"/g, '""')}"`,
          member.email,
          member.role === 'ADMIN' ? '관리자' : '일반회원',
          new Date(member.createdAt).toLocaleDateString('ko-KR'),
        ].join(','),
      ),
    ];

    // CSV 문자열 생성
    const csvContent = csvRows.join('\n');

    // BOM 추가 (한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // 다운로드 트리거
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `회원목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AspectLayout>
      <div className="relative w-full h-full bg-cover bg-center flex flex-col overflow-hidden font-gosanja bg-[url('/images/admin/bg-admin.jpg')]">
        {/* 상단 헤더 영역 */}
        <div className="flex items-end justify-between px-[2.6cqw] pt-[1.85cqh] pb-[0.93cqh]">
          <div className="flex items-center gap-[0.52cqw]">
            <img src="/images/admin/icon-leaf.webp" alt="logo" className="w-[3.13cqw]" />
            <h1 className="text-[2.71cqw] font-black text-[#594E36]">너굴관리소</h1>

            {/* 메뉴 버튼 (타이틀 우측으로 이동) */}
            <div className="flex gap-[0.52cqw] ml-[1.56cqw]">
              <button
                onClick={() => setActiveTab('inquiry')}
                className={`px-[2.08cqw] py-[0.93cqh] rounded-full text-[1.25cqw] font-bold transition-all shadow-md ${
                  activeTab === 'inquiry'
                    ? 'text-white hover:brightness-105'
                    : 'bg-white text-[#594E36] hover:bg-[#F9F3F9]'
                }`}
                style={{ backgroundColor: activeTab === 'inquiry' ? COLORS.admin.nookMint : undefined }}
              >
                문의관리
              </button>
              <button
                onClick={() => setActiveTab('member')}
                className={`px-[2.08cqw] py-[0.93cqh] rounded-full text-[1.25cqw] font-bold transition-all shadow-md ${
                  activeTab === 'member'
                    ? 'text-white hover:brightness-105'
                    : 'bg-white text-[#594E36] hover:bg-[#F9F3F9]'
                }`}
                style={{ backgroundColor: activeTab === 'member' ? COLORS.admin.nookCyan : undefined }}
              >
                회원관리
              </button>
            </div>
          </div>
          <div className="flex flex-col items-end">
            {/* 상단 우측 홈/설정 버튼은 global layout이나 별도 컴포넌트로 처리될 수 있으나 
                 시안에 있으므로 여기서는 TopButtons 컴포넌트나 직접 구현. 
                 일단 시안상 우측 상단에 홈 아이콘 등이 보임.
                 여기서는 기존 레이아웃 유지하며 공간 확보.
             */}
            <div className="flex gap-[0.52cqw]">
              <button
                onClick={() => navigate('/home')}
                className="w-[3.13cqw] h-[3.13cqw] bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition"
              >
                <img src="/images/icon-home.svg" alt="home" className="w-[60%] opacity-70" />
              </button>
              <button
                onClick={() => navigate('/config')}
                className="w-[3.13cqw] h-[3.13cqw] bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition"
              >
                <Cog6ToothIcon className="w-[1.88cqw] h-[1.88cqw] text-[#594E36]" style={{ opacity: 0.7 }} />
              </button>
            </div>
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="px-[3.65cqw] mb-[0.93cqh]">
          <p className="text-[0.94cqw] font-bold text-[#594E36] opacity-80">
            팀너굴 고생많다구리... 중요 논의사항은 대장 너굴에게 연락하라구리 : buildmyhome-admin@gmail.com
          </p>
        </div>

        {/* 탭 컨텐츠 영역 */}
        <div className="flex-1 px-[2.6cqw] pb-[2.6cqw] overflow-hidden flex gap-[1.56cqw]">
          {/* 문의 관리탭 */}
          {activeTab === 'inquiry' && (
            <>
              {/* 왼쪽: 문의 목록 (List) - 통합 컨테이너 */}
              <div className="w-[32cqw] h-full bg-[#FDFBF6] rounded-[2.08cqw] p-[1.56cqw] shadow-lg flex flex-col relative">
                {/* 1. 검색바 (Search Bar) - 상단 */}
                <div className="w-full h-[5.2cqh] bg-white rounded-[1.25cqw] flex items-center gap-[0.52cqw] px-[1.04cqw] shadow-sm mb-[0.93cqh]">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder="문의 제목 검색..."
                    className="flex-1 text-[1.04cqw] text-[#594E36] font-bold outline-none bg-transparent placeholder:text-[#594E36] placeholder:opacity-30"
                  />
                  <img
                    src="/images/admin/icon-search.svg"
                    alt="search"
                    onClick={handleSearch}
                    className="w-[1.46cqw] h-[1.46cqw] opacity-50 cursor-pointer hover:opacity-80"
                  />
                </div>

                {/* 2. 컨트롤 로우 (Control Row) - 검색바 하단 */}
                <div className="flex flex-col px-[0.52cqw] mt-[2cqh] gap-[0.5cqh]">
                  {/* 상단: 아이콘 Row (좌: 리스트 / 우: 정렬, 엑셀) */}
                  <div className="flex justify-between items-end">
                    {/* 왼쪽: 리스트 아이콘 + 정렬 드롭다운 */}
                    <div className="relative">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSort();
                        }}
                        className="w-[2.08cqw] h-[2.08cqw] bg-[#594E36] opacity-80 cursor-pointer hover:opacity-100"
                        style={{
                          maskImage: 'url("/images/admin/icon-list.svg")',
                          WebkitMaskImage: 'url("/images/admin/icon-list.svg")',
                          maskSize: 'contain',
                          WebkitMaskSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskRepeat: 'no-repeat',
                        }}
                      />

                      {/* 정렬 드롭다운 */}
                      {isSortOpen && (
                        <div className="absolute top-[2.5cqw] left-0 w-[12cqw] bg-white rounded-[1.04cqw] shadow-xl border-[0.1cqw] border-[#594E36]/20 p-[0.83cqw] z-50">
                          {[
                            { value: 'latest', label: '최신순' },
                            { value: 'oldest', label: '오래된순' },
                          ].map((option) => (
                            <div
                              key={option.value}
                              onClick={() => handleSortChange(option.value)}
                              className={`p-[0.52cqw] rounded-[0.52cqw] cursor-pointer text-[0.73cqw] font-medium ${
                                selectedSort === option.value
                                  ? 'bg-[#594E36] text-white'
                                  : 'text-[#594E36] hover:bg-[#F9F3F9]'
                              }`}
                            >
                              {option.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 오른쪽: 필터, 엑셀 아이콘 */}
                    <div className="flex items-end gap-[0.83cqw]">
                      {/* Sort Icon + Filter Dropdown */}
                      <div className="relative">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFilter();
                          }}
                          className="w-[2.08cqw] h-[2.08cqw] bg-[#594E36] cursor-pointer hover:opacity-80"
                          style={{
                            maskImage: 'url("/images/admin/icon-sort.svg")',
                            WebkitMaskImage: 'url("/images/admin/icon-sort.svg")',
                            maskSize: 'contain',
                            WebkitMaskSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskRepeat: 'no-repeat',
                          }}
                        />

                        {/* 필터 드롭다운 */}
                        {isFilterOpen && (
                          <div className="absolute top-[2.5cqw] right-0 w-[15cqw] bg-white rounded-[1.04cqw] shadow-xl border-[0.1cqw] border-[#594E36]/20 p-[1.04cqw] z-50">
                            {/* 카테고리 필터 */}
                            <div className="mb-[1cqh]">
                              <h4 className="text-[0.83cqw] font-bold text-[#594E36] mb-[0.5cqh]">카테고리</h4>
                              <div className="flex flex-col gap-[0.3cqh]">
                                {[
                                  { value: 'USER_REPORT', label: '유저신고' },
                                  { value: 'BUG_REPORT', label: '버그신고' },
                                  { value: 'ETC', label: '기타' },
                                ].map((category) => (
                                  <label
                                    key={category.value}
                                    className="flex items-center gap-[0.42cqw] cursor-pointer hover:bg-[#F9F3F9] p-[0.31cqw] rounded-[0.52cqw]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedCategories.includes(category.value)}
                                      onChange={() => handleCategoryFilter(category.value)}
                                      className="w-[0.83cqw] h-[0.83cqw] cursor-pointer"
                                    />
                                    <span className="text-[0.73cqw] font-medium text-[#594E36]">{category.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* 상태 필터 */}
                            <div>
                              <h4 className="text-[0.83cqw] font-bold text-[#594E36] mb-[0.5cqh]">상태</h4>
                              <div className="flex flex-col gap-[0.3cqh]">
                                {[
                                  { value: 'OPEN', label: '답변대기' },
                                  { value: 'ANSWERED', label: '답변완료' },
                                ].map((status) => (
                                  <label
                                    key={status.value}
                                    className="flex items-center gap-[0.42cqw] cursor-pointer hover:bg-[#F9F3F9] p-[0.31cqw] rounded-[0.52cqw]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedStatuses.includes(status.value)}
                                      onChange={() => handleStatusFilter(status.value)}
                                      className="w-[0.83cqw] h-[0.83cqw] cursor-pointer"
                                    />
                                    <span className="text-[0.73cqw] font-medium text-[#594E36]">{status.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Excel Icon (Color matched) */}
                      <div
                        onClick={handleExportCSV}
                        className="w-[2.08cqw] h-[2.08cqw] bg-[#594E36] cursor-pointer hover:opacity-80"
                        style={{
                          maskImage: 'url("/images/admin/icon-excel.svg")',
                          WebkitMaskImage: 'url("/images/admin/icon-excel.svg")',
                          maskSize: 'contain',
                          WebkitMaskSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskRepeat: 'no-repeat',
                        }}
                      />
                    </div>
                  </div>

                  {/* 하단: 전체 개수 */}
                  <div className="flex items-center mt-[3.2cqh] gap-[0.26cqw]">
                    <span className="text-[1.25cqw] font-bold text-[#594E36]">전체 {totalElements}개</span>
                  </div>
                </div>

                {/* 3. 목록 리스트 영역 (List Area) */}
                <div className="flex-1 overflow-y-auto mt-[2cqh] pr-[0.5cqw] -mr-[0.5cqw]">
                  <div className="flex flex-col gap-[0.73cqh]">
                    {loading ? (
                      <div className="text-center py-[2cqh] text-[#594E36]">로딩중...</div>
                    ) : inquiryError ? (
                      <div className="flex flex-col items-center justify-center h-full text-[#EB5757] py-[5cqh] gap-[1cqh]">
                        <span className="text-[1.04cqw] font-bold">문의 목록을 불러오는데 실패했습니다.</span>
                        <span className="text-[0.83cqw] opacity-80">관리자에게 문의해주세요. (Server 500)</span>
                      </div>
                    ) : inquiries.length > 0 ? (
                      inquiries.map((inquiry) => (
                        <div
                          key={inquiry.id}
                          onClick={() => handleSelectInquiry(inquiry.id)}
                          className={`relative w-full rounded-[1.25cqw] p-[0.83cqw] cursor-pointer transition-all hover:brightness-95 ${selectedInquiry?.id === inquiry.id ? 'bg-white border-[0.1cqw] border-[#EB5757]' : 'bg-white/50'}`}
                        >
                          <div className="flex justify-between items-start mb-[0.21cqh]">
                            <span className="text-[0.83cqw] font-bold text-[#594E36]">[문의번호] {inquiry.id}</span>
                            <span className="text-[0.83cqw] text-[#594E36] opacity-60">
                              {new Date(inquiry.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-[1.04cqw] font-black text-[#594E36] mb-[0.42cqh] truncate leading-tight">
                            {inquiry.title}
                          </h3>
                          <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                              <span className="text-[0.83cqw] font-bold text-[#594E36] opacity-80 mb-[0.2cqh]">
                                {inquiry.memberNickname}
                              </span>
                            </div>
                            <div className="flex gap-[0.31cqw]">
                              <CategoryBadge category={inquiry.category} />
                              <span
                                className={`px-[0.63cqw] py-[0.1cqw] rounded-full font-bold text-[0.63cqw] bg-[#594E36] text-white`}
                              >
                                {inquiry.status === 'ANSWERED' ? '답변완료' : '답변대기'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-[#594E36] opacity-50 py-[5cqh]">
                        <span className="text-[1.04cqw] font-bold">등록된 문의가 없습니다.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. 페이지네이션 (Pagination) - 하단 */}
                {!loading && totalPages > 0 && (
                  <div className="flex justify-center gap-[0.42cqw] mt-[1.39cqh] pt-[0.93cqh] mb-[1.5cqh]">
                    <button
                      onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="w-[2.08cqw] h-[2.08cqw] rounded-[0.63cqw] bg-[#EEE9DB] flex items-center justify-center text-[#594E36] font-bold text-[1.25cqw] disabled:opacity-50 hover:bg-[#E5E0D0] transition-colors"
                    >
                      &lt;
                    </button>
                    <div className="w-[2.08cqw] h-[2.08cqw] rounded-[0.63cqw] bg-[#594E36] flex items-center justify-center text-white font-bold text-[1.25cqw] shadow-md">
                      {currentPage + 1}
                    </div>
                    <button
                      onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage === totalPages - 1}
                      className="w-[2.08cqw] h-[2.08cqw] rounded-[0.63cqw] bg-[#EEE9DB] flex items-center justify-center text-[#594E36] font-bold text-[1.25cqw] disabled:opacity-50 hover:bg-[#E5E0D0] transition-colors"
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </div>

              {/* 오른쪽: 상세 및 답변 (Detail) */}
              <div
                className="w-[59.8cqw] h-full rounded-[2.08cqw] p-[1.85cqh] flex flex-col shadow-lg relative"
                style={{ backgroundColor: COLORS.admin.creamWhite }}
              >
                {selectedInquiry ? (
                  <>
                    <div className="mt-[0.93cqh] mb-[1.85cqh]">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[1.04cqw] font-bold text-[#594E36] block mb-[0.46cqh]">
                            [문의번호] {selectedInquiry.id}
                          </span>
                          <h1 className="text-[1.46cqw] font-black text-[#594E36] leading-tight mb-[0.46cqh]">
                            {selectedInquiry.title}
                          </h1>
                          <div className="flex gap-[1.04cqw] text-[1.04cqw] font-bold text-[#594E36] opacity-80">
                            <span>작성자: {selectedInquiry.memberNickname}</span>
                            <div className="w-[0.1cqw] h-[1.25cqh] bg-[#594E36] opacity-30 my-auto" />
                            <span>작성일: {new Date(selectedInquiry.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-[0.42cqw]">
                          <span className="bg-[#EB5757] text-white px-[0.83cqw] py-[0.28cqh] rounded-full font-bold text-[0.83cqw]">
                            유저신고
                          </span>
                          <span className="bg-[#594E36] text-white px-[0.83cqw] py-[0.28cqh] rounded-full font-bold text-[0.83cqw]">
                            {selectedInquiry.status === 'ANSWERED' ? '답변완료' : '답변대기'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 본문 */}
                    <div className="flex-1 bg-white rounded-[0.83cqw] p-[1.25cqw] mb-[1.39cqh] overflow-y-auto shadow-inner border-[0.1cqw] border-[#594E36]/10">
                      <div className="pl-[0.52cqw]">
                        <p className="text-[1.04cqw] text-[#594E36] leading-relaxed whitespace-pre-wrap">
                          {selectedInquiry.content}
                        </p>
                      </div>
                    </div>

                    {/* 답변 영역 */}
                    <div className="mb-[0.93cqh]">
                      <div className="flex items-center gap-[0.52cqw] mb-[0.93cqh]">
                        <div className="flex-1 h-[0.1cqw] bg-[#594E36] border-t-[0.1cqw] border-dashed border-[#594E36]" />
                        <span className="text-[1.25cqw] font-black text-[#594E36]">답변 작성</span>
                        <div className="flex-1 h-[0.1cqw] bg-[#594E36] border-t-[0.1cqw] border-dashed border-[#594E36]" />
                      </div>

                      {selectedInquiry.answer ? (
                        <>
                          <div className="flex items-center gap-[0.52cqw] mb-[0.93cqh]">
                            <span className="bg-[#34C4D3] text-white px-[0.63cqw] py-[0.1cqw] rounded-full text-[0.63cqw] font-bold">
                              감사인사
                            </span>
                            <span className="text-[1.04cqw] font-bold text-[#594E36]">감사합니다!</span>
                          </div>
                          <div className="bg-[#F9F3F9] rounded-[0.83cqw] p-[1.25cqw]">
                            <p className="text-[0.83cqw] text-[#594E36] whitespace-pre-wrap">
                              {selectedInquiry.answer.content}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-[1.39cqh]">
                          <textarea
                            value={answerContent}
                            onChange={(e) => setAnswerContent(e.target.value)}
                            placeholder="답변 내용을 입력해주세요."
                            className="w-full h-[15cqh] bg-white rounded-[0.83cqw] p-[1.25cqw] text-[0.83cqw] font-bold text-[#594E36] outline-none shadow-sm resize-none focus:ring-[0.16cqw] focus:ring-[#594E36]/30"
                          />
                          <button
                            onClick={handleSubmitAnswer}
                            className="bg-[#594E36] text-white px-[2.08cqw] py-[0.83cqh] rounded-[1.46cqw] text-[1.25cqw] font-black hover:scale-105 active:scale-95 transition-transform shadow-lg cursor-pointer"
                          >
                            등록하기
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#594E36] opacity-50">
                    <p className="text-[1.67cqw] font-black">좌측 목록에서 문의를 선택해주세요</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 회원 관리 탭 */}

          {activeTab === 'member' && (
            <div className="flex flex-col items-center w-full h-full">
              {/* 메인 카드 */}
              <div className="w-[91.25cqw] h-[73.33cqh] bg-[#FDFBF6] rounded-[2.08cqw] shadow-lg flex flex-col items-center p-[2.08cqw] relative">
                {/* 검색바 (Search Bar) */}
                {/* 검색 영역 (리스트 아이콘 - 검색바 - 정렬/엑셀 아이콘) */}
                <div className="flex items-center justify-between mb-[2cqh] w-full">
                  {/* 왼쪽: 리스트 아이콘 + 정렬 드롭다운 */}
                  <div className="relative">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMemberSort();
                      }}
                      className="w-[3.13cqw] h-[3.13cqw] bg-[#594E36] cursor-pointer hover:opacity-80"
                      style={{
                        maskImage: 'url("/images/admin/icon-list.svg")',
                        WebkitMaskImage: 'url("/images/admin/icon-list.svg")',
                        maskSize: 'contain',
                        WebkitMaskSize: 'contain',
                      }}
                    />

                    {/* 정렬 드롭다운 */}
                    {isMemberSortOpen && (
                      <div className="absolute top-[3.5cqw] left-0 w-[12cqw] bg-white rounded-[1.04cqw] shadow-xl border-[0.1cqw] border-[#594E36]/20 p-[0.83cqw] z-50">
                        {[
                          { value: 'latest', label: '최신 가입순' },
                          { value: 'oldest', label: '오래된 가입순' },
                          { value: 'level', label: '레벨 높은순' },
                          { value: 'bell', label: '벨 많은순' },
                        ].map((option) => (
                          <div
                            key={option.value}
                            onClick={() => handleMemberSortChange(option.value)}
                            className={`p-[0.52cqw] rounded-[0.52cqw] cursor-pointer text-[0.73cqw] font-medium ${
                              selectedMemberSort === option.value
                                ? 'bg-[#594E36] text-white'
                                : 'text-[#594E36] hover:bg-[#F9F3F9]'
                            }`}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 중앙: 검색바 (Search Bar) - 내부엔 Search Icon만 존재 */}
                  <div className="w-[71.04cqw] h-[6.3cqh] bg-white rounded-[1.25cqw] flex items-center gap-[0.52cqw] px-[1.56cqw] shadow-sm">
                    <input
                      type="text"
                      value={memberSearchKeyword}
                      onChange={(e) => setMemberSearchKeyword(e.target.value)}
                      onKeyPress={handleMemberSearchKeyPress}
                      placeholder="회원 닉네임 검색..."
                      className="flex-1 text-[1.25cqw] text-[#594E36] font-bold outline-none bg-transparent placeholder:text-[#594E36] placeholder:opacity-30"
                    />
                    <img
                      src="/images/admin/icon-search.svg"
                      alt="search"
                      onClick={handleMemberSearch}
                      className="w-[1.67cqw] h-[1.67cqw] opacity-50 cursor-pointer hover:opacity-80"
                    />
                  </div>

                  {/* 오른쪽: 필터, Excel Icon */}
                  <div className="flex items-center gap-[0.83cqw]">
                    {/* Sort Icon + Filter Dropdown */}
                    <div className="relative">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMemberFilter();
                        }}
                        className="w-[3.13cqw] h-[3.13cqw] bg-[#594E36] cursor-pointer hover:opacity-80"
                        style={{
                          maskImage: 'url("/images/admin/icon-sort.svg")',
                          WebkitMaskImage: 'url("/images/admin/icon-sort.svg")',
                          maskSize: 'contain',
                          WebkitMaskSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskRepeat: 'no-repeat',
                        }}
                      />

                      {/* 필터 드롭다운 */}
                      {isMemberFilterOpen && (
                        <div className="absolute top-[3.5cqw] right-0 w-[12cqw] bg-white rounded-[1.04cqw] shadow-xl border-[0.1cqw] border-[#594E36]/20 p-[1.04cqw] z-50">
                          <h4 className="text-[0.83cqw] font-bold text-[#594E36] mb-[0.5cqh]">역할</h4>
                          <div className="flex flex-col gap-[0.3cqh]">
                            {[
                              { value: 'MEMBER', label: '일반 회원' },
                              { value: 'ADMIN', label: '관리자' },
                            ].map((role) => (
                              <label
                                key={role.value}
                                className="flex items-center gap-[0.42cqw] cursor-pointer hover:bg-[#F9F3F9] p-[0.31cqw] rounded-[0.52cqw]"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedRoles.includes(role.value)}
                                  onChange={() => handleRoleFilter(role.value)}
                                  className="w-[0.83cqw] h-[0.83cqw] cursor-pointer"
                                />
                                <span className="text-[0.73cqw] font-medium text-[#594E36]">{role.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Excel Icon (Color matched) */}
                    <div
                      className="w-[3.13cqw] h-[3.13cqw] bg-[#594E36] cursor-pointer hover:opacity-80"
                      onClick={handleExportMembersCSV}
                      style={{
                        maskImage: 'url("/images/admin/icon-excel.svg")',
                        WebkitMaskImage: 'url("/images/admin/icon-excel.svg")',
                        maskSize: 'contain',
                        WebkitMaskSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat',
                      }}
                    />
                  </div>
                </div>

                {/* 테이블 영역 */}
                <div className="w-full flex-1 overflow-auto bg-white rounded-[1.04cqw] shadow-inner border-[0.1cqw] border-[#594E36]/10 mb-[1.5cqh]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F9F0A3] sticky top-0 z-10">
                      <tr>
                        <th className="p-[1.04cqw] text-[0.83cqw] font-black text-[#594E36]">닉네임</th>
                        <th className="p-[1.04cqw] text-[0.83cqw] font-black text-[#594E36]">이메일</th>
                        <th className="p-[1.04cqw] text-[0.83cqw] font-black text-[#594E36] text-center">레벨</th>
                        <th className="p-[1.04cqw] text-[0.83cqw] font-black text-[#594E36] text-center">보유 벨</th>
                        <th className="p-[1.04cqw] text-[0.83cqw] font-black text-[#594E36] text-center">역할</th>
                        <th className="p-[1.04cqw] text-[0.83cqw] font-black text-[#594E36] text-center">가입일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member, index) => (
                        <tr
                          key={member.id}
                          className={`border-b border-[#594E36]/10 hover:bg-[#FFFEE0] ${index % 2 === 0 ? 'bg-white' : 'bg-[#F9F3F9]/30'}`}
                        >
                          <td className="p-[1.04cqw] text-[0.83cqw] font-bold text-[#594E36]">{member.nickname}</td>
                          <td className="p-[1.04cqw] text-[0.83cqw] font-medium text-[#594E36] opacity-80">
                            {member.email}
                          </td>
                          <td className="p-[1.04cqw] text-[0.83cqw] font-bold text-[#594E36] text-center">
                            Lv.{member.level}
                          </td>
                          <td className="p-[1.04cqw] text-[0.83cqw] font-bold text-[#594E36] text-center">
                            {member.bell.toLocaleString()}
                          </td>
                          <td className="p-[1.04cqw] text-center">
                            <span
                              className={`px-[0.63cqw] py-[0.1cqw] rounded-full text-[0.63cqw] font-bold ${member.role === 'ADMIN' ? 'bg-[#EB5757] text-white' : 'bg-[#78D7B2] text-white'}`}
                            >
                              {member.role}
                            </span>
                          </td>
                          <td className="p-[1.04cqw] text-[0.83cqw] font-medium text-[#594E36] text-center opacity-60">
                            {new Date(member.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 페이지네이션 */}
                <div className="flex justify-center gap-[0.42cqw] mb-[1.5cqh]">
                  <button
                    onClick={() => handleMemberPageChange(memberCurrentPage - 1)}
                    disabled={memberCurrentPage === 0}
                    className="w-[2.08cqw] h-[2.08cqw] rounded-[0.63cqw] bg-[#EEE9DB] flex items-center justify-center text-[#594E36] font-bold text-[1.25cqw] hover:bg-[#E5E0D0] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: memberTotalPages }, (_, i) => i).map((page) => (
                    <button
                      key={page}
                      onClick={() => handleMemberPageChange(page)}
                      className={`w-[2.08cqw] h-[2.08cqw] rounded-[0.63cqw] flex items-center justify-center font-bold text-[1.25cqw] ${
                        memberCurrentPage === page
                          ? 'bg-[#594E36] text-white shadow-md'
                          : 'bg-[#EEE9DB] text-[#594E36] hover:bg-[#E5E0D0] cursor-pointer'
                      }`}
                    >
                      {page + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => handleMemberPageChange(memberCurrentPage + 1)}
                    disabled={memberCurrentPage >= memberTotalPages - 1}
                    className="w-[2.08cqw] h-[2.08cqw] rounded-[0.63cqw] bg-[#EEE9DB] flex items-center justify-center text-[#594E36] font-bold text-[1.25cqw] hover:bg-[#E5E0D0] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AspectLayout>
  );
}
