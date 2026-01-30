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

  // 상단 우측 아이콘 박스 스타일 - 80px = 4.17vw, 3px = 0.16vw
  const iconBtnStyle =
    'w-[4.17vw] h-[4.17vw] bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer border-[0.16vw] border-white';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[url('/images/bg-roomlist.jpg')] bg-cover bg-center font-gosanja flex items-center justify-center">
      {/* 1. 상단 아이콘 및 프로필 영역 - 40px = 2.08vw, 3.7vh */}
      <div className="absolute top-[3.7vh] left-[2.08vw] z-50">
        <button onClick={() => navigate('/home')} className={iconBtnStyle}>
          <HomeIcon className="w-[2.08vw] h-[2.08vw]" style={{ color: COLORS.roomList.textMain }} />
        </button>
      </div>

      <div className="absolute top-[3.7vh] right-[2.08vw] z-50">
        <TopButtons
          nickname={sessionStorage.getItem('nickname') || '주민'}
          onProfileClick={() => navigate('/mypage')}
          colors={{ text: COLORS.roomList.textMain, badgeBg: COLORS.roomList.btnMain, badgeText: 'white' }}
        />
      </div>

      <div className="relative w-[66.67vw] flex flex-col items-center overflow-visible mt-[3.7vh]">
        {/* [상단 섹션] 헤더 (Title & Meta) - 60px = 3.13vw, 56px = 5.19vh, 16px = 1.48vh */}
        <div className="w-full flex flex-col items-center shrink-0 relative z-10">
          <h1 className="text-[3.13vw] font-black leading-none mb-[5.19vh]" style={{ color: COLORS.roomList.textMain }}>
            발견한 <span style={{ color: COLORS.roomList.textHighlight }}>섬</span> 리스트
          </h1>

          <div className="flex justify-between w-full px-[2.08vw] items-end mb-[1.48vh]">
            <div
              className="flex items-baseline gap-[0.42vw] text-[1.25vw] font-bold"
              style={{ color: COLORS.roomList.textMain }}
            >
              총 <span className="text-[1.46vw]">{rooms.length}</span>개
            </div>
            <div className="text-[1.25vw] font-bold" style={{ color: COLORS.roomList.textMain }}>
              스크롤해서 더보기 ↓
            </div>
          </div>
        </div>

        {/* [하단 컨테이너] 리스트 + 푸터 (배경색 적용) - 800px = 74.07vh, 60px = 3.13vw */}
        <div
          className="w-full h-[74.07vh] flex flex-col items-center rounded-[3.13vw] relative overflow-hidden"
          style={{ backgroundColor: COLORS.roomList.bgMainTransparent }}
        >
          {/* [중앙 섹션] 리스트 스크롤 영역 - flex-1, 40px = 2.08vw */}
          <div
            className={`w-full flex-1 overflow-y-auto px-[2.08vw] scrollbar-hide ${
              rooms.length === 0 && !loading ? 'flex flex-col items-center justify-center' : ''
            }`}
          >
            {rooms.length === 0 && !loading ? (
              <div className="flex flex-col items-center opacity-60 pb-[3.7vh]">
                <span className="text-[1.67vw] font-bold text-[#594E36]">아직 만들어진 섬이 없어!</span>
                <span className="text-[1.25vw] text-[#594E36] mt-[0.19vh]">직접 새로운 섬을 만들어볼까? 🏝️</span>
              </div>
            ) : (
              <div className="flex flex-col items-center pb-[1.85vh] pt-[3.7vh]">
                {sortedRooms.map((room) => {
                  const isFull = room.currentPlayers >= room.maxPlayers;
                  const disabled = isFull || !room.joinable;
                  const btnText = room.status === 'PLAYING' ? '마감' : isFull ? '마감' : '입장';
                  const playersPreview = roomPlayersMap[room.id] || [];

                  return (
                    <div key={room.id} className="w-full flex flex-col items-center">
                      {/* 리스트 아이템 - 1200px = 62.5vw, 92px = 8.52vh, 40px = 2.08vw radius, 12px = 1.11vh margin */}
                      <div className="w-[62.5vw] h-[8.52vh] bg-white rounded-[2.08vw] flex items-center px-[2.08vw] shadow-sm relative my-[1.11vh] shrink-0 hover:scale-[1.01] transition-transform">
                        {/* [좌측 영역] 잠금 + 제목 - 400px = 20.83vw, 40px = 2.08vw, 20px = 1.04vw gap, 32px = 1.67vw text, 320px = 16.67vw max-width */}
                        <div className="flex items-center gap-[1.04vw] w-[20.83vw]">
                          {room.isPrivate ? (
                            <div
                              className="w-[2.08vw] h-[2.08vw]"
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
                            <div className="w-[2.08vw] h-[2.08vw]" />
                          )}
                          <span
                            className="text-[1.67vw] font-bold truncate max-w-[16.67vw] pt-[0.09vh]"
                            style={{ color: COLORS.roomList.textSub }}
                          >
                            {room.title}
                          </span>
                        </div>

                        {/* [중앙 영역] 주사위 + 정보 그룹 - 48px = 2.5vw, 52px = 2.71vw gap, 24px = 1.25vw text */}
                        <div className="absolute left-[50%] -translate-x-1/2 flex items-center gap-[2.71vw]">
                          {/* 주사위 */}
                          <div
                            className="w-[2.5vw] h-[2.5vw]"
                            style={{
                              backgroundColor: '#8B5E83',
                              maskImage: `url("/images/icon-dice-${room.totalRounds}.png")`,
                              WebkitMaskImage: `url("/images/icon-dice-${room.totalRounds}.png")`,
                              maskSize: 'contain',
                              maskRepeat: 'no-repeat',
                            }}
                          />
                          {/* 방장/인원 정보 - 24px = 1.25vw, 120px = 6.25vw max-width */}
                          <div className="flex flex-col gap-[0.09vh]">
                            <div
                              className="flex items-center gap-[0.42vw] text-[1.25vw] font-bold"
                              style={{ color: '#8B5E83' }}
                            >
                              <div
                                className="w-[1.25vw] h-[1.25vw] bg-[#8B5E83]"
                                style={{
                                  maskImage: `url("/images/roomlist/icon-leaf.webp")`,
                                  WebkitMaskImage: `url("/images/roomlist/icon-leaf.webp")`,
                                  maskSize: 'contain',
                                }}
                              />
                              <span className="truncate max-w-[6.25vw]">{room.hostNickname}</span>
                            </div>
                            <div
                              className="flex items-center gap-[0.42vw] text-[1.25vw] font-bold"
                              style={{ color: '#8B5E83' }}
                            >
                              <div
                                className="w-[1.25vw] h-[1.25vw] bg-[#8B5E83]"
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

                        {/* [우측 영역] 캐릭터 프리뷰 + 입장 버튼 - 40px = 2.08vw gap */}
                        <div className="ml-auto flex items-center gap-[2.08vw]">
                          {/* 캐릭터 프리뷰 - 60px = 3.13vw 슬롯 */}
                          <RoomCharacterImages players={playersPreview} maxSlots={Math.min(room.maxPlayers, 4)} />

                          {/* 입장 버튼 - 120px = 6.25vw, 64px = 5.93vh, 32px = 1.67vw text/radius */}
                          <button
                            onClick={() => openJoinModal(room)}
                            disabled={disabled}
                            className={`w-[6.25vw] h-[5.93vh] rounded-[1.67vw] font-black text-[1.67vw] flex items-center justify-center transition-all active:scale-95 shadow-md ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:brightness-105'}`}
                            style={{
                              backgroundColor: disabled ? COLORS.roomList.btnDisabled : COLORS.roomList.btnMain,
                              color: 'white',
                            }}
                          >
                            {btnText}
                          </button>
                        </div>
                      </div>
                      {/* 점선 구분선 - 1160px = 60.42vw, 24px = 2.22vh, 4px stroke, 12 12 dash */}
                      <div className="w-[60.42vw] h-[2.22vh] opacity-30 flex items-center">
                        <svg width="100%" height="100%">
                          <line
                            x1="2"
                            y1="3"
                            x2="100%"
                            y2="3"
                            stroke={COLORS.roomList.textMain}
                            strokeWidth="0.21vw"
                            strokeLinecap="round"
                            strokeDasharray="0.63vw 0.63vw"
                          />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* [하단 섹션] 액션 바 (Footer) - 148px = 13.7vh, 80px = 4.17vw padding, 10px = 0.93vh pb */}
          <div className="w-full h-[13.7vh] px-[4.17vw] flex justify-between items-center shrink-0 pb-[0.93vh]">
            {/* 검색 버튼 - 56px = 2.92vw, padding 4 = 0.21vw */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex flex-col items-center hover:scale-110 transition-transform p-[0.21vw]"
            >
              <div
                className="w-[2.92vw] h-[2.92vw] bg-[#8B5E83]"
                style={{
                  maskImage: `url("/images/roomlist/icon-search.svg")`,
                  WebkitMaskImage: `url("/images/roomlist/icon-search.svg")`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                }}
              />
            </button>

            {/* 섬 만들기 (중앙 버튼) - 300px = 15.63vw, 80px = 7.41vh, 40px = 2.08vw radius, 32px = 1.67vw text */}
            <button
              onClick={() => setCreateOpen(true)}
              className="w-[15.63vw] h-[7.41vh] rounded-[2.08vw] text-[1.67vw] font-black text-white shadow-xl hover:brightness-105 active:scale-95 transition-all"
              style={{ backgroundColor: COLORS.roomList.btnMain }}
            >
              섬 만들기
            </button>

            {/* 새로고침 버튼 - 56px = 2.92vw */}
            <button
              onClick={() => refreshRooms('')}
              className="flex flex-col items-center hover:rotate-180 transition-transform duration-500 p-[0.21vw]"
            >
              <div
                className="w-[2.92vw] h-[2.92vw] bg-[#8B5E83]"
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
          <div className="bg-white px-[2.08vw] py-[1.48vh] rounded-[2.08vw] flex flex-col items-center shadow-2xl animate-bounce">
            <span className="text-[2.08vw]">✈️</span>
            <span className="text-[1.25vw] font-bold text-[#5A4A6F] mt-[0.37vh]">섬으로 이동 중...</span>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed top-[0.93vh] left-1/2 -translate-x-1/2 z-[9999] bg-white/90 backdrop-blur px-[1.67vw] py-[0.37vh] rounded-full shadow-xl border-[0.1vw] animate-in fade-in slide-in-from-top-4"
          style={{ borderColor: COLORS.roomList.btnMain }}
        >
          <span className="text-[1.04vw] font-bold" style={{ color: COLORS.roomList.textMain }}>
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

// 캐릭터 이미지 프리뷰 - 60px = 3.13vw 슬롯, 8px = 0.42vw gap
function RoomCharacterImages({ players, maxSlots }) {
  return (
    <div className="flex gap-[0.42vw]">
      {Array.from({ length: 4 }).map((_, idx) => {
        const p = players[idx];
        const charInfo = p?.characterId ? CHARACTER_BY_ID.get(Number(p.characterId)) : null;
        const imgSrc = charInfo?.roomListImage || charInfo?.selectBasicImage;

        return (
          <div
            key={idx}
            className={`w-[3.13vw] h-[3.13vw] rounded-full overflow-hidden flex items-center justify-center ${idx < maxSlots ? 'bg-[#EAD8F9]' : 'bg-[#D9D9D9] opacity-40'}`}
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

  // 라벨 스타일 컴포넌트 - 40px = 2.08vw, 48px = 4.44vh
  const LabelIcon = ({ iconSrc }) => (
    <div className="w-[2.08vw] h-[4.44vh] flex items-center justify-center shrink-0">
      {iconSrc && (
        <div
          className="w-[2.08vw] h-[4.44vh]"
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

  // 36px = 1.88vw
  const LabelText = ({ text }) => (
    <span
      className="text-[1.88vw] font-bold whitespace-nowrap leading-none pt-[0.09vh]"
      style={{ color: COLORS.ac.darkPurple }}
    >
      {text}
    </span>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-[0.83vw] backdrop-blur-md overflow-auto"
      onMouseDown={onClose}
    >
      {/* 1132px = 58.96vw, 985px = 91.2vh, 104px = 9.63vh padding-top */}
      <div
        className="w-[58.96vw] h-[91.2vh] flex flex-col shadow-none relative shrink-0"
        style={{
          backgroundImage: "url('/images/roomlist/ui-roomlist-modal-1.webp')",
          backgroundSize: '100% 100%',
          backgroundColor: 'transparent',
          paddingTop: '9.63vh',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 제목 - 56px = 2.92vw, 60px = 5.56vh margin-bottom */}
        <h2
          className="text-[2.92vw] font-black mb-[5.56vh] leading-none text-center w-full"
          style={{ color: COLORS.ac.darkPurple }}
        >
          섬 만들기
        </h2>

        {/* 1. 섬 이름 - 124px = 6.46vw pl, 12px = 0.63vw gap, 92px = 4.79vw gap, 600px = 31.25vw input width, 72px = 6.67vh height, 24px = 1.25vw px, 20px = 1.04vw radius, 32px = 1.67vw text, 18px = 0.94vw counter, 16px = 0.83vw right */}
        <div className="flex items-center pl-[6.46vw]">
          <LabelIcon iconSrc="/images/roomlist/icon-leaf.webp" />
          <div className="w-[0.63vw]" />
          <LabelText text="섬 이름" />
          <div className="w-[4.79vw]" />
          <div className="relative w-[31.25vw]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="섬 이름 입력"
              className="w-full h-[6.67vh] px-[1.25vw] rounded-[1.04vw] bg-white text-[1.67vw] font-bold outline-none placeholder:text-gray-300 shadow-inner"
              style={{ color: COLORS.ac.darkPurple }}
              maxLength={18}
            />
            <span
              className="absolute right-[0.83vw] top-1/2 -translate-y-1/2 text-[0.94vw] font-bold opacity-50"
              style={{ color: COLORS.ac.darkPurple }}
            >
              {title.length}/18
            </span>
          </div>
        </div>

        {/* 2. 인원 수 - 40px = 3.7vh mt, 104px = 5.42vw gap, 120px = 6.25vw btn, 66px = 6.11vh btn, 32px = 1.67vw radius/text, 12px = 0.63vw btn gap */}
        <div className="flex items-center pl-[6.46vw] mt-[3.7vh]">
          <LabelIcon iconSrc="/images/roomlist/icon-people.svg" />
          <div className="w-[0.63vw]" />
          <LabelText text="인원수" />
          <div className="w-[5.42vw]" />
          <div className="flex gap-[0.63vw]">
            {[2, 3, 4].map((num) => {
              const isActive = maxPlayers === num;
              return (
                <button
                  key={num}
                  onClick={() => setMaxPlayers(num)}
                  className="w-[6.25vw] h-[6.11vh] rounded-[1.67vw] text-[1.67vw] font-bold transition-all shadow-sm flex items-center justify-center leading-none pt-[0.09vh]"
                  style={{
                    backgroundColor: isActive ? COLORS.ac.darkPurple : 'white',
                    color: isActive ? 'white' : COLORS.ac.darkPurple,
                  }}
                >
                  {num}명
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 라운드 수 - 60px = 3.13vw gap */}
        <div className="flex items-center pl-[6.46vw] mt-[3.7vh]">
          <LabelIcon iconSrc="/images/roomlist/icon-dice-10.png" />
          <div className="w-[0.63vw]" />
          <LabelText text="라운드 수" />
          <div className="w-[3.13vw]" />
          <div className="flex gap-[0.63vw]">
            {[10, 20, 30, 40].map((num) => {
              const isActive = totalRounds === num;
              return (
                <button
                  key={num}
                  onClick={() => setTotalRounds(num)}
                  className="w-[6.25vw] h-[6.11vh] rounded-[1.67vw] text-[1.67vw] font-bold transition-all shadow-sm flex items-center justify-center leading-none pt-[0.09vh]"
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

        {/* 4. 공개 설정 - 68px = 3.54vw gap, 72px = 6.67vh height, 40px = 2.08vw radio/gap, 3px = 0.16vw border, 16px = 0.83vw inner dot, 12px = 0.63vw label gap */}
        <div className="flex items-center pl-[6.46vw] mt-[3.7vh] h-[6.67vh]">
          <LabelIcon iconSrc="/images/roomlist/icon-lock.svg" />
          <div className="w-[0.63vw]" />
          <LabelText text="공개 설정" />
          <div className="w-[3.54vw]" />
          <div className="flex items-center gap-[2.08vw]">
            {/* 공개 버튼 */}
            <button onClick={() => setIsPrivate(false)} className="flex items-center gap-[0.63vw] group">
              <div
                className={`w-[2.08vw] h-[2.08vw] rounded-full border-[0.16vw] flex items-center justify-center transition-colors ${
                  !isPrivate ? 'bg-[#744990] border-[#744990]' : 'bg-white border-[#744990]'
                }`}
                style={{
                  backgroundColor: !isPrivate ? COLORS.ac.darkPurple : 'white',
                  borderColor: COLORS.ac.darkPurple,
                }}
              >
                {!isPrivate && <div className="w-[0.83vw] h-[0.83vw] bg-white rounded-full" />}
              </div>
              <span
                className={`text-[1.88vw] font-bold pt-[0.09vh] ${!isPrivate ? 'text-[#744990]' : 'text-[#744990]/50'}`}
                style={{
                  color: !isPrivate ? COLORS.ac.darkPurple : COLORS.ac.darkPurple,
                  opacity: !isPrivate ? 1 : 0.5,
                }}
              >
                공개
              </span>
            </button>

            {/* 비공개 버튼 */}
            <button onClick={() => setIsPrivate(true)} className="flex items-center gap-[0.63vw] group">
              <div
                className={`w-[2.08vw] h-[2.08vw] rounded-full border-[0.16vw] flex items-center justify-center transition-colors ${
                  isPrivate ? 'bg-[#744990] border-[#744990]' : 'bg-white border-[#744990]'
                }`}
                style={{
                  backgroundColor: isPrivate ? COLORS.ac.darkPurple : 'white',
                  borderColor: COLORS.ac.darkPurple,
                }}
              >
                {isPrivate && <div className="w-[0.83vw] h-[0.83vw] bg-white rounded-full" />}
              </div>
              <span
                className={`text-[1.88vw] font-bold pt-[0.09vh] ${isPrivate ? 'text-[#744990]' : 'text-[#744990]/50'}`}
                style={{ color: isPrivate ? COLORS.ac.darkPurple : COLORS.ac.darkPurple, opacity: isPrivate ? 1 : 0.5 }}
              >
                비공개
              </span>
            </button>
          </div>
        </div>

        {/* 비밀번호 입력 - 32px = 2.96vh mt, 30px = 1.56vw icon, 36px = 3.33vh icon height, 24px = 1.25vw right */}
        {isPrivate && (
          <div className="flex items-center pl-[6.46vw] mt-[2.96vh] animate-in fade-in slide-in-from-top-2 duration-300 h-[6.67vh]">
            {/* Align Spacer (Invisible) */}
            <div className="opacity-0 flex items-center shrink-0">
              <LabelIcon iconSrc="/images/roomlist/icon-leaf.webp" />
              <div className="w-[0.63vw]" />
              <LabelText text="섬 이름" />
              <div className="w-[4.79vw]" />
            </div>

            <div className="relative w-[31.25vw]">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full h-[6.67vh] px-[1.25vw] rounded-[1.04vw] bg-white text-[1.67vw] font-bold outline-none placeholder:text-gray-300 shadow-inner"
                style={{ color: COLORS.ac.darkPurple }}
                maxLength={8}
              />
              <div className="absolute right-[1.25vw] top-1/2 -translate-y-1/2">
                <div
                  className="w-[1.56vw] h-[3.33vh]"
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

        {/* 하단 버튼 영역 - 112px = 10.37vh mb, 48px = 2.5vw gap, 300px = 15.63vw btn, 100px = 9.26vh btn, 50px = 2.6vw radius, 40px = 2.08vw icon/text, 16px = 0.83vw icon-text gap */}
        <div className="w-full flex justify-center gap-[2.5vw] mt-auto mb-[10.37vh]">
          {/* 뒤로가기 */}
          <button
            onClick={onClose}
            className="w-[15.63vw] h-[9.26vh] rounded-[2.6vw] shadow-xl hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-[0.83vw]"
            style={{ backgroundColor: COLORS.ac.purple }}
          >
            <div
              className={`w-[2.08vw] h-[2.08vw]`}
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
            <span className="text-[2.08vw] font-black text-white pt-[0.09vh]">뒤로가기</span>
          </button>

          {/* 섬만들기 */}
          <button
            onClick={() => {
              if (!canSubmit) return;
              onCreate({ title, maxPlayers, totalRounds, isPrivate, password: isPrivate ? password : null });
            }}
            disabled={!canSubmit}
            className={`w-[15.63vw] h-[9.26vh] rounded-[2.6vw] shadow-xl flex items-center justify-center transition-all ${!canSubmit ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-105 active:scale-95'}`}
            style={{ backgroundColor: COLORS.ac.darkPurple }}
          >
            <span className="text-[2.08vw] font-black text-white pt-[0.09vh]">섬 만들기</span>
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

  // 라벨 헬퍼 - 220px = 11.46vw, 40px = 2.08vw/3.7vh, 36px = 1.88vw, 40px = 3.7vh mb, 20px = 1.04vw pl
  const DetailRow = ({ iconSrc, label, children }) => (
    <div className="flex items-center w-full mb-[3.7vh]">
      <div className="w-[11.46vw] flex items-center gap-[0.63vw] flex-shrink-0">
        <div className="w-[2.08vw] h-[2.08vw] flex items-center justify-center">
          {iconSrc && (
            <div
              className="w-[1.88vw] h-[1.88vw]"
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
        <span className="text-[1.88vw] font-bold whitespace-nowrap" style={{ color: COLORS.roomList.textSub }}>
          {label}
        </span>
      </div>
      <div className="flex-1 flex items-center pl-[1.04vw]">{children}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-[0.83vw] backdrop-blur-md"
      onMouseDown={onClose}
    >
      {/* 1132px = 58.96vw, 985px = 91.2vh, 120px = 11.11vh pt */}
      <div
        className="w-[58.96vw] h-[91.2vh] flex flex-col items-center shadow-none relative shrink-0"
        style={{
          backgroundImage: "url('/images/roomlist/ui-roomlist-modal-2.webp')",
          backgroundSize: '100% 100%',
          backgroundColor: 'transparent',
          paddingTop: '11.11vh',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Title - 56px = 2.92vw, 48px = 2.5vw, 60px = 5.56vh mb */}
        <div className="text-center mb-[5.56vh]">
          <h2 className="text-[2.92vw] font-black leading-tight" style={{ color: COLORS.roomList.textSub }}>
            {room.title}
            <span className="opacity-80">에</span>
          </h2>
          <div
            className="text-[2.5vw] font-black leading-tight opacity-80 mt-[0.19vh]"
            style={{ color: COLORS.roomList.textSub }}
          >
            입장하시겠습니까?
          </div>
        </div>

        {/* White Info Box - 799px = 41.61vw, 436px = 40.37vh, 60px = 3.13vw radius/padding */}
        <div className="w-[41.61vw] h-[40.37vh] bg-white rounded-[3.13vw] p-[3.13vw] flex flex-col justify-center shadow-lg relative">
          {/* 1열: 방장 - 80px = 4.17vw avatar, 3px = 0.16vw border, 40px = 2.08vw text, 300px = 15.63vw max-width */}
          <DetailRow iconSrc="/images/roomlist/icon-leaf.webp" label="방장">
            <div className="flex items-center gap-[0.83vw]">
              <div
                className={`w-[4.17vw] h-[4.17vw] rounded-full border-[0.16vw] border-[#F3E5F5] overflow-hidden flex items-center justify-center ${hostImgSrc ? 'bg-white' : 'bg-[#EAD8F9]'}`}
              >
                {hostImgSrc && <img src={hostImgSrc} alt="host" className="w-full h-full object-cover" />}
              </div>
              <span
                className="text-[2.08vw] font-bold truncate max-w-[15.63vw]"
                style={{ color: COLORS.roomList.textSub }}
              >
                {room.hostNickname}
              </span>
            </div>
          </DetailRow>

          {/* 2열: 라운드 */}
          <DetailRow iconSrc="/images/roomlist/icon-dice-10.png" label="라운드 수">
            <span className="text-[2.08vw] font-bold" style={{ color: COLORS.roomList.textSub }}>
              {room.totalRounds} 라운드
            </span>
          </DetailRow>

          {/* 3열: 플레이어 - 60px = 3.13vw avatar, 3px = 0.16vw border */}
          <DetailRow iconSrc="/images/roomlist/icon-people.svg" label="참여 주민">
            <div className="flex gap-[0.42vw]">
              {Array.from({ length: room.maxPlayers }).map((_, idx) => {
                const p = initialPlayers[idx];
                const charInfo = p?.characterId ? CHARACTER_BY_ID.get(Number(p.characterId)) : null;
                const imgSrc = charInfo ? charInfo.roomListImage || charInfo.selectBasicImage : null;
                return (
                  <div
                    key={idx}
                    className="w-[3.13vw] h-[3.13vw] rounded-full bg-[#D9D9D9] border-[0.16vw] border-white overflow-hidden shadow-sm"
                  >
                    {imgSrc && <img src={imgSrc} alt="player" className="w-full h-full object-cover" />}
                  </div>
                );
              })}
            </div>
          </DetailRow>
        </div>

        {/* 비공개 방 비밀번호 입력 - 40px = 3.7vh mt, 600px = 31.25vw, 72px = 6.67vh, 8px = 0.42vw px (32px = 1.67vw), 20px = 1.04vw radius, 32px = 1.67vw text, 6px = 0.31vw (24px = 1.25vw) right, 8px = 0.42vw (32px = 1.67vw) icon */}
        {room.isPrivate && (
          <div className="mt-[3.7vh] w-full flex justify-center">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-[31.25vw] h-[6.67vh] px-[1.67vw] rounded-[1.04vw] bg-white text-[1.67vw] font-bold outline-none placeholder:text-gray-300 shadow-inner"
                style={{ color: COLORS.roomList.textSub }}
              />
              <div
                className="absolute right-[1.25vw] top-1/2 -translate-y-1/2 w-[1.67vw] h-[1.67vw]"
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

        {/* 버튼들 - 40px = 2.08vw gap, 80px = 7.41vh mt, 300px = 15.63vw, 100px = 9.26vh, 50px = 2.6vw radius */}
        <div className="w-full flex justify-center gap-[2.08vw] mt-[7.41vh]">
          <button
            onClick={onClose}
            className="w-[15.63vw] h-[9.26vh] rounded-[2.6vw] shadow-xl hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-[0.83vw]"
            style={{ backgroundColor: COLORS.ac.purple }}
          >
            <div
              className={`w-[2.08vw] h-[2.08vw]`}
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
            <span className="text-[2.08vw] font-black text-white pt-[0.09vh]">뒤로가기</span>
          </button>
          <button
            onClick={() => onConfirm(password)}
            className="w-[15.63vw] h-[9.26vh] rounded-[2.6vw] shadow-xl flex items-center justify-center transition-all hover:brightness-105 active:scale-95"
            style={{ backgroundColor: COLORS.ac.darkPurple }}
          >
            <span className="text-[2.08vw] font-black text-white pt-[0.09vh]">입장하기</span>
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
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-[0.83vw] backdrop-blur-sm"
      onMouseDown={onClose}
    >
      {/* 500px = 26.04vw, 50px = 2.6vw radius, 8 = 0.42vw (32px = 1.67vw) padding */}
      <div
        className="w-[26.04vw] bg-white rounded-[2.6vw] p-[1.67vw] flex flex-col items-center shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 32px = 1.67vw text, 6 = 0.56vh (24px = 2.22vh) mb */}
        <h2 className="text-[1.67vw] font-black text-[#5A4A6F] mb-[2.22vh]">섬 검색</h2>
        {/* 60px = 5.56vh height, 6 = 1.25vw (24px) px, 30px = 1.56vw radius, 20px = 1.04vw text, 2px = 0.1vw border */}
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch(val)}
          placeholder="찾고 싶은 섬 이름을 입력하세요"
          className="w-full h-[5.56vh] px-[1.25vw] rounded-[1.56vw] bg-[#F3E5F5] text-[1.04vw] font-bold text-[#5A4A6F] outline-none border-[0.1vw] border-transparent focus:border-[#9B7AD6]"
        />
        {/* 4 = 0.83vw (16px) gap, 8 = 1.48vh (32px) mt, 60px = 5.56vh btn, 30px = 1.56vw radius, 20px = 1.04vw text */}
        <div className="w-full flex gap-[0.83vw] mt-[1.48vh]">
          <button
            onClick={onClose}
            className="flex-1 h-[5.56vh] bg-[#E0E0E0] rounded-[1.56vw] text-[1.04vw] font-bold text-[#757575] hover:bg-[#D0D0D0]"
          >
            취소
          </button>
          <button
            onClick={() => onSearch(val)}
            className="flex-1 h-[5.56vh] bg-[#9B7AD6] rounded-[1.56vw] text-[1.04vw] font-bold text-white hover:bg-[#8A6AC6]"
          >
            검색
          </button>
        </div>
      </div>
    </div>
  );
}
