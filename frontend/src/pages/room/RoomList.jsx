// frontend/src/pages/room/RoomList.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import TopButtons from '../../components/common/TopButtons';
import HomeButton from '../../components/common/HomeButton';
import AspectLayout from '../../components/layout/AspectLayout';

import { CHARACTERS } from '../../constants/characters.js';
import { COLORS } from '../../constants/colors.js';

const API_BASE = ''; // Vite proxy 쓰면 "" 유지

const WS_APP_PREFIX = '/app/roomlist/rooms';
const WS_TOPIC_ROOMS = '/topic/roomlist/rooms';

const CHARACTER_BY_ID = new Map(CHARACTERS.map((c) => [Number(c.id), c]));

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

  // 상단 우측 아이콘 박스 스타일 - 80px = 4.17cqw, 3px = 0.16cqw
  const iconBtnStyle =
    'w-[4.17cqw] h-[4.17cqw] bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer border-[0.16cqw] border-white';

  return (
    <AspectLayout>
      <div className="relative w-full h-full overflow-hidden bg-[url('/images/bg-roomlist.jpg')] bg-cover bg-center font-gosanja flex items-center justify-center">
        {/* 1. 상단 아이콘 및 프로필 영역 - 40px = 2.08cqw, 3.7cqh */}
        <div className="absolute top-[3.7cqh] left-[2.08cqw] z-50">
          <HomeButton iconColor={COLORS.roomList.textMain} bgColor="white" />
        </div>

        <div className="absolute top-[3.7cqh] right-[2.08cqw] z-50">
          <TopButtons
            nickname={sessionStorage.getItem('nickname') || '주민'}
            profileImage={sessionStorage.getItem('profileImage')}
            onProfileClick={() => navigate('/mypage')}
            onConfigClick={() => navigate('/config')}
            colors={{
              text: COLORS.roomList.textMain,
              iconBg: 'white',
              badgeBg: COLORS.roomList.btnMain,
              badgeText: 'white',
              dropdownBorder: COLORS.roomList.border, // #B39DDB
              dropdownHoverBg: COLORS.roomList.bgMain, // #EAD8F9
              dropdownText: COLORS.roomList.textMain, // #6A4F9C
            }}
          />
        </div>

        <div className="relative w-[66.67cqw] flex flex-col items-center overflow-visible mt-[3.7cqh]">
          {/* [상단 섹션] 헤더 (Title & Meta) - 60px = 3.13cqw, 56px = 5.19cqh, 16px = 1.48cqh */}
          <div className="w-full flex flex-col items-center shrink-0 relative z-10">
            <h1
              className="text-[3.13cqw] font-black leading-none mb-[5.19cqh]"
              style={{ color: COLORS.roomList.textMain }}
            >
              발견한 <span style={{ color: COLORS.roomList.textHighlight }}>섬</span> 리스트
            </h1>

            <div className="flex justify-between w-full px-[2.08cqw] items-end mb-[1.48cqh]">
              <div
                className="flex items-baseline gap-[0.42cqw] text-[1.25cqw] font-bold"
                style={{ color: COLORS.roomList.textMain }}
              >
                총 <span className="text-[1.46cqw]">{rooms.length}</span>개
              </div>
              <div className="text-[1.25cqw] font-bold" style={{ color: COLORS.roomList.textMain }}>
                스크롤해서 더보기 ↓
              </div>
            </div>
          </div>

          {/* [하단 컨테이너] 리스트 + 푸터 (배경색 적용) - 800px = 74.07cqh, 60px = 3.13cqw */}
          <div
            className="w-full h-[74.07cqh] flex flex-col items-center rounded-[3.13cqw] relative overflow-hidden"
            style={{ backgroundColor: COLORS.roomList.bgMainTransparent }}
          >
            {/* [중앙 섹션] 리스트 스크롤 영역 - flex-1, 40px = 2.08cqw */}
            <div
              className={`w-full flex-1 overflow-y-auto px-[2.08cqw] scrollbar-hide ${
                rooms.length === 0 && !loading ? 'flex flex-col items-center justify-center' : ''
              }`}
            >
              {rooms.length === 0 && !loading ? (
                <div className="flex flex-col items-center opacity-60 mt-[15cqh] pb-[3.7cqh]">
                  <span className="text-[1.67cqw] font-bold text-[#7B5EA7]">아직 만들어진 섬이 없어!</span>
                  <span className="text-[1.25cqw] text-[#9B7EC4] mt-[0.19cqh]">직접 새로운 섬을 만들어볼까? 🏝️</span>
                </div>
              ) : (
                <div className="flex flex-col items-center pb-[1.85cqh] pt-[3.7cqh]">
                  {sortedRooms.map((room) => {
                    const isFull = room.currentPlayers >= room.maxPlayers;
                    const disabled = isFull || !room.joinable;
                    const btnText = room.status === 'PLAYING' ? '마감' : isFull ? '마감' : '입장';
                    const playersPreview = roomPlayersMap[room.id] || [];

                    return (
                      <div key={room.id} className="w-full flex flex-col items-center">
                        {/* 리스트 아이템 - 1200px = 62.5cqw, 92px = 8.52cqh, 40px = 2.08cqw radius, 12px = 1.11cqh margin */}
                        <div className="w-[62.5cqw] h-[8.52cqh] bg-white rounded-[2.08cqw] flex items-center px-[2.08cqw] shadow-sm relative my-[1.11cqh] shrink-0 hover:scale-[1.01] transition-transform">
                          {/* [좌측 영역] 잠금 + 제목 - 400px = 20.83cqw, 40px = 2.08cqw, 20px = 1.04cqw gap, 32px = 1.67cqw text, 320px = 16.67cqw max-width */}
                          <div className="flex items-center gap-[1.04cqw] w-[20.83cqw]">
                            {room.isPrivate ? (
                              <div
                                className="w-[2.08cqw] h-[2.08cqw]"
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
                              <div className="w-[2.08cqw] h-[2.08cqw]" />
                            )}
                            <span
                              className="text-[1.67cqw] font-bold truncate max-w-[16.67cqw] pt-[0.09cqh]"
                              style={{ color: COLORS.roomList.textSub }}
                            >
                              {room.title}
                            </span>
                          </div>

                          {/* [중앙 영역] 주사위 + 정보 그룹 - 48px = 2.5cqw, 52px = 2.71cqw gap, 24px = 1.25cqw text */}
                          <div className="absolute left-[50%] -translate-x-1/2 flex items-center gap-[2.71cqw]">
                            {/* 주사위 */}
                            <div
                              className="w-[2.5cqw] h-[2.5cqw] bg-[#8B5E83]"
                              style={{
                                maskImage: `url("/images/room-waiting/icon-dice-${room.totalRounds}.png")`,
                                WebkitMaskImage: `url("/images/room-waiting/icon-dice-${room.totalRounds}.png")`,
                                maskSize: 'contain',
                                maskRepeat: 'no-repeat',
                                maskPosition: 'center',
                                WebkitMaskRepeat: 'no-repeat',
                                WebkitMaskPosition: 'center',
                              }}
                            />
                            {/* 방장/인원 정보 - 24px = 1.25cqw, 120px = 6.25cqw max-width */}
                            <div className="flex flex-col gap-[0.09cqh]">
                              <div
                                className="flex items-center gap-[0.42cqw] text-[1.25cqw] font-bold"
                                style={{ color: '#8B5E83' }}
                              >
                                <div
                                  className="w-[1.25cqw] h-[1.25cqw] bg-[#8B5E83]"
                                  style={{
                                    maskImage: `url("/images/roomlist/icon-leaf.webp")`,
                                    WebkitMaskImage: `url("/images/roomlist/icon-leaf.webp")`,
                                    maskSize: 'contain',
                                  }}
                                />
                                <span className="truncate max-w-[6.25cqw]">{room.hostNickname}</span>
                              </div>
                              <div
                                className="flex items-center gap-[0.42cqw] text-[1.25cqw] font-bold"
                                style={{ color: '#8B5E83' }}
                              >
                                <div
                                  className="w-[1.25cqw] h-[1.25cqw] bg-[#8B5E83]"
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

                          {/* [우측 영역] 캐릭터 프리뷰 + 입장 버튼 - 40px = 2.08cqw gap */}
                          <div className="ml-auto flex items-center gap-[2.08cqw]">
                            {/* 캐릭터 프리뷰 - 60px = 3.13cqw 슬롯 */}
                            <RoomCharacterImages players={playersPreview} maxSlots={Math.min(room.maxPlayers, 4)} />

                            {/* 입장 버튼 - 120px = 6.25cqw, 64px = 5.93cqh, 32px = 1.67cqw text/radius */}
                            <button
                              onClick={() => openJoinModal(room)}
                              disabled={disabled}
                              className={`w-[6.25cqw] h-[5.93cqh] rounded-[1.67cqw] font-black text-[1.67cqw] flex items-center justify-center transition-all active:scale-95 shadow-md ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:brightness-105'}`}
                              style={{
                                backgroundColor: disabled ? COLORS.roomList.btnDisabled : COLORS.roomList.btnMain,
                                color: 'white',
                              }}
                            >
                              {btnText}
                            </button>
                          </div>
                        </div>
                        {/* 점선 구분선 - 1160px = 60.42cqw, 24px = 2.22cqh, 4px stroke, 12 12 dash */}
                        <div className="w-[60.42cqw] h-[2.22cqh] opacity-30 flex items-center">
                          <svg width="100%" height="100%">
                            <line
                              x1="2"
                              y1="3"
                              x2="100%"
                              y2="3"
                              stroke={COLORS.roomList.textMain}
                              strokeWidth="0.21cqw"
                              strokeLinecap="round"
                              strokeDasharray="0.63cqw 0.63cqw"
                            />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* [하단 섹션] 액션 바 (Footer) - 148px = 13.7cqh, 80px = 4.17cqw padding, 10px = 0.93cqh pb */}
            <div className="w-full h-[13.7cqh] px-[4.17cqw] flex justify-between items-center shrink-0 pb-[0.93cqh]">
              {/* 검색 버튼 - 56px = 2.92cqw, padding 4 = 0.21cqw */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex flex-col items-center hover:scale-110 transition-transform p-[0.21cqw]"
              >
                <div
                  className="w-[2.92cqw] h-[2.92cqw] bg-[#8B5E83]"
                  style={{
                    maskImage: `url("/images/roomlist/icon-search.svg")`,
                    WebkitMaskImage: `url("/images/roomlist/icon-search.svg")`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                  }}
                />
              </button>

              {/* 섬 만들기 (중앙 버튼) - 300px = 15.63cqw, 80px = 7.41cqh, 40px = 2.08cqw radius, 32px = 1.67cqw text */}
              <button
                onClick={() => setCreateOpen(true)}
                className="w-[15.63cqw] h-[7.41cqh] rounded-[2.08cqw] text-[1.67cqw] font-black text-white shadow-xl hover:brightness-105 active:scale-95 transition-all"
                style={{ backgroundColor: COLORS.roomList.btnMain }}
              >
                섬 만들기
              </button>

              {/* 새로고침 버튼 - 56px = 2.92cqw */}
              <button
                onClick={() => refreshRooms('')}
                className="flex flex-col items-center hover:rotate-180 transition-transform duration-500 p-[0.21cqw]"
              >
                <div
                  className="w-[2.92cqw] h-[2.92cqw] bg-[#8B5E83]"
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
            <div className="bg-white px-[2.08cqw] py-[1.48cqh] rounded-[2.08cqw] flex flex-col items-center shadow-2xl animate-bounce">
              <span className="text-[2.08cqw]">✈️</span>
              <span className="text-[1.25cqw] font-bold text-[#5A4A6F] mt-[0.37cqh]">섬으로 이동 중...</span>
            </div>
          </div>
        )}

        {toast && (
          <div
            className="fixed top-[0.93cqh] left-1/2 -translate-x-1/2 z-[9999] bg-white/90 backdrop-blur px-[1.67cqw] py-[0.37cqh] rounded-full shadow-xl border-[0.1cqw] animate-in fade-in slide-in-from-top-4"
            style={{ borderColor: COLORS.roomList.btnMain }}
          >
            <span className="text-[1.04cqw] font-bold" style={{ color: COLORS.roomList.textMain }}>
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
    </AspectLayout>
  );
}

// 캐릭터 이미지 프리뷰 - 60px = 3.13cqw 슬롯, 8px = 0.42cqw gap
function RoomCharacterImages({ players, maxSlots }) {
  return (
    <div className="flex gap-[0.42cqw]">
      {Array.from({ length: 4 }).map((_, idx) => {
        const p = players[idx];
        const charInfo = p?.characterId ? CHARACTER_BY_ID.get(Number(p.characterId)) : null;
        // [Modified] 캐릭터 이미지 우선순위 변경: roomListImage(얼굴 아이콘) 우선
        const imgSrc = charInfo?.roomListImage || charInfo?.selectBasicImage;

        return (
          <div
            key={idx}
            className={`w-[3.13cqw] h-[3.13cqw] rounded-full overflow-hidden flex items-center justify-center ${idx < maxSlots ? 'bg-[#EAD8F9]' : 'bg-[#D9D9D9] opacity-40'}`}
          >
            {imgSrc && <img src={imgSrc} alt="char" className="w-[80%] h-[80%] object-contain" />}
          </div>
        );
      })}
    </div>
  );
}

// --------------------------------------------------------------------------------------
// [MODAL 1: Create Island]
// --------------------------------------------------------------------------------------
function CreateIslandModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [totalRounds, setTotalRounds] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const canSubmit = title.trim().length > 0 && (!isPrivate || password.trim().length > 0);

  // 라벨 아이콘 - 40px = 2.08cqw, 48px = 4.44cqh
  const LabelIcon = ({ iconSrc }) => (
    <div className="w-[2.08cqw] h-[4.44cqh] flex items-center justify-center shrink-0">
      {iconSrc && (
        <div
          className="w-[2.08cqw] h-[4.44cqh]"
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

  // 라벨 텍스트 - 36px = 1.88cqw
  const LabelText = ({ text }) => (
    <span
      className="text-[1.88cqw] font-bold whitespace-nowrap leading-none pt-[0.09cqh]"
      style={{ color: COLORS.ac.darkPurple }}
    >
      {text}
    </span>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-[0.83cqw] backdrop-blur-md overflow-auto"
      onMouseDown={onClose}
    >
      {/* 
          Modal Spec: 
          W: 1132px -> 58.96cqw
          H: 985px -> 91.2cqh
          Padding Top: 104px -> 9.63cqh
      */}
      <div
        className="w-[58.96cqw] h-[91.2cqh] flex flex-col shadow-none relative shrink-0"
        style={{
          backgroundImage: "url('/images/roomlist/ui-roomlist-modal-1.webp')",
          backgroundSize: '100% 100%',
          backgroundColor: 'transparent',
          paddingTop: '9.63cqh',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 제목 - 56px = 2.92cqw */}
        <h2
          className="text-[2.92cqw] font-black mb-[5.56cqh] leading-none text-center w-full"
          style={{ color: COLORS.ac.darkPurple }}
        >
          섬 만들기
        </h2>

        {/* 1. 섬 이름 - pl 124px(6.46cqw) */}
        <div className="flex items-center pl-[6.46cqw]">
          <LabelIcon iconSrc="/images/roomlist/icon-leaf.webp" />
          <div className="w-[0.63cqw]" />
          <LabelText text="섬 이름" />
          {/* Gap 92px = 4.79cqw */}
          <div className="w-[4.79cqw]" />
          {/* Input W 600px = 31.25cqw, H 72px = 6.67cqh */}
          <div className="relative w-[31.25cqw]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="방 제목"
              className="w-full h-[6.67cqh] px-[1.25cqw] rounded-[1.04cqw] bg-white text-[1.46cqw] font-bold outline-none placeholder:text-gray-300 shadow-inner"
              style={{ color: COLORS.ac.darkPurple }}
              maxLength={18}
            />
            <span
              className="absolute right-[0.83cqw] top-1/2 -translate-y-1/2 text-[0.94cqw] font-bold opacity-50"
              style={{ color: COLORS.ac.darkPurple }}
            >
              {title.length}/18
            </span>
          </div>
        </div>

        {/* 2. 인원 수 - mt 40px(3.7cqh) */}
        <div className="flex items-center pl-[6.46cqw] mt-[3.7cqh]">
          <LabelIcon iconSrc="/images/roomlist/icon-people.svg" />
          <div className="w-[0.63cqw]" />
          <LabelText text="인원수" />
          {/* Gap 104px = 5.42cqw */}
          <div className="w-[5.42cqw]" />
          <div className="flex gap-[0.63cqw]">
            {[2, 3, 4].map((num) => {
              const isActive = maxPlayers === num;
              return (
                <button
                  key={num}
                  onClick={() => setMaxPlayers(num)}
                  className="w-[6.25cqw] h-[6.11cqh] rounded-[1.67cqw] text-[1.67cqw] font-bold transition-all shadow-sm flex items-center justify-center leading-none pt-[0.09cqh]"
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

        {/* 3. 라운드 수 - mt 40px(3.7cqh) */}
        <div className="flex items-center pl-[6.46cqw] mt-[3.7cqh]">
          <LabelIcon iconSrc="/images/roomlist/icon-dice-10.webp" />
          <div className="w-[0.63cqw]" />
          <LabelText text="라운드 수" />
          {/* Gap 60px = 3.13cqw */}
          <div className="w-[3.13cqw]" />
          <div className="flex gap-[0.63cqw]">
            {[10, 20, 30, 40].map((num) => {
              const isActive = totalRounds === num;
              return (
                <button
                  key={num}
                  onClick={() => setTotalRounds(num)}
                  className="w-[6.25cqw] h-[6.11cqh] rounded-[1.67cqw] text-[1.67cqw] font-bold transition-all shadow-sm flex items-center justify-center leading-none pt-[0.09cqh]"
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

        {/* 4. 공개 설정 - mt 40px(3.7cqh) */}
        <div className="flex items-center pl-[6.46cqw] mt-[3.7cqh] h-[6.67cqh]">
          <LabelIcon iconSrc="/images/roomlist/icon-lock.svg" />
          <div className="w-[0.63cqw]" />
          <LabelText text="공개 설정" />
          {/* Gap 68px = 3.54cqw */}
          <div className="w-[3.54cqw]" />
          <div className="flex items-center gap-[2.08cqw]">
            {/* 공개 버튼 */}
            <button onClick={() => setIsPrivate(false)} className="flex items-center gap-[0.63cqw] group">
              <div
                className={`w-[2.08cqw] h-[2.08cqw] rounded-full border-[0.16cqw] flex items-center justify-center transition-colors ${
                  !isPrivate ? 'bg-[#744990] border-[#744990]' : 'bg-white border-[#744990]'
                }`}
                style={{
                  backgroundColor: !isPrivate ? COLORS.ac.darkPurple : 'white',
                  borderColor: COLORS.ac.darkPurple,
                }}
              >
                {!isPrivate && <div className="w-[0.83cqw] h-[0.83cqw] bg-white rounded-full" />}
              </div>
              <span
                className={`text-[1.88cqw] font-bold pt-[0.09cqh] ${!isPrivate ? 'text-[#744990]' : 'text-[#744990]/50'}`}
                style={{
                  color: !isPrivate ? COLORS.ac.darkPurple : COLORS.ac.darkPurple,
                  opacity: !isPrivate ? 1 : 0.5,
                }}
              >
                공개
              </span>
            </button>

            {/* 비공개 버튼 */}
            <button onClick={() => setIsPrivate(true)} className="flex items-center gap-[0.63cqw] group">
              <div
                className={`w-[2.08cqw] h-[2.08cqw] rounded-full border-[0.16cqw] flex items-center justify-center transition-colors ${
                  isPrivate ? 'bg-[#744990] border-[#744990]' : 'bg-white border-[#744990]'
                }`}
                style={{
                  backgroundColor: isPrivate ? COLORS.ac.darkPurple : 'white',
                  borderColor: COLORS.ac.darkPurple,
                }}
              >
                {isPrivate && <div className="w-[0.83cqw] h-[0.83cqw] bg-white rounded-full" />}
              </div>
              <span
                className={`text-[1.88cqw] font-bold pt-[0.09cqh] ${isPrivate ? 'text-[#744990]' : 'text-[#744990]/50'}`}
                style={{
                  color: isPrivate ? COLORS.ac.darkPurple : COLORS.ac.darkPurple,
                  opacity: isPrivate ? 1 : 0.5,
                }}
              >
                비공개
              </span>
            </button>
          </div>
        </div>

        {/* 5. 비밀번호 (비공개일 때만, 인풋박스만 표시) */}
        {/* Indent: 397px = 20.68cqw */}
        <div
          className={`flex items-center mt-[1.85cqh] transition-opacity ${
            isPrivate ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ paddingLeft: '20.68cqw' }}
        >
          {/* Input W 600px = 31.25cqw, H 72px = 6.67cqh */}
          <div className="relative w-[31.25cqw]">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!isPrivate}
              placeholder="비밀번호"
              className="w-full h-[6.67cqh] px-[1.25cqw] rounded-[1.04cqw] bg-white text-[1.67cqw] font-bold outline-none placeholder:text-gray-300 shadow-inner"
              style={{ color: COLORS.ac.darkPurple }}
            />
            {/* Lock Icon inside input on right */}
            <div
              className="absolute right-[1.04cqw] top-1/2 -translate-y-1/2 w-[1.88cqw] h-[1.88cqw]"
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
                opacity: 0.5,
              }}
            />
          </div>
        </div>

        {/* 하단 버튼 (뒤로가기 / 섬만들기) - 300x100px (15.63cqw x 9.26cqh), 40px gap (2.08cqw) */}
        <div className="absolute bottom-[8.4cqh] left-0 w-full flex justify-center items-center gap-[2.08cqw]">
          <button
            onClick={onClose}
            className="w-[15.63cqw] h-[9.26cqh] rounded-[2.6cqw] bg-[#9984A0] text-white text-[2.08cqw] font-black hover:brightness-105 active:scale-95 transition-all leading-none pt-[0.09cqh] flex items-center justify-center gap-[0.42cqw]"
          >
            <div
              className="w-[2.08cqw] h-[2.5cqh]"
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
            onClick={() => {
              if (canSubmit) {
                onCreate({ title, maxPlayers, totalRounds, isPrivate, password: isPrivate ? password : null });
              }
            }}
            disabled={!canSubmit}
            className={`w-[15.63cqw] h-[9.26cqh] rounded-[2.6cqw] text-[2.08cqw] font-black transition-all text-center leading-none pt-[0.09cqh] shadow-xl active:scale-95 ${
              canSubmit
                ? 'bg-[#744990] text-white hover:brightness-110'
                : 'bg-[#E0E0E0] text-[#BDBDBD] cursor-not-allowed'
            }`}
            style={{ backgroundColor: canSubmit ? COLORS.ac.darkPurple : '#E0E0E0' }}
          >
            섬만들기
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// [MODAL 2: Join Island]
// --------------------------------------------------------------------------------------
function JoinIslandModal({ room, initialPlayers, onClose, onConfirm }) {
  // room.title (섬 제목), room.hostNickname (방장 닉네임), room.totalRounds, room.isPrivate 등 사용 가능
  // initialPlayers: [{nickname, characterId}, ...]

  const [password, setPassword] = useState('');

  // 방장 정보 (첫 번째 플레이어가 방장이라고 가정, 혹은 room.hostNickname과 일치하는 플레이어 찾기)
  // 여기서는 단순히 room.hostNickname 사용 + 첫번째 플레이어 아바타 사용 (fallback)
  const hostPlayer = initialPlayers.find((p) => p.nickname === room.hostNickname) || initialPlayers[0];
  const hostCharInfo = hostPlayer?.characterId ? CHARACTER_BY_ID.get(Number(hostPlayer.characterId)) : null;
  const hostImgSrc = hostCharInfo?.roomListImage || hostCharInfo?.selectBasicImage;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-[0.83cqw] backdrop-blur-md"
      onMouseDown={onClose}
    >
      {/* 
          Modal Spec from Image 1:
          W: 1132px -> 58.96cqw
          H: 985px -> 91.2cqh
          Padding Top: 104px -> 9.63cqh 
      */}
      <div
        className="w-[58.96cqw] h-[91.2cqh] flex flex-col items-center shadow-none relative"
        style={{
          backgroundImage: "url('/images/roomlist/ui-roomlist-modal-1.webp')", // Same cloud background
          backgroundSize: '100% 100%',
          backgroundColor: 'transparent',
          paddingTop: '9.63cqh',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Title: "섬제목...에 입장하시겠습니까?" - Font 56px = 2.92cqw */}
        <div className="w-full text-center px-[2.08cqw] mb-[5.56cqh]">
          <h2 className="text-[2.92cqw] font-black leading-tight" style={{ color: COLORS.ac.darkPurple }}>
            <span
              style={{ color: COLORS.ac.purple }}
              className="underline-none decoration-[0.21cqw] underline-offset-[0.42cqw]"
            >
              {room.title.length > 10 ? room.title.slice(0, 10) + '..' : room.title}
            </span>
            에<br />
            입장하시겠습니까?
          </h2>
        </div>

        {/* White Content Box */}
        {/* W: 799px -> 41.61cqw, H: 436px -> 40.37cqh, Radius: 60px -> 3.13cqw */}
        <div
          className="bg-white flex flex-col items-start justify-center shadow-md relative"
          style={{
            width: '41.61cqw',
            height: '40.37cqh',
            borderRadius: '3.13cqw',
            paddingLeft: '3.75cqw', // Approx alignment based on image visual
          }}
        >
          {/* Row 1: Host Info -- Gap 148px(7.71cqw) from Label to Value */}
          <div className="flex items-center mb-[2.22cqh]">
            {/* Label Icon */}
            <div
              className="w-[1.88cqw] h-[1.88cqw]"
              style={{
                backgroundColor: COLORS.ac.darkPurple,
                maskImage: `url("/images/roomlist/icon-leaf.webp")`,
                WebkitMaskImage: `url("/images/roomlist/icon-leaf.webp")`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
              }}
            />
            <span className="text-[1.88cqw] font-bold ml-[0.63cqw]" style={{ color: COLORS.ac.darkPurple }}>
              방장
            </span>

            <div style={{ width: '7.71cqw' }} />

            {/* Value: Avatar + Nickname */}
            <div className="flex items-center gap-[0.83cqw]">
              {/* Avatar 80px = 4.17cqw */}
              <div className="w-[4.17cqw] h-[4.17cqw] rounded-full overflow-hidden bg-[#EAD8F9] flex items-center justify-center">
                {hostImgSrc && <img src={hostImgSrc} alt="host" className="w-[80%] h-[80%] object-contain" />}
              </div>
              <span className="text-[1.88cqw] font-bold" style={{ color: COLORS.ac.darkPurple }}>
                {room.hostNickname}
              </span>
            </div>
          </div>

          {/* Row 2: Rounds -- Gap 72px(3.75cqw) */}
          <div className="flex items-center mb-[2.22cqh]">
            <div
              className="w-[1.88cqw] h-[1.88cqw] bg-[#8B5E83]"
              style={{
                backgroundColor: COLORS.ac.darkPurple,
                maskImage: `url("/images/room-waiting/icon-dice-${room.totalRounds}.png")`,
                WebkitMaskImage: `url("/images/room-waiting/icon-dice-${room.totalRounds}.png")`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
              }}
            />
            <span className="text-[1.88cqw] font-bold ml-[0.63cqw]" style={{ color: COLORS.ac.darkPurple }}>
              라운드 수
            </span>

            <div style={{ width: '3.75cqw' }} />

            <span className="text-[1.88cqw] font-bold" style={{ color: COLORS.ac.darkPurple }}>
              {room.totalRounds} 라운드
            </span>
          </div>

          {/* Row 3: Participants -- Gap 72px(3.75cqw) */}
          <div className="flex items-center">
            <div
              className="w-[1.88cqw] h-[1.88cqw]"
              style={{
                backgroundColor: COLORS.ac.darkPurple,
                maskImage: `url("/images/roomlist/icon-people.svg")`,
                WebkitMaskImage: `url("/images/roomlist/icon-people.svg")`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
              }}
            />
            <span className="text-[1.88cqw] font-bold ml-[0.63cqw]" style={{ color: COLORS.ac.darkPurple }}>
              참여 주민
            </span>

            <div style={{ width: '3.75cqw' }} />

            <div className="flex gap-[0.63cqw]">
              {Array.from({ length: room.maxPlayers }).map((_, i) => {
                const p = initialPlayers[i];
                const charInfo = p?.characterId ? CHARACTER_BY_ID.get(Number(p.characterId)) : null;
                const imgSrc = charInfo?.roomListImage || charInfo?.selectBasicImage;

                return (
                  <div
                    key={i}
                    className={`w-[4.17cqw] h-[4.17cqw] rounded-full overflow-hidden flex items-center justify-center ${
                      imgSrc ? 'bg-[#EAD8F9]' : 'bg-[#D9D9D9]'
                    }`}
                  >
                    {imgSrc && <img src={imgSrc} alt="p" className="w-[80%] h-[80%] object-contain" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Password Input Overlay (if private) */}
          {room.isPrivate && (
            <div className="absolute bottom-[1.48cqh] left-0 w-full flex justify-center">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-[20.83cqw] h-[5.56cqh] rounded-[1.04cqw] px-[1.04cqw] text-[1.46cqw] font-bold text-center border-[0.16cqw] border-[#8b5a2b] shadow-inner outline-none"
              />
            </div>
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="absolute bottom-[8.4cqh] left-0 w-full flex justify-center items-center gap-[2.08cqw]">
          <button
            onClick={onClose}
            className="w-[15.63cqw] h-[9.26cqh] rounded-[2.6cqw] bg-[#9984A0] text-white text-[2.08cqw] font-black hover:brightness-105 active:scale-95 transition-all leading-none pt-[0.09cqh] flex items-center justify-center gap-[0.42cqw]"
          >
            <div
              className="w-[2.08cqw] h-[2.5cqh]"
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
            onClick={() => onConfirm(password)}
            className="w-[15.63cqw] h-[9.26cqh] rounded-[2.6cqw] text-[2.08cqw] font-black text-white hover:brightness-110 active:scale-95 transition-all shadow-xl leading-none pt-[0.09cqh]"
            style={{ backgroundColor: COLORS.ac.darkPurple }}
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
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-[0.83cqw] backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-[2.08cqw] p-[2.08cqw] shadow-2xl w-[41.67cqw] flex flex-col items-center animate-in fade-in zoom-in-95"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-[2.5cqw] font-black mb-[1.85cqh]" style={{ color: COLORS.roomList.textMain }}>
          섬 검색
        </h2>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="방 제목을 검색해봐!"
          className="w-full h-[7.41cqh] px-[1.25cqw] rounded-[1.04cqw] bg-gray-100 text-[1.67cqw] font-bold outline-none mb-[1.85cqh]"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch(val);
          }}
        />
        <div className="flex gap-[0.83cqw] w-full">
          <button
            onClick={onClose}
            className="flex-1 h-[6.48cqh] rounded-[1.25cqw] bg-gray-300 text-white text-[1.46cqw] font-bold hover:brightness-105"
          >
            취소
          </button>
          <button
            onClick={() => onSearch(val)}
            className="flex-1 h-[6.48cqh] rounded-[1.25cqw] text-white text-[1.46cqw] font-bold hover:brightness-105"
            style={{ backgroundColor: COLORS.roomList.btnMain }}
          >
            검색
          </button>
        </div>
      </div>
    </div>
  );
}
