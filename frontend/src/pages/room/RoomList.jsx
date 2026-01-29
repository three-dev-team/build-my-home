// frontend/src/pages/room/RoomList.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import TopButtons from '../../components/common/TopButtons';
import { BellIcon, Cog6ToothIcon, LockClosedIcon, LockOpenIcon, UserIcon, HomeIcon } from '@heroicons/react/24/solid';

import { CHARACTERS } from '../../constants/characters.js';
import { COLORS } from '../../constants/colors.js';

const API_BASE = ''; // Vite proxy 쓰면 "" 유지

const WS_APP_PREFIX = '/app/roomlist/rooms';
const WS_TOPIC_ROOMS = '/topic/roomlist/rooms';

const CHARACTER_BY_ID = new Map(CHARACTERS.map((c) => [Number(c.id), c]));

// 보라색 테마 (Lavender Theme) - 색상 조정
const THEME = {
  textPurple: { color: COLORS.roomList.textMain },
  textDark: { color: COLORS.roomList.textSub },
  bgMain: { backgroundColor: COLORS.roomList.bgMainTransparent },
  bgItem: 'bg-white',
  // Tailwind 클래스 조립은 복잡하므로 스타일 객체나 인라인 스타일로 변환
};

export default function RoomList() {
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState(''); // 검색어 상태

  const [searchOpen, setSearchOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const stompRef = useRef(null);
  const pendingCreateIdRef = useRef(null);
  const transitionTimerRef = useRef(null);

  const [roomPlayersMap, setRoomPlayersMap] = useState({});
  const roomPlayersMapRef = useRef({});

  useEffect(() => {
    roomPlayersMapRef.current = roomPlayersMap;
  }, [roomPlayersMap]);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  const startTransition = () => {
    setTransitioning(true);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setTransitioning(false);
      pendingCreateIdRef.current = null;
    }, 6000);
  };

  const endTransition = () => {
    setTransitioning(false);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = null;
  };

  const normalizeRoom = (r) => ({
    id: r.roomId ?? r.id,
    title: r.title ?? '',
    currentPlayers: r.currentPlayers ?? 0,
    maxPlayers: r.maxPlayers ?? 0,
    totalRounds: r.totalRounds ?? 0,
    status: r.status ?? 'WAITING',
    joinable: r.joinable ?? true,
    hostNickname: r.hostNickname ?? '',
    createdAt: r.createdAt ?? null,
    isPrivate: r.isPrivate ?? false,
  });

  const authHeaders = () => {
    const token = sessionStorage.getItem('token');
    return token
      ? {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      : { 'Content-Type': 'application/json' };
  };

  const refreshRooms = async (searchKeyword) => {
    const finalKeyword = typeof searchKeyword === 'string' ? searchKeyword : keyword;

    setLoading(true);
    try {
      const query = finalKeyword ? `?keyword=${encodeURIComponent(finalKeyword)}` : '';
      const res = await fetch(`${API_BASE}/api/roomlists/rooms${query}`, {
        method: 'GET',
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error(`섬 목록 조회 실패 (${res.status})`);

      const data = await res.json();
      const normalized = Array.isArray(data) ? data.map(normalizeRoom) : [];
      setRooms(normalized);
    } catch (e) {
      showToast(e?.message || '섬 목록을 불러오지 못했어.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshRooms('');
  }, []);

  useEffect(() => {
    if (!rooms || rooms.length === 0) return;
    const currentMap = roomPlayersMapRef.current;
    const ids = rooms.map((r) => r?.id).filter(Boolean);
    const missing = ids.filter((id) => currentMap[id] === undefined);
    if (missing.length === 0) return;

    const ac = new AbortController();

    const fetchRoomPlayers = async (roomId) => {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/players`, {
        method: 'GET',
        headers: authHeaders(),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`players fetch fail ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    };

    (async () => {
      const results = await Promise.allSettled(missing.map(async (id) => [id, await fetchRoomPlayers(id)]));
      if (ac.signal.aborted) return;

      setRoomPlayersMap((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.status === 'fulfilled') {
            const [id, players] = r.value;
            next[id] = players;
          }
        }
        return next;
      });
    })();

    return () => ac.abort();
  }, [rooms]);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const brokerURL = `${wsProto}://${window.location.host}/ws`;

    const client = new Client({
      brokerURL,
      reconnectDelay: 3000,
      debug: () => {},
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    client.onConnect = () => {
      client.subscribe(WS_TOPIC_ROOMS, (message) => {
        try {
          const payload = JSON.parse(message.body);
          if (payload?.type === 'ROOMS_SNAPSHOT') {
            const list = Array.isArray(payload.rooms) ? payload.rooms : [];
            setRooms(list.map(normalizeRoom));
            return;
          }
          if (payload?.type === 'ROOM_CREATED') {
            const reqId = pendingCreateIdRef.current;
            if (reqId && payload?.clientRequestId === reqId && payload?.roomId) {
              pendingCreateIdRef.current = null;
              endTransition();
              setCreateOpen(false);
              navigate(`/rooms/${payload.roomId}/select`);
            }
            return;
          }
          if (payload?.type === 'ERROR') {
            endTransition();
            pendingCreateIdRef.current = null;
            showToast(payload?.message || '요청 처리 중 오류가 발생했어.');
            return;
          }
        } catch {
          // ignore
        }
      });
    };

    client.onStompError = () => {
      endTransition();
      showToast('WS 연결 오류가 발생했어.');
    };

    client.activate();
    stompRef.current = client;

    return () => {
      try {
        client.deactivate();
      } catch {
        // ignore
      }
      stompRef.current = null;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [navigate]);

  const publish = (destination, bodyObj) => {
    const client = stompRef.current;
    if (!client || !client.connected) {
      showToast('서버 연결 중이야. 잠깐만!');
      return false;
    }
    client.publish({
      destination,
      body: JSON.stringify(bodyObj ?? {}),
    });
    return true;
  };

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const aj = a.joinable ? 0 : 1;
      const bj = b.joinable ? 0 : 1;
      if (aj !== bj) return aj - bj;
      const af = a.currentPlayers >= a.maxPlayers ? 1 : 0;
      const bf = b.currentPlayers >= b.maxPlayers ? 1 : 0;
      if (af !== bf) return af - bf;
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return bt - at;
    });
  }, [rooms]);

  const openJoinModal = (room) => {
    const isFull = room.currentPlayers >= room.maxPlayers;
    if (isFull || !room.joinable) return;
    setSelectedRoom(room);
    setJoinOpen(true);
  };

  const confirmJoin = async (password) => {
    if (!selectedRoom) return;
    const isFull = selectedRoom.currentPlayers >= selectedRoom.maxPlayers;
    if (isFull || !selectedRoom.joinable) {
      showToast('입장할 수 없는 섬이야.');
      setJoinOpen(false);
      return;
    }

    startTransition();

    if (selectedRoom.isPrivate) {
      try {
        const res = await fetch(`${API_BASE}/api/roomlists/rooms/${selectedRoom.id}/verify`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ password }),
        });

        if (!res.ok) {
          endTransition();
          showToast('비밀번호가 일치하지 않아.');
          return;
        }
      } catch (e) {
        endTransition();
        showToast('비밀번호 확인 중 오류가 발생했어.');
        return;
      }
    }

    const ok = publish(`${WS_APP_PREFIX}/join`, { roomId: selectedRoom.id, password });
    if (!ok) {
      endTransition();
      return;
    }

    setJoinOpen(false);
    navigate(`/rooms/${selectedRoom.id}/select`);
  };

  // 상단 우측 아이콘 박스 스타일
  const iconBtnStyle =
    'w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer border-[3px] border-white';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[url('/images/bg-roomlist.jpg')] bg-cover bg-center font-gosanja">
      {/* 1. 상단 아이콘 영역 */}
      <div className="absolute top-[40px] left-[40px] z-50">
        <button onClick={() => navigate('/home')} className={`${iconBtnStyle}`}>
          <HomeIcon className="w-10 h-10" style={{ color: COLORS.roomList.textMain }} />
        </button>
      </div>

      <div className="absolute top-[40px] right-[40px] z-50">
        <TopButtons
          nickname={sessionStorage.getItem('nickname') || '주민'}
          onProfileClick={() => navigate('/mypage')}
          onBellClick={() => {}} // 기존 로직 없음
          onConfigClick={() => {}} // 기존 로직 없음
          colors={{
            text: COLORS.roomList.textMain,
            badgeBg: COLORS.roomList.btnMain,
            badgeText: 'white',
          }}
        />
      </div>

      {/* 2. 헤더 영역 (메인 보드 바깥쪽 위, 고정) */}
      {/* 위치: top-[15%] -> top-[7%]로 상향 (상단 아이콘과 같은 라인) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[7%] z-40 text-center w-full max-w-[1200px]">
        {/* 제목 */}
        <h1 className="text-[60px] font-black drop-shadow-sm leading-tight" style={{ color: COLORS.roomList.textMain }}>
          발견한 <span style={{ color: COLORS.roomList.textHighlight }}>섬</span> 리스트
        </h1>

        {/* 총 개수, 스크롤 텍스트 (제목 아래에 배치, 메인 보드와는 떨어져 있음) */}
        <div className="flex items-end justify-between w-full mt-[56px] px-4">
          <div className="text-[24px] font-bold" style={{ color: COLORS.roomList.textMain }}>
            총 <span className="text-[28px]">{sortedRooms.length}</span>개
          </div>
          <div className="text-[24px] font-bold" style={{ color: COLORS.roomList.textMain }}>
            스크롤해서 더보기 <span className="text-[20px]">↓</span>
          </div>
        </div>
      </div>

      {/* 3. 메인 보드 (1280x800) - 리스트만 포함 */}
      {/* 위치: top-[62%] 유지 */}
      <div
        className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1280px] h-[800px] rounded-[60px] shadow-2xl flex flex-col items-center overflow-hidden pt-8"
        style={THEME.bgMain}
      >
        {/* 리스트 스크롤 영역, 상단 패딩 없이 바로 시작 */}
        <div className="flex-1 w-full overflow-y-auto pl-0 pr-1 scrollbar-custom mb-[120px] flex flex-col">
          <div className="flex flex-col gap-0 pb-10 items-center w-full flex-1">
            {sortedRooms.map((room, idx) => {
              const isFull = room.currentPlayers >= room.maxPlayers;
              const disabled = isFull || !room.joinable;
              const btnText = room.status === 'PLAYING' ? '마감' : isFull ? '마감' : '입장';
              const playersPreview = roomPlayersMap[room.id] || [];

              const opacityClass = disabled ? 'opacity-80' : '';

              return (
                <div key={room.id} className="relative w-full flex flex-col items-center">
                  {/* 리스트 아이템: 1200x92 */}
                  <div
                    className={`w-[1200px] h-[92px] bg-white rounded-[40px] flex items-center px-8 shadow-sm ${opacityClass} relative z-10 my-3`}
                  >
                    {/* 1. 좌측 영역: 잠금 + 제목 */}
                    <div className="flex items-center gap-6 mr-auto max-w-[400px]">
                      {/* 잠금 아이콘 */}
                      <div className="flex-shrink-0">
                        {room.isPrivate ? (
                          <LockClosedIcon className="w-9 h-9 opacity-60" style={{ color: COLORS.roomList.lock }} />
                        ) : (
                          <LockOpenIcon className="w-9 h-9 opacity-30" style={{ color: COLORS.roomList.lock }} />
                        )}
                      </div>
                      {/* 방 제목 */}
                      <span className="text-[32px] font-bold truncate" style={{ color: COLORS.roomList.textSub }}>
                        {room.title || '이름 없는 섬'}
                      </span>
                    </div>

                    {/* 2. 중앙 영역: 정보 그룹 (절대 위치 중앙 정렬 -> 약간 좌측 이동) */}
                    <div className="absolute top-1/2 left-[42%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-6">
                      {/* 주사위 (판수) - CSS Mask로 색상 적용 */}
                      <div className="flex items-center justify-center">
                        <div
                          className="w-[70px] h-[70px]"
                          style={{
                            backgroundColor: '#8B5E83',
                            maskImage: `url("/images/icon-dice-${room.totalRounds}.png")`,
                            WebkitMaskImage: `url("/images/icon-dice-${room.totalRounds}.png")`,
                            maskSize: 'contain',
                            WebkitMaskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            WebkitMaskRepeat: 'no-repeat',
                            maskPosition: 'center',
                            WebkitMaskPosition: 'center',
                          }}
                        />
                      </div>

                      {/* 우측 컬럼: 방장, 인원수 */}
                      <div className="flex flex-col gap-1 items-start justify-center">
                        {/* 위: 방장 */}
                        {/* 위: 방장 (나뭇잎 아이콘) */}
                        <div
                          className="flex items-center gap-2 text-[20px] font-bold leading-none"
                          style={{ color: '#8B5E83' }}
                        >
                          <div
                            className="w-[24px] h-[24px]"
                            style={{
                              backgroundColor: '#8B5E83',
                              maskImage: `url("/images/roomlist/icon-leaf.webp")`,
                              WebkitMaskImage: `url("/images/roomlist/icon-leaf.webp")`,
                              maskSize: 'contain',
                              WebkitMaskSize: 'contain',
                              maskRepeat: 'no-repeat',
                              WebkitMaskRepeat: 'no-repeat',
                              maskPosition: 'center',
                              WebkitMaskPosition: 'center',
                            }}
                          />
                          <span className="translate-y-[1px]">{room.hostNickname}</span>
                        </div>
                        {/* 아래: 인원수 (사람 아이콘) */}
                        <div
                          className="flex items-center gap-2 text-[20px] font-bold leading-none"
                          style={{ color: '#8B5E83' }}
                        >
                          <div
                            className="w-[24px] h-[24px]"
                            style={{
                              backgroundColor: '#8B5E83',
                              maskImage: `url("/images/roomlist/icon-people.svg")`,
                              WebkitMaskImage: `url("/images/roomlist/icon-people.svg")`,
                              maskSize: 'contain',
                              WebkitMaskSize: 'contain',
                              maskRepeat: 'no-repeat',
                              WebkitMaskRepeat: 'no-repeat',
                              maskPosition: 'center',
                              WebkitMaskPosition: 'center',
                            }}
                          />
                          <span className="translate-y-[1px]">
                            {room.currentPlayers}/{room.maxPlayers}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. 우측 영역: 캐릭터 + 버튼 */}
                    <div className="flex items-center ml-auto gap-8">
                      {/* 캐릭터 이미지 프리뷰 */}
                      <RoomCharacterImages players={playersPreview} maxSlots={Math.min(room.maxPlayers, 4)} />

                      {/* 입장 버튼 */}
                      <button
                        onClick={() => openJoinModal(room)}
                        disabled={disabled}
                        className={`w-[120px] h-[64px] rounded-[32px] font-black text-[32px] flex items-center justify-center transition-all active:scale-95 leading-none pb-1 text-white shadow-md hover:brightness-105 ${disabled ? 'cursor-not-allowed' : ''}`}
                        style={{
                          backgroundColor: disabled ? '#E0E0E0' : COLORS.roomList.btnMain,
                          color: disabled ? '#A0A0A0' : '#FFFFFF',
                        }}
                      >
                        {btnText}
                      </button>
                    </div>
                  </div>

                  {/* 커스텀 점선 (넓은 간격) - 모든 아이템 하단에 표시 */}
                  <div
                    className="w-[1160px] h-[3px] my-1"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${COLORS.roomList.btnDisabled} 50%, transparent 50%)`,
                      backgroundSize: '20px 100%', // 점선 길이와 간격 조절 (20px 패턴)
                    }}
                  />
                </div>
              );
            })}

            {sortedRooms.length === 0 && (
              <div className="flex-1 w-full flex flex-col items-center justify-center">
                <div className="text-[32px] font-bold mb-2 opacity-60" style={{ color: COLORS.roomList.textMain }}>
                  아직 만들어진 섬이 없어요!
                </div>
                <div className="text-[20px] font-bold opacity-40" style={{ color: COLORS.roomList.textMain }}>
                  새로운 섬을 만들어보세요 🏝️
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. 하단 액션 바 (메인 보드 내부 하단 고정) */}
        {/* 디자인 변경: Flex -> Absolute Positioning으로 변경하여 정확한 위치 잡기 */}
        <div className="absolute bottom-0 w-full h-[120px] z-20 pointer-events-none">
          {/* pointer-events-none을 줘서 배치만 하고, 내부 버튼에 pointer-events-auto 부여 */}

          {/* 1. 검색 버튼 (좌측 하단) */}
          {/* 위치: left-[100px], bottom-[44px] */}
          {/* 스타일: 흰색 배경 제거, 아이콘만 크게 (h-56px ? -> 가이드라인은 h-56px 아이콘 영역 포함인듯, 실제 아이콘은 w-14 h-14) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="absolute left-[100px] bottom-[44px] pointer-events-auto flex flex-col items-center gap-1 group transition-transform hover:scale-110 active:scale-95"
          >
            {/* 돋보기 아이콘 (CSS Mask로 색상 적용) */}
            <div
              className={`w-[56px] h-[56px] drop-shadow-md`}
              style={{
                backgroundColor: keyword ? COLORS.roomList.textMain : COLORS.roomList.btnMain,
                maskImage: `url("/images/roomlist/icon-search.svg")`,
                WebkitMaskImage: `url("/images/roomlist/icon-search.svg")`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />

            {/* 검색어 뱃지 */}
            {keyword && (
              <span
                className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-white px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap"
                style={{ backgroundColor: COLORS.roomList.textMain }}
              >
                {keyword}
              </span>
            )}
          </button>

          {/* 2. 섬 만들기 버튼 (중앙 하단) */}
          {/* 위치: bottom-[32px] */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[32px] pointer-events-auto">
            <button
              onClick={() => setCreateOpen(true)}
              className="w-[300px] h-[80px] rounded-[40px] flex items-center justify-center shadow-xl hover:brightness-105 active:scale-95 transition-all"
              style={{ backgroundColor: COLORS.roomList.btnMain }}
            >
              <span className="text-[32px] font-black text-white pb-1">섬 만들기</span>
            </button>
          </div>

          {/* 3. 새로고침 버튼 (우측 하단) */}
          {/* 위치: right-[100px], bottom-[44px] */}
          <button
            onClick={() => {
              setKeyword('');
              refreshRooms('');
            }}
            disabled={loading}
            className="absolute right-[100px] bottom-[44px] pointer-events-auto flex flex-col items-center gap-1 group transition-transform hover:scale-110 active:scale-95"
          >
            {/* 새로고침 아이콘 (CSS Mask로 색상 적용) */}
            <div
              className={`w-[56px] h-[56px] drop-shadow-md ${loading ? 'animate-spin' : ''}`}
              style={{
                backgroundColor: COLORS.roomList.btnMain,
                maskImage: `url("/images/roomlist/icon-refresh.svg")`,
                WebkitMaskImage: `url("/images/roomlist/icon-refresh.svg")`,
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
      </div>

      {/* --- 모달들 --- */}
      {transitioning && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-[40px] flex flex-col items-center shadow-2xl animate-bounce">
            <span className="text-[40px]">✈️</span>
            <span className="text-[24px] font-bold text-[#5A4A6F] mt-4">섬으로 이동 중...</span>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] bg-white/90 backdrop-blur px-8 py-4 rounded-full shadow-xl border-2 animate-in fade-in slide-in-from-top-4"
          style={{ borderColor: COLORS.roomList.btnMain }}
        >
          <span className="text-[20px] font-bold" style={{ color: COLORS.roomList.textMain }}>
            📢 {toast}
          </span>
        </div>
      )}

      {createOpen && (
        <CreateIslandModal
          onClose={() => setCreateOpen(false)}
          onCreate={(payload) => {
            const reqId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            pendingCreateIdRef.current = reqId;
            startTransition();
            const ok = publish(`${WS_APP_PREFIX}/create`, { ...payload, clientRequestId: reqId });
            if (!ok) {
              pendingCreateIdRef.current = null;
              endTransition();
            } else {
              setCreateOpen(false);
            }
          }}
        />
      )}

      {joinOpen && selectedRoom && (
        <JoinIslandModal
          room={selectedRoom}
          initialPlayers={roomPlayersMap[selectedRoom.id] || []}
          onClose={() => setJoinOpen(false)}
          onConfirm={confirmJoin}
          authHeaders={authHeaders}
        />
      )}

      {searchOpen && (
        <SearchModal
          initialKeyword={keyword}
          onClose={() => setSearchOpen(false)}
          onSearch={(newKeyword) => {
            setKeyword(newKeyword);
            setSearchOpen(false);
            refreshRooms(newKeyword);
          }}
        />
      )}
    </div>
  );
}

// --- 하위 컴포넌트들 ---

// 캐릭터 이미지 프리뷰 컴포넌트
function RoomCharacterImages({ players, maxSlots }) {
  const list = Array.isArray(players) ? players : [];
  const filled = list.slice(0, maxSlots);

  return (
    <div className="flex gap-2 w-[264px]">
      {Array.from({ length: maxSlots }).map((_, idx) => {
        const p = filled[idx];
        const charInfo = p?.characterId ? CHARACTER_BY_ID.get(Number(p.characterId)) : null;
        // roomListImage가 있으면 사용, 아니면 selectBasicImage 또는 기본값 사용
        const imgSrc = charInfo ? charInfo.roomListImage || charInfo.selectBasicImage : null;

        return (
          <div
            key={idx}
            className={`w-[60px] h-[60px] rounded-full overflow-hidden flex items-center justify-center z-${maxSlots - idx}`}
            // 사용자 피드백: "선택된 캐릭터 배경색 다름 (보라색 계열)"
            // 캐릭터가 있으면 연한 핑크/보라 계열(#F8BBD0?? #E1BEE7??). 이미지의 배경과 어울리는 톤으로 수정.
            // 스크린샷 0번 참고: 곰돌이 배경이 연한 주황/핑크 계열 살색에 가까움.
            // 그러나 스크린샷 1번(디자인) 참고: 곰돌이 배경이 쨍한 Cyan/Pink 그라데이션이거나, 혹은 그냥 보라색 배경일 수 있음.
            // 요청하신 "보라색 계열인듯 보임"을 반영하여 연한 보라(#EAD8F9) 적용.
            style={{ backgroundColor: imgSrc ? '#EAD8F9' : '#D9D9D9' }}
          >
            {imgSrc ? (
              <img src={imgSrc} alt={charInfo.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#D9D9D9]"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CreateIslandModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [totalRounds, setTotalRounds] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const canSubmit = title.trim().length > 0 && (!isPrivate || password.trim().length > 0);

  // 공통 라벨 스타일 컴포넌트
  // 공통 라벨 스타일 컴포넌트
  const LabelSection = ({ iconSrc, text }) => (
    <div className="w-[240px] flex items-center gap-3 flex-shrink-0">
      <div className="w-[40px] h-[40px] flex items-center justify-center">
        {iconSrc && (
          <div
            className="w-[36px] h-[36px]"
            style={{
              backgroundColor: COLORS.roomList.textSub,
              maskImage: `url("${iconSrc}")`,
              WebkitMaskImage: `url("${iconSrc}")`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          />
        )}
      </div>
      <span className="text-[32px] font-bold whitespace-nowrap" style={{ color: COLORS.roomList.textSub }}>
        {text}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md overflow-auto"
      onMouseDown={onClose}
    >
      <div
        className="w-[1132px] h-[985px] flex flex-col items-center shadow-none relative shrink-0"
        style={{
          backgroundImage: "url('/images/roomlist/ui-roomlist-modal-1.webp')",
          backgroundSize: '100% 100%',
          backgroundColor: 'transparent',
          paddingTop: '130px',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 제목: 폰트 56px */}
        <h2 className="text-[56px] font-black mb-[50px]" style={{ color: COLORS.roomList.textSub }}>
          섬 만들기
        </h2>

        {/* 폼 영역: 간격 30px */}
        <div className="w-full flex flex-col gap-[30px] px-[200px]">
          {/* 1. 섬 이름 (Leaf Icon) */}
          <div className="flex items-center">
            <LabelSection iconSrc="/images/roomlist/icon-leaf.webp" text="섬 이름" />
            <div className="relative flex-1">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="섬 이름 입력"
                className="w-full h-[64px] px-6 rounded-[20px] bg-white text-[28px] font-bold outline-none placeholder:text-gray-300 shadow-inner"
                style={{ color: COLORS.roomList.textSub }}
                maxLength={18}
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[18px] font-bold opacity-50"
                style={{ color: COLORS.roomList.textMain }}
              >
                {title.length}/18
              </span>
            </div>
          </div>

          {/* 2. 인원 수 (People Icon) */}
          <div className="flex items-center">
            {/* icon-people.svg는 보통 단색 아이콘일 가능성이 높으므로 mask로 처리하여 테마 색상 적용하면 좋지만,
                사용자가 이미지를 줬으므로 그대로 img 태그 사용 시도. 
                만약 색상이 안맞으면 추후 수정. svg라면 fill="currentColor"가 아닐 수 있음.
             */}
            <LabelSection iconSrc="/images/roomlist/icon-people.svg" text="인원수" />
            <div className="flex gap-4 flex-1">
              {[2, 3, 4].map((num) => {
                const isActive = maxPlayers === num;
                return (
                  <button
                    key={num}
                    onClick={() => setMaxPlayers(num)}
                    className="flex-1 h-[60px] rounded-[30px] text-[28px] font-bold transition-all shadow-sm flex items-center justify-center border-2"
                    style={{
                      backgroundColor: isActive ? COLORS.roomList.textSub : 'white',
                      color: isActive ? 'white' : COLORS.roomList.btnDisabled,
                      borderColor: isActive ? COLORS.roomList.textSub : 'transparent',
                    }}
                  >
                    {num}명
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 라운드 수 (Dice Icon) */}
          <div className="flex items-center">
            {/* 대표 아이콘으로 10판짜리 주사위 사용 */}
            <LabelSection iconSrc="/images/roomlist/icon-dice-10.png" text="라운드 수" />
            <div className="flex gap-3 flex-1">
              {[10, 20, 30, 40].map((num) => {
                const isActive = totalRounds === num;
                return (
                  <button
                    key={num}
                    onClick={() => setTotalRounds(num)}
                    className="flex-1 h-[60px] rounded-[30px] text-[28px] font-bold transition-all shadow-sm flex items-center justify-center border-2"
                    style={{
                      backgroundColor: isActive ? COLORS.roomList.textSub : 'white',
                      color: isActive ? 'white' : COLORS.roomList.btnDisabled,
                      borderColor: isActive ? COLORS.roomList.textSub : 'transparent',
                    }}
                  >
                    {num}판
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 공개 설정 (Lock Icon) */}
          <div className="flex items-center">
            <LabelSection iconSrc="/images/roomlist/icon-lock.svg" text="공개 설정" />
            <div className="flex gap-8 items-center flex-1">
              {/* 공개 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-[36px] h-[36px] rounded-full border-[3px] flex items-center justify-center ${
                    !isPrivate ? 'bg-[#5A4A6F]' : 'bg-white'
                  }`}
                  style={{ borderColor: COLORS.roomList.textSub }}
                >
                  {!isPrivate && <div className="w-3 h-3 rounded-full bg-white" />}
                </div>
                <input type="checkbox" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="hidden" />
                <span
                  className="text-[32px] font-bold"
                  style={{ color: !isPrivate ? COLORS.roomList.textSub : COLORS.roomList.btnDisabled }}
                >
                  공개
                </span>
              </label>

              {/* 비공개 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-[36px] h-[36px] rounded-full border-[3px] flex items-center justify-center ${
                    isPrivate ? 'bg-[#5A4A6F]' : 'bg-white'
                  }`}
                  style={{ borderColor: COLORS.roomList.textSub }}
                >
                  {isPrivate && <div className="w-3 h-3 rounded-full bg-white" />}
                </div>
                <input type="checkbox" checked={isPrivate} onChange={() => setIsPrivate(true)} className="hidden" />
                <span
                  className="text-[32px] font-bold"
                  style={{ color: isPrivate ? COLORS.roomList.textSub : COLORS.roomList.btnDisabled }}
                >
                  비공개
                </span>
              </label>
            </div>
          </div>

          {/* 5. 비밀번호 입력 */}
          <div className="flex items-center">
            <div className="w-[240px] flex-shrink-0 mr-3" />
            <div className="relative flex-1">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                disabled={!isPrivate}
                className={`w-full h-[64px] px-8 rounded-[20px] bg-white text-[28px] font-bold outline-none placeholder:text-gray-300 shadow-inner transition-opacity ${
                  !isPrivate ? 'opacity-50' : ''
                }`}
                style={{ color: COLORS.roomList.textSub }}
              />
              <div
                className="absolute right-6 top-1/2 -translate-y-1/2 w-7 h-7"
                style={{
                  backgroundColor: COLORS.roomList.btnDisabled,
                  maskImage: `url("/images/roomlist/icon-lock.svg")`,
                  WebkitMaskImage: `url("/images/roomlist/icon-lock.svg")`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                }}
              />
            </div>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="absolute bottom-[130px] w-full flex justify-center gap-[30px]">
          {/* 뒤로가기 - arrow-back 아이콘 추가 (흰색 마스킹) */}
          <button
            onClick={onClose}
            className="w-[280px] h-[90px] rounded-[45px] text-[36px] font-black text-white hover:brightness-105 shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            style={{ backgroundColor: COLORS.roomList.textSub }}
          >
            <div
              className="w-[32px] h-[32px]"
              style={{
                backgroundColor: 'white',
                maskImage: `url("/images/roomlist/icon-arrow-back.svg")`,
                WebkitMaskImage: `url("/images/roomlist/icon-arrow-back.svg")`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />
            뒤로가기
          </button>

          <button
            onClick={() => onCreate({ title, maxPlayers, totalRounds, password: isPrivate ? password : null })}
            disabled={!canSubmit}
            className={`w-[280px] h-[90px] rounded-[45px] text-[36px] font-black text-white hover:brightness-105 shadow-lg active:scale-95 transition-transform flex items-center justify-center ${
              !canSubmit ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ backgroundColor: COLORS.roomList.textSub }}
          >
            섬만들기
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinIslandModal({ room, initialPlayers, onClose, onConfirm }) {
  const [password, setPassword] = useState('');

  // 방장 정보 (Host info)
  const hostPlayer = initialPlayers.find((p) => p.nickname === room.hostNickname);
  const hostCharInfo = hostPlayer?.characterId ? CHARACTER_BY_ID.get(Number(hostPlayer.characterId)) : null;
  const hostImgSrc = hostCharInfo
    ? hostCharInfo.roomListImage || hostCharInfo.selectBasicImage
    : '/images/icon-member.svg';

  // 라벨 헬퍼 (Label Helper)
  const DetailRow = ({ iconSrc, label, children }) => (
    <div className="flex items-center w-full mb-[40px]">
      <div className="w-[220px] flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 flex items-center justify-center">
          {iconSrc && (
            <div
              className="w-9 h-9"
              style={{
                backgroundColor: COLORS.roomList.textSub,
                maskImage: `url("${iconSrc}")`,
                WebkitMaskImage: `url("${iconSrc}")`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />
          )}
        </div>
        <span className="text-[36px] font-bold whitespace-nowrap" style={{ color: COLORS.roomList.textSub }}>
          {label}
        </span>
      </div>
      <div className="flex-1 flex items-center pl-[20px]">{children}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md"
      onMouseDown={onClose}
    >
      <div
        className="w-[1132px] h-[985px] flex flex-col items-center shadow-none relative shrink-0"
        style={{
          backgroundImage: "url('/images/roomlist/ui-roomlist-modal-2.webp')",
          backgroundSize: '100% 100%',
          backgroundColor: 'transparent',
          paddingTop: '120px',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="text-center mb-[60px]">
          <h2 className="text-[56px] font-black leading-tight" style={{ color: COLORS.roomList.textSub }}>
            {room.title}
            <span className="opacity-80">에</span>
          </h2>
          <div
            className="text-[48px] font-black leading-tight opacity-80 mt-2"
            style={{ color: COLORS.roomList.textSub }}
          >
            입장하시겠습니까?
          </div>
        </div>

        {/* White Info Box (799 x 436) */}
        <div className="w-[799px] h-[436px] bg-white rounded-[60px] p-[60px] flex flex-col justify-center shadow-lg relative">
          {/* 1열: 방장 (Row 1: Host) - 사용자가 leaf 이미지 요청 */}
          <DetailRow iconSrc="/images/roomlist/icon-leaf.webp" label="방장">
            <div className="flex items-center gap-4">
              <div className="w-[80px] h-[80px] rounded-full border-[3px] border-[#F3E5F5] overflow-hidden bg-gray-100 flex items-center justify-center">
                <img src={hostImgSrc} alt="host" className="w-full h-full object-cover" />
              </div>
              <span className="text-[40px] font-bold truncate max-w-[300px]" style={{ color: COLORS.roomList.textSub }}>
                {room.hostNickname}
              </span>
            </div>
          </DetailRow>

          {/* 2열: 라운드 (Row 2: Rounds) - 사용자가 dice 이미지 요청 */}
          <DetailRow iconSrc="/images/roomlist/icon-dice-10.png" label="라운드 수">
            <span className="text-[40px] font-bold" style={{ color: COLORS.roomList.textSub }}>
              {room.totalRounds} 라운드
            </span>
          </DetailRow>

          {/* 3열: 플레이어 (Row 3: Players) - 사용자가 people 이미지 요청 */}
          <DetailRow iconSrc="/images/roomlist/icon-people.svg" label="참여 주민">
            {/* 아바타 */}
            <div className="flex gap-2">
              {Array.from({ length: room.maxPlayers }).map((_, idx) => {
                const p = initialPlayers[idx];
                const charInfo = p?.characterId ? CHARACTER_BY_ID.get(Number(p.characterId)) : null;
                const imgSrc = charInfo ? charInfo.roomListImage || charInfo.selectBasicImage : null;
                return (
                  <div
                    key={idx}
                    className="w-[60px] h-[60px] rounded-full bg-[#D9D9D9] border-[3px] border-white overflow-hidden shadow-sm"
                  >
                    {imgSrc && <img src={imgSrc} alt="player" className="w-full h-full object-cover" />}
                  </div>
                );
              })}
            </div>
          </DetailRow>
        </div>

        {/* 비공개 방 비밀번호 입력 (동적) */}
        {room.isPrivate && (
          <div className="mt-[40px] w-full flex justify-center">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-[600px] h-[72px] px-8 rounded-[20px] bg-white text-[32px] font-bold outline-none placeholder:text-gray-300 shadow-inner"
                style={{ color: COLORS.roomList.textSub }}
              />
              <div
                className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8"
                style={{
                  backgroundColor: COLORS.roomList.btnDisabled,
                  maskImage: `url("/images/roomlist/icon-lock.svg")`,
                  WebkitMaskImage: `url("/images/roomlist/icon-lock.svg")`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                }}
              />
            </div>
          </div>
        )}

        {/* 버튼들 (Buttons) */}
        <div className="w-full flex justify-center gap-[40px] mt-[80px]">
          <button
            onClick={onClose}
            className="w-[300px] h-[100px] rounded-[50px] text-[40px] font-black text-white hover:brightness-105 shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: COLORS.roomList.textSub }}
          >
            뒤로가기
          </button>
          <button
            onClick={() => onConfirm(password)}
            className="w-[300px] h-[100px] rounded-[50px] text-[40px] font-black text-white hover:brightness-105 shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: COLORS.roomList.textSub }}
          >
            입장하기
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchModal({ initialKeyword, onClose, onSearch }) {
  const [val, setVal] = useState(initialKeyword);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-[500px] bg-white rounded-[50px] p-8 flex flex-col items-center shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-[32px] font-black text-[#5A4A6F] mb-6">섬 검색</h2>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch(val)}
          placeholder="찾고 싶은 섬 이름을 입력하세요"
          className="w-full h-[60px] px-6 rounded-[30px] bg-[#F3E5F5] text-[20px] font-bold text-[#5A4A6F] outline-none border-2 border-transparent focus:border-[#9B7AD6]"
        />
        <div className="w-full flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 h-[60px] bg-[#E0E0E0] rounded-[30px] text-[20px] font-bold text-[#757575] hover:bg-[#D0D0D0]"
          >
            취소
          </button>
          <button
            onClick={() => onSearch(val)}
            className="flex-1 h-[60px] bg-[#9B7AD6] rounded-[30px] text-[20px] font-bold text-white hover:bg-[#8A6AC6]"
          >
            검색
          </button>
        </div>
      </div>
    </div>
  );
}
