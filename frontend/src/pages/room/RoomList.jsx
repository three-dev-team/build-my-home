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
    <div className="relative w-full h-screen overflow-hidden bg-[url('/images/bg-roomlist.jpg')] bg-cover bg-center font-gosanja flex items-center justify-center">
      {/* 1. 상단 아이콘 및 프로필 영역 */}
      <div className="absolute top-[40px] left-[40px] z-50">
        <button onClick={() => navigate('/home')} className={iconBtnStyle}>
          <HomeIcon className="w-10 h-10" style={{ color: COLORS.roomList.textMain }} />
        </button>
      </div>

      <div className="absolute top-[40px] right-[40px] z-50">
        <TopButtons
          nickname={sessionStorage.getItem('nickname') || '주민'}
          onProfileClick={() => navigate('/mypage')}
          colors={{ text: COLORS.roomList.textMain, badgeBg: COLORS.roomList.btnMain, badgeText: 'white' }}
        />
      </div>

      <div className="relative w-[1280px] flex flex-col items-center overflow-visible mt-[40px]">
        {/* [상단 섹션] 헤더 (Title & Meta) */}
        <div className="w-full flex flex-col items-center shrink-0 relative z-10">
          <h1 className="text-[60px] font-black leading-none mb-[56px]" style={{ color: COLORS.roomList.textMain }}>
            발견한 <span style={{ color: COLORS.roomList.textHighlight }}>섬</span> 리스트
          </h1>

          <div className="flex justify-between w-full px-[40px] items-end mb-[16px]">
            <div
              className="flex items-baseline gap-2 text-[24px] font-bold"
              style={{ color: COLORS.roomList.textMain }}
            >
              총 <span className="text-[28px]">{rooms.length}</span>개
            </div>
            <div className="text-[24px] font-bold" style={{ color: COLORS.roomList.textMain }}>
              스크롤해서 더보기 ↓
            </div>
          </div>
        </div>

        {/* [하단 컨테이너] 리스트 + 푸터 (배경색 적용) - h-[800px] */}
        <div
          className="w-full h-[800px] flex flex-col items-center rounded-[60px] relative overflow-hidden"
          style={{ backgroundColor: COLORS.roomList.bgMainTransparent }}
        >
          {/* [중앙 섹션] 리스트 스크롤 영역 - flex-1 */}
          <div
            className={`w-full flex-1 overflow-y-auto px-[40px] scrollbar-hide ${
              rooms.length === 0 && !loading ? 'flex flex-col items-center justify-center' : ''
            }`}
          >
            {rooms.length === 0 && !loading ? (
              <div className="flex flex-col items-center opacity-60 pb-[40px]">
                <span className="text-[32px] font-bold text-[#594E36]">아직 만들어진 섬이 없어!</span>
                <span className="text-[24px] text-[#594E36] mt-2">직접 새로운 섬을 만들어볼까? 🏝️</span>
              </div>
            ) : (
              <div className="flex flex-col items-center pb-[20px] pt-[40px]">
                {sortedRooms.map((room) => {
                  const isFull = room.currentPlayers >= room.maxPlayers;
                  const disabled = isFull || !room.joinable;
                  const btnText = room.status === 'PLAYING' ? '마감' : isFull ? '마감' : '입장';
                  const playersPreview = roomPlayersMap[room.id] || [];

                  return (
                    <div key={room.id} className="w-full flex flex-col items-center">
                      {/* 리스트 아이템 (1200x92, radius-40px) */}
                      <div className="w-[1200px] h-[92px] bg-white rounded-[40px] flex items-center px-[40px] shadow-sm relative my-[12px] shrink-0 hover:scale-[1.01] transition-transform">
                        {/* [좌측 영역] 잠금(40x40) + 제목(32px) */}
                        <div className="flex items-center gap-[20px] w-[400px]">
                          {room.isPrivate ? (
                            <div
                              className="w-[40px] h-[40px]"
                              style={{
                                backgroundColor: COLORS.roomList.lock,
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
                          ) : (
                            <div className="w-[40px] h-[40px]" />
                          )}
                          <span
                            className="text-[32px] font-bold truncate max-w-[320px] pt-1"
                            style={{ color: COLORS.roomList.textSub }}
                          >
                            {room.title}
                          </span>
                        </div>

                        {/* [중앙 영역] 주사위 + 정보 그룹 */}
                        <div className="absolute left-[50%] -translate-x-1/2 flex items-center gap-[52px]">
                          {/* 주사위 (h-48px) */}
                          <div
                            className="w-[48px] h-[48px]"
                            style={{
                              backgroundColor: '#8B5E83',
                              maskImage: `url("/images/icon-dice-${room.totalRounds}.png")`,
                              WebkitMaskImage: `url("/images/icon-dice-${room.totalRounds}.png")`,
                              maskSize: 'contain',
                              maskRepeat: 'no-repeat',
                            }}
                          />
                          {/* 방장/인원 정보 (24px) */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[24px] font-bold" style={{ color: '#8B5E83' }}>
                              <div
                                className="w-[24px] h-[24px] bg-[#8B5E83]"
                                style={{
                                  maskImage: `url("/images/roomlist/icon-leaf.webp")`,
                                  WebkitMaskImage: `url("/images/roomlist/icon-leaf.webp")`,
                                  maskSize: 'contain',
                                }}
                              />
                              <span className="truncate max-w-[120px]">{room.hostNickname}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[24px] font-bold" style={{ color: '#8B5E83' }}>
                              <div
                                className="w-[24px] h-[24px] bg-[#8B5E83]"
                                style={{
                                  maskImage: `url("/images/roomlist/icon-people.svg")`,
                                  WebkitMaskImage: `url("/images/roomlist/icon-people.svg")`,
                                  maskSize: 'contain',
                                }}
                              />
                              <span>
                                {room.currentPlayers}/{room.maxPlayers}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* [우측 영역] 캐릭터 프리뷰 + 입장 버튼 */}
                        <div className="ml-auto flex items-center gap-[40px]">
                          {/* 캐릭터 프리뷰 (60x60 슬롯) */}
                          <RoomCharacterImages players={playersPreview} maxSlots={Math.min(room.maxPlayers, 4)} />

                          {/* 입장 버튼 (120x64, 32px) */}
                          <button
                            onClick={() => openJoinModal(room)}
                            disabled={disabled}
                            className={`w-[120px] h-[64px] rounded-[32px] font-black text-[32px] flex items-center justify-center transition-all active:scale-95 shadow-md ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:brightness-105'}`}
                            style={{
                              backgroundColor: disabled ? COLORS.roomList.btnDisabled : COLORS.roomList.btnMain,
                              color: 'white',
                            }}
                          >
                            {btnText}
                          </button>
                        </div>
                      </div>
                      {/* 점선 구분선 */}
                      {/* 점선 구분선 (SVG) */}
                      <div className="w-[1160px] h-[24px] opacity-30 flex items-center">
                        <svg width="100%" height="100%">
                          <line
                            x1="2"
                            y1="3"
                            x2="100%"
                            y2="3"
                            stroke={COLORS.roomList.textMain}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="12 12"
                          />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* [하단 섹션] 액션 바 (Footer) - h-[148px] */}
          {/* 같은 컨테이너 안에 있으므로 배경색 공유됨 */}
          <div className="w-full h-[148px] px-[80px] flex justify-between items-center shrink-0 pb-[10px]">
            {/* 검색 버튼 */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex flex-col items-center hover:scale-110 transition-transform p-4"
            >
              <div
                className="w-[56px] h-[56px] bg-[#8B5E83]"
                style={{
                  maskImage: `url("/images/roomlist/icon-search.svg")`,
                  WebkitMaskImage: `url("/images/roomlist/icon-search.svg")`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                }}
              />
            </button>

            {/* 섬 만들기 (중앙 버튼) */}
            <button
              onClick={() => setCreateOpen(true)}
              className="w-[300px] h-[80px] rounded-[40px] text-[32px] font-black text-white shadow-xl hover:brightness-105 active:scale-95 transition-all"
              style={{ backgroundColor: COLORS.roomList.btnMain }}
            >
              섬 만들기
            </button>

            {/* 새로고침 버튼 */}
            <button
              onClick={() => refreshRooms('')}
              className="flex flex-col items-center hover:rotate-180 transition-transform duration-500 p-4"
            >
              <div
                className="w-[56px] h-[56px] bg-[#8B5E83]"
                style={{
                  maskImage: `url("/images/roomlist/icon-refresh.svg")`,
                  WebkitMaskImage: `url("/images/roomlist/icon-refresh.svg")`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                }}
              />
            </button>
          </div>
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

// 캐릭터 이미지 프리뷰 (60x60 슬롯 유지)
function RoomCharacterImages({ players, maxSlots }) {
  return (
    <div className="flex gap-[8px]">
      {Array.from({ length: 4 }).map((_, idx) => {
        const p = players[idx];
        const charInfo = p?.characterId ? CHARACTER_BY_ID.get(Number(p.characterId)) : null;
        const imgSrc = charInfo?.roomListImage || charInfo?.selectBasicImage;

        return (
          <div
            key={idx}
            className={`w-[60px] h-[60px] rounded-full overflow-hidden flex items-center justify-center ${idx < maxSlots ? 'bg-[#EAD8F9]' : 'bg-[#D9D9D9] opacity-40'}`}
          >
            {imgSrc && <img src={imgSrc} alt="char" className="w-full h-full object-cover" />}
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

  // 라벨 스타일 컴포넌트 - gap 제거, 개별 적용을 위해 구조 분해
  const LabelIcon = ({ iconSrc }) => (
    <div className="w-[40px] h-[48px] flex items-center justify-center shrink-0">
      {iconSrc && (
        <div
          className="w-[40px] h-[48px]"
          style={{
            backgroundColor: COLORS.ac.darkPurple,
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
  );

  const LabelText = ({ text }) => (
    <span className="text-[36px] font-bold whitespace-nowrap leading-none pt-1" style={{ color: COLORS.ac.darkPurple }}>
      {text}
    </span>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md overflow-auto"
      onMouseDown={onClose}
    >
      <div
        className="w-[1132px] h-[985px] flex flex-col shadow-none relative shrink-0"
        style={{
          backgroundImage: "url('/images/roomlist/ui-roomlist-modal-1.webp')",
          backgroundSize: '100% 100%',
          backgroundColor: 'transparent',
          paddingTop: '104px',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 제목 */}
        <h2
          className="text-[56px] font-black mb-[60px] leading-none text-center w-full"
          style={{ color: COLORS.ac.darkPurple }}
        >
          섬 만들기
        </h2>

        {/* 1. 섬 이름 */}
        <div className="flex items-center pl-[124px]">
          <LabelIcon iconSrc="/images/roomlist/icon-leaf.webp" />
          <div className="w-[12px]" /> {/* Icon-Text Gap */}
          <LabelText text="섬 이름" />
          <div className="w-[92px]" /> {/* Text-Input Gap */}
          <div className="relative w-[600px]">
            {' '}
            {/* Fixed width based on image analysis */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="섬 이름 입력"
              className="w-full h-[72px] px-[24px] rounded-[20px] bg-white text-[32px] font-bold outline-none placeholder:text-gray-300 shadow-inner"
              style={{ color: COLORS.ac.darkPurple }}
              maxLength={18}
            />
            <span
              className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[18px] font-bold opacity-50"
              style={{ color: COLORS.ac.darkPurple }}
            >
              {title.length}/18
            </span>
          </div>
        </div>

        {/* 2. 인원 수 - Top Gap 40px */}
        <div className="flex items-center pl-[124px] mt-[40px]">
          <LabelIcon iconSrc="/images/roomlist/icon-people.svg" />
          <div className="w-[12px]" />
          <LabelText text="인원수" />
          <div className="w-[104px]" /> {/* Different Gap */}
          <div className="flex gap-[12px]">
            {[2, 3, 4].map((num) => {
              const isActive = maxPlayers === num;
              return (
                <button
                  key={num}
                  onClick={() => setMaxPlayers(num)}
                  className="w-[120px] h-[66px] rounded-[32px] text-[32px] font-bold transition-all shadow-sm flex items-center justify-center leading-none pt-1"
                  style={{
                    backgroundColor: isActive ? COLORS.ac.darkPurple : 'white', // Reverted to White
                    color: isActive ? 'white' : COLORS.ac.darkPurple, // Reverted to Dark Purple
                  }}
                >
                  {num}명
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 라운드 수 - Top Gap 40px */}
        <div className="flex items-center pl-[124px] mt-[40px]">
          <LabelIcon iconSrc="/images/roomlist/icon-dice-10.png" />
          <div className="w-[12px]" />
          <LabelText text="라운드 수" />
          <div className="w-[60px]" /> {/* Different Gap */}
          <div className="flex gap-[12px]">
            {[10, 20, 30, 40].map((num) => {
              const isActive = totalRounds === num;
              return (
                <button
                  key={num}
                  onClick={() => setTotalRounds(num)}
                  className="w-[120px] h-[66px] rounded-[32px] text-[32px] font-bold transition-all shadow-sm flex items-center justify-center leading-none pt-1"
                  style={{
                    backgroundColor: isActive ? COLORS.ac.darkPurple : 'white',
                    color: isActive ? 'white' : COLORS.ac.darkPurple,
                  }}
                >
                  {num}판
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 공개 설정 - Top Gap 40px */}
        <div className="flex items-center pl-[124px] mt-[40px] h-[72px]">
          <LabelIcon iconSrc="/images/roomlist/icon-lock.svg" />
          <div className="w-[12px]" />
          <LabelText text="공개 설정" />
          <div className="w-[68px]" /> {/* Different Gap */}
          <div className="flex items-center gap-[40px]">
            {/* 공개 버튼 */}
            <button onClick={() => setIsPrivate(false)} className="flex items-center gap-[12px] group">
              <div
                className={`w-[40px] h-[40px] rounded-full border-[3px] flex items-center justify-center transition-colors ${
                  !isPrivate ? 'bg-[#744990] border-[#744990]' : 'bg-white border-[#744990]'
                }`}
                style={{
                  backgroundColor: !isPrivate ? COLORS.ac.darkPurple : 'white',
                  borderColor: COLORS.ac.darkPurple,
                }}
              >
                {!isPrivate && <div className="w-[16px] h-[16px] bg-white rounded-full" />}
              </div>
              <span
                className={`text-[36px] font-bold pt-1 ${!isPrivate ? 'text-[#744990]' : 'text-[#744990]/50'}`}
                style={{
                  color: !isPrivate ? COLORS.ac.darkPurple : COLORS.ac.darkPurple,
                  opacity: !isPrivate ? 1 : 0.5,
                }}
              >
                공개
              </span>
            </button>

            {/* 비공개 버튼 */}
            <button onClick={() => setIsPrivate(true)} className="flex items-center gap-[12px] group">
              <div
                className={`w-[40px] h-[40px] rounded-full border-[3px] flex items-center justify-center transition-colors ${
                  isPrivate ? 'bg-[#744990] border-[#744990]' : 'bg-white border-[#744990]'
                }`}
                style={{
                  backgroundColor: isPrivate ? COLORS.ac.darkPurple : 'white',
                  borderColor: COLORS.ac.darkPurple,
                }}
              >
                {isPrivate && <div className="w-[16px] h-[16px] bg-white rounded-full" />}
              </div>
              <span
                className={`text-[36px] font-bold pt-1 ${isPrivate ? 'text-[#744990]' : 'text-[#744990]/50'}`}
                style={{ color: isPrivate ? COLORS.ac.darkPurple : COLORS.ac.darkPurple, opacity: isPrivate ? 1 : 0.5 }}
              >
                비공개
              </span>
            </button>
          </div>
        </div>

        {/* 비밀번호 입력 - Top Gap 32px, Left Margin 397px -> Aligned with Island Name */}
        {isPrivate && (
          <div className="flex items-center pl-[124px] mt-[32px] animate-in fade-in slide-in-from-top-2 duration-300 h-[72px]">
            {/* Align Spacer (Invisible) */}
            <div className="opacity-0 flex items-center shrink-0">
              <LabelIcon iconSrc="/images/roomlist/icon-leaf.webp" />
              <div className="w-[12px]" />
              <LabelText text="섬 이름" />
              <div className="w-[92px]" />
            </div>

            <div className="relative w-[600px]">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full h-[72px] px-[24px] rounded-[20px] bg-white text-[32px] font-bold outline-none placeholder:text-gray-300 shadow-inner"
                style={{ color: COLORS.ac.darkPurple }}
                maxLength={8}
              />
              <div className="absolute right-[24px] top-1/2 -translate-y-1/2">
                <div
                  className="w-[30px] h-[36px]"
                  style={{
                    backgroundColor: COLORS.ac.darkPurple,
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
        )}

        {/* 하단 버튼 영역 - Top Gap 112px from Password (or flow) */}
        {/* 정확한 위치: absolute bottom-based positioned or margin-top based. Image shows Footer is fixed relative to modal bottom? */}
        {/* Using mt-auto w/ mb-[112px] as per previous, but visually checking space. */}
        {/* If utilizing mt-auto, it pushes to bottom. Layout height is fixed 985px. */}
        <div className="w-full flex justify-center gap-[48px] mt-auto mb-[112px]">
          {/* 뒤로가기 */}
          <button
            onClick={onClose}
            className="w-[300px] h-[100px] rounded-[50px] shadow-xl hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-[16px]"
            style={{ backgroundColor: COLORS.ac.purple }}
          >
            <div
              className={`w-[40px] h-[40px]`}
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
            <span className="text-[40px] font-black text-white pt-1">뒤로가기</span>
          </button>

          {/* 섬만들기 */}
          <button
            onClick={() => {
              if (!canSubmit) return;
              onCreate({ title, maxPlayers, totalRounds, isPrivate, password: isPrivate ? password : null });
            }}
            disabled={!canSubmit}
            className={`w-[300px] h-[100px] rounded-[50px] shadow-xl flex items-center justify-center transition-all ${!canSubmit ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-105 active:scale-95'}`}
            style={{ backgroundColor: COLORS.ac.darkPurple }}
          >
            <span className="text-[40px] font-black text-white pt-1">섬 만들기</span>
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
  const hostImgSrc = hostCharInfo ? hostCharInfo.roomListImage || hostCharInfo.selectBasicImage : null;

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
              <div
                className={`w-[80px] h-[80px] rounded-full border-[3px] border-[#F3E5F5] overflow-hidden flex items-center justify-center ${hostImgSrc ? 'bg-white' : 'bg-[#EAD8F9]'}`}
              >
                {hostImgSrc && <img src={hostImgSrc} alt="host" className="w-full h-full object-cover" />}
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
            className="w-[300px] h-[100px] rounded-[50px] shadow-xl hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-[16px]"
            style={{ backgroundColor: COLORS.ac.purple }}
          >
            <div
              className={`w-[40px] h-[40px]`}
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
            <span className="text-[40px] font-black text-white pt-1">뒤로가기</span>
          </button>
          <button
            onClick={() => onConfirm(password)}
            className="w-[300px] h-[100px] rounded-[50px] shadow-xl flex items-center justify-center transition-all hover:brightness-105 active:scale-95"
            style={{ backgroundColor: COLORS.ac.darkPurple }}
          >
            <span className="text-[40px] font-black text-white pt-1">입장하기</span>
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
