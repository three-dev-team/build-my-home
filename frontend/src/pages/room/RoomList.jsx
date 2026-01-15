// frontend/src/pages/room/RoomList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";

import { CHARACTERS } from "../../constants/characters.js";

const API_BASE = ""; // Vite proxy 쓰면 "" 유지

const WS_APP_PREFIX = "/app/roomlist/rooms";
const WS_TOPIC_ROOMS = "/topic/roomlist/rooms";

const CHARACTER_BY_ID = new Map(CHARACTERS.map((c) => [Number(c.id), c]));

// ✅ 너가 원한 "캐릭터 선택 → 동물 이모지" 매핑
const EMOJI_BY_CHARACTER_ID = {
    1: "🐹", // 애플
    2: "🐱", // 빙티
    3: "🐻", // 메이플
    4: "🐰", // 미첼
};

// 공통 톤(동숲 느낌)
const TONE = {
    brownText: "text-[#4b3a2e]",
    brownText2: "text-[#6a5342]",
    label: "text-[#7a5c44]",
    cardBg: "bg-[#f7f0e4]",
    innerBg: "bg-[#fff8ea]",
    border: "border-[#d6b98a]",
    borderSoft: "border-[#ead7b8]",
    chipBg: "bg-[#efe2c8]",
    greenBtn: "bg-[#7bb46b] hover:bg-[#6aa65a] border-[#5a8f4e]",
};

export default function RoomList() {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    // ✅ 입장 모달
    const [joinOpen, setJoinOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);

    // ✅ 전환(입장/생성) 로딩 오버레이
    const [transitioning, setTransitioning] = useState(false);

    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    const stompRef = useRef(null);

    // ✅ create 요청 식별자(ROOM_CREATED 이벤트 매칭용)
    const pendingCreateIdRef = useRef(null);
    const transitionTimerRef = useRef(null);

    // ✅ 리스트에서 "참여 주민 이모지" 보여주기 위해, roomId -> players[] 캐시
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

        // 안전장치: 이벤트 못 받아도 6초 지나면 로딩 해제
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
        title: r.title ?? "",
        currentPlayers: r.currentPlayers ?? 0,
        maxPlayers: r.maxPlayers ?? 0,
        totalRounds: r.totalRounds ?? 0,
        status: r.status ?? "WAITING",
        joinable: r.joinable ?? true,
        hostNickname: r.hostNickname ?? "",
        createdAt: r.createdAt ?? null,
    });

    const authHeaders = () => {
        const token = sessionStorage.getItem("token");
        return token
            ? {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            }
            : { "Content-Type": "application/json" };
    };

    // ✅ REST: @RequestMapping("/api/roomlists") 고정이므로 여기 경로도 맞춤
    const refreshRooms = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/roomlists/rooms`, {
                method: "GET",
                headers: authHeaders(),
            });

            if (!res.ok) throw new Error(`섬 목록 조회 실패 (${res.status})`);

            const data = await res.json();
            const normalized = Array.isArray(data) ? data.map(normalizeRoom) : [];
            setRooms(normalized);
        } catch (e) {
            showToast(e?.message || "섬 목록을 불러오지 못했어.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshRooms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ 방별 players 프리패치(리스트에서 참여 주민 이모지 표시용)
    useEffect(() => {
        if (!rooms || rooms.length === 0) return;

        const currentMap = roomPlayersMapRef.current;
        const ids = rooms.map((r) => r?.id).filter(Boolean);

        // 이미 캐시된 건 제외
        const missing = ids.filter((id) => currentMap[id] === undefined);
        if (missing.length === 0) return;

        const ac = new AbortController();

        const fetchRoomPlayers = async (roomId) => {
            // /players 엔드포인트가 인증 필요한 경우가 많아서 Authorization 붙임
            const res = await fetch(`${API_BASE}/api/rooms/${roomId}/players`, {
                method: "GET",
                headers: authHeaders(),
                signal: ac.signal,
            });
            if (!res.ok) throw new Error(`players fetch fail ${res.status}`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        };

        (async () => {
            const results = await Promise.allSettled(
                missing.map(async (id) => [id, await fetchRoomPlayers(id)])
            );

            if (ac.signal.aborted) return;

            setRoomPlayersMap((prev) => {
                const next = { ...prev };
                for (const r of results) {
                    if (r.status === "fulfilled") {
                        const [id, players] = r.value;
                        next[id] = players;
                    }
                }
                return next;
            });
        })();

        return () => ac.abort();
        // rooms가 바뀔 때만 (WS 스냅샷도 rooms 바꾸니 자동 대응)
    }, [rooms]);

    // WS 연결: RoomsSnapshot / Error / RoomCreatedEvent 받기
    useEffect(() => {
        const token = sessionStorage.getItem("token");
        const wsProto = window.location.protocol === "https:" ? "wss" : "ws";
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

                    // ✅ 섬 목록 스냅샷
                    if (payload?.type === "ROOMS_SNAPSHOT") {
                        const list = Array.isArray(payload.rooms) ? payload.rooms : [];
                        setRooms(list.map(normalizeRoom));
                        return;
                    }

                    // ✅ 섬 생성 완료 이벤트(요청한 사람만 clientRequestId로 매칭)
                    if (payload?.type === "ROOM_CREATED") {
                        const reqId = pendingCreateIdRef.current;
                        if (reqId && payload?.clientRequestId === reqId && payload?.roomId) {
                            pendingCreateIdRef.current = null;
                            endTransition();
                            setCreateOpen(false);
                            navigate(`/rooms/${payload.roomId}/select`);
                        }
                        return;
                    }

                    // ✅ 에러
                    if (payload?.type === "ERROR") {
                        endTransition();
                        pendingCreateIdRef.current = null;
                        showToast(payload?.message || "요청 처리 중 오류가 발생했어.");
                        return;
                    }
                } catch {
                    // ignore
                }
            });
        };

        client.onStompError = () => {
            endTransition();
            showToast("WS 연결 오류가 발생했어.");
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    const publish = (destination, bodyObj) => {
        const client = stompRef.current;
        if (!client || !client.connected) {
            showToast("서버 연결 중이야. 잠깐만!");
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

    // ✅ 입장 모달에서 "참여하기" 눌렀을 때: 로딩 -> join publish -> CharacterSelect로 이동
    const confirmJoin = () => {
        if (!selectedRoom) return;

        const isFull = selectedRoom.currentPlayers >= selectedRoom.maxPlayers;
        if (isFull || !selectedRoom.joinable) {
            showToast("입장할 수 없는 섬이야.");
            setJoinOpen(false);
            return;
        }

        startTransition();

        const ok = publish(`${WS_APP_PREFIX}/join`, { roomId: selectedRoom.id });
        if (!ok) {
            endTransition();
            return;
        }

        setJoinOpen(false);
        navigate(`/rooms/${selectedRoom.id}/select`);
    };

    return (
        <div className="relative w-full min-h-screen overflow-hidden">
            {/* 배경(동숲 느낌: 하늘 -> 잔디 + 구름 블랍) */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#bfe8ff_0%,#e8f7ff_24%,#dff6d8_55%,#bfe9b6_100%)]" />
            <div className="absolute -top-24 -left-24 w-[520px] h-[320px] rounded-[999px] bg-white/55 blur-2xl" />
            <div className="absolute top-10 right-[-140px] w-[560px] h-[340px] rounded-[999px] bg-white/50 blur-2xl" />
            <div className="absolute bottom-[-120px] left-1/2 -translate-x-1/2 w-[820px] h-[420px] rounded-[999px] bg-white/20 blur-3xl" />
            <div className="absolute bottom-[-140px] -right-28 w-[520px] h-[520px] rounded-full bg-[#7bb46b]/25 blur-3xl" />

            {/* ✅ 전환 로딩 오버레이 */}
            {transitioning && (
                <div className="fixed inset-0 z-[9999] bg-black/35 flex items-center justify-center">
                    <div
                        className={[
                            "px-6 py-5 flex items-center gap-3",
                            TONE.cardBg,
                            "border-[3px] rounded-[22px] shadow-2xl",
                            TONE.border,
                        ].join(" ")}
                    >
                        <div className="w-5 h-5 rounded-full border-2 border-[#d6b98a] border-t-[#7bb46b] animate-spin" />
                        <div className={`font-black ${TONE.brownText}`}>이동 중...</div>
                    </div>
                </div>
            )}

            {/* 토스트 */}
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
                    <div
                        className={[
                            "px-5 py-3 rounded-full font-black shadow-lg",
                            TONE.cardBg,
                            "border-2",
                            TONE.border,
                            TONE.brownText,
                        ].join(" ")}
                    >
                        🍃 {toast}
                    </div>
                </div>
            )}

            {/* 상단 아이콘 영역 */}
            <div className="relative z-10 px-8 pt-6 flex items-start justify-between">
                {/* 홈 */}
                <button
                    className="group flex flex-col items-center gap-1"
                    onClick={() => navigate("/home")}
                    title="홈"
                >
                    <div
                        className={[
                            "w-12 h-12 rounded-full flex items-center justify-center",
                            TONE.cardBg,
                            "border-[3px] shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
                            TONE.border,
                            "group-hover:brightness-[0.98] transition",
                        ].join(" ")}
                    >
                        <span className="text-xl">🏠</span>
                    </div>
                    <div className={`text-xs font-extrabold ${TONE.brownText2}`}>홈</div>
                </button>

                {/* 우측 아이콘 */}
                <div className="flex items-start gap-4">
                    <button
                        className="group flex flex-col items-center gap-1"
                        onClick={() => navigate("/mypage")}
                        title="마이페이지"
                    >
                        <div
                            className={[
                                "w-12 h-12 rounded-full flex items-center justify-center",
                                TONE.cardBg,
                                "border-[3px] shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
                                TONE.border,
                                "group-hover:brightness-[0.98] transition",
                            ].join(" ")}
                        >
                            <span className="text-xl">👤</span>
                        </div>
                        <div className={`text-xs font-extrabold ${TONE.brownText2}`}>마이페이지</div>
                    </button>

                    <button className="group flex flex-col items-center gap-1" title="알림">
                        <div
                            className={[
                                "w-12 h-12 rounded-full flex items-center justify-center",
                                TONE.cardBg,
                                "border-[3px] shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
                                TONE.border,
                                "group-hover:brightness-[0.98] transition",
                            ].join(" ")}
                        >
                            <span className="text-xl">🔔</span>
                        </div>
                        <div className={`text-xs font-extrabold ${TONE.brownText2}`}>알림</div>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen((v) => !v)}
                            className="group flex flex-col items-center gap-1"
                            title="설정"
                        >
                            <div
                                className={[
                                    "w-12 h-12 rounded-full flex items-center justify-center",
                                    TONE.cardBg,
                                    "border-[3px] shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
                                    TONE.border,
                                    "group-hover:brightness-[0.98] transition",
                                ].join(" ")}
                            >
                                <span className="text-xl">⚙️</span>
                            </div>
                            <div className={`text-xs font-extrabold ${TONE.brownText2}`}>설정</div>
                        </button>

                        {menuOpen && (
                            <div
                                className={[
                                    "absolute right-0 mt-3 w-52 overflow-hidden",
                                    TONE.cardBg,
                                    "border-[3px] rounded-2xl shadow-2xl",
                                    TONE.border,
                                ].join(" ")}
                                onMouseLeave={() => setMenuOpen(false)}
                            >
                                <button
                                    className={`w-full text-left px-4 py-3 hover:bg-[#efe2c8] font-black ${TONE.brownText}`}
                                    onClick={() => navigate("/mypage")}
                                >
                                    마이페이지
                                </button>
                                <button
                                    className={`w-full text-left px-4 py-3 hover:bg-[#efe2c8] font-black ${TONE.brownText}`}
                                    onClick={() => navigate("/login")}
                                >
                                    로그아웃
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 중앙 패널 */}
            <div className="relative z-10 px-6 pb-10">
                <div className="max-w-5xl mx-auto mt-6 flex justify-center">
                    <div
                        className={[
                            "w-full max-w-4xl rounded-[44px] px-8 py-7",
                            TONE.cardBg,
                            "border-[5px] shadow-[0_30px_80px_rgba(0,0,0,0.18)]",
                            TONE.border,
                        ].join(" ")}
                    >
                        {/* 제목 */}
                        <div className="flex items-center justify-between">
                            <div className="w-12" />
                            <h1 className={`text-center text-[28px] sm:text-[32px] font-black tracking-tight ${TONE.brownText}`}>
                                🍃 발견한 섬 리스트 🍃
                            </h1>
                            <button
                                onClick={refreshRooms}
                                className={[
                                    "w-12 h-12 rounded-full flex items-center justify-center",
                                    TONE.chipBg,
                                    "border-2 shadow-[0_10px_24px_rgba(0,0,0,0.10)]",
                                    "border-[#e2cfae] hover:bg-[#e9d7b5] transition",
                                ].join(" ")}
                                title="새로고침"
                                disabled={loading}
                            >
                                <span className={loading ? "text-xl animate-spin" : "text-xl"}>🔄</span>
                            </button>
                        </div>

                        {/* 리스트 컨테이너 */}
                        <div className="mt-6">
                            <div
                                className={[
                                    "rounded-[28px] p-4",
                                    TONE.innerBg,
                                    "border-[3px] shadow-[0_18px_40px_rgba(0,0,0,0.10)]",
                                    TONE.borderSoft,
                                ].join(" ")}
                            >
                                <div className="flex items-center justify-between px-2 pb-3">
                                    <div className={`text-sm font-extrabold ${TONE.brownText2}`}>
                                        {loading ? "목록 불러오는 중..." : `총 ${sortedRooms.length}개`}
                                    </div>
                                    <div className={`text-xs font-bold ${TONE.label}`}>스크롤해서 더 보기</div>
                                </div>

                                <div className="max-h-[420px] overflow-y-auto pr-1">
                                    <div className="flex flex-col gap-3">
                                        {sortedRooms.map((room) => {
                                            const isFull = room.currentPlayers >= room.maxPlayers;
                                            const disabled = isFull || !room.joinable;

                                            const btnText = room.status === "PLAYING" ? "진행중" : isFull ? "마감" : "입장";
                                            const lockIcon = "🔓"; // (현재 백엔드에 공개/비공개 값이 없어서 UI만 유지)

                                            const playersPreview = roomPlayersMap[room.id] || [];

                                            return (
                                                <div
                                                    key={room.id}
                                                    className={[
                                                        "rounded-[22px] px-4 py-4 flex items-center gap-4",
                                                        "border-[3px] shadow-[0_14px_26px_rgba(0,0,0,0.10)]",
                                                        disabled ? "bg-[#f2e6cf] border-[#e2cfae] opacity-70" : `${TONE.innerBg} ${TONE.borderSoft}`,
                                                    ].join(" ")}
                                                >
                                                    {/* 공개/비공개(아이콘만) */}
                                                    <div className="w-12 flex flex-col items-center justify-center">
                                                        <div className={disabled ? "text-[#6a5342]/60" : "text-[#6a5342]"}>{lockIcon}</div>
                                                        <div className={disabled ? "text-[10px] font-bold text-[#6a5342]/50" : "text-[10px] font-bold text-[#6a5342]/80"}>
                                                            공개
                                                        </div>
                                                    </div>

                                                    {/* 제목/정보 */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className={disabled ? `font-black ${TONE.brownText} truncate opacity-70` : `font-black ${TONE.brownText} truncate`}>
                                                                {room.title || "이름 없는 섬"}
                                                            </div>
                                                            <div className={`flex items-center gap-1 text-xs font-extrabold ${TONE.label}`}>
                                                                <span>🎲</span>
                                                                <span>{room.totalRounds ? `${room.totalRounds}판` : "-"}</span>
                                                            </div>
                                                        </div>

                                                        <div className={`mt-1 flex items-center gap-3 text-xs font-extrabold ${TONE.brownText2}`}>
                                                            <span>{room.hostNickname ? `섬장 ${room.hostNickname}` : "섬장 -"}</span>
                                                            <span className="opacity-60">·</span>
                                                            <span>
                                {room.currentPlayers}/{room.maxPlayers}
                              </span>
                                                        </div>
                                                    </div>

                                                    {/* ✅ 리스트에도 참여 주민 캐릭터(이모지) 표시 */}
                                                    <RoomCharacterPreview
                                                        players={playersPreview}
                                                        maxSlots={Math.min(room.maxPlayers || 0, 4)}
                                                        currentPlayers={room.currentPlayers}
                                                        disabled={disabled}
                                                    />

                                                    {/* 입장 버튼 */}
                                                    <button
                                                        disabled={disabled || room.status === "PLAYING"}
                                                        onClick={() => openJoinModal(room)}
                                                        className={[
                                                            "shrink-0 px-5 py-2 rounded-full font-black",
                                                            "border-2 shadow-[0_10px_18px_rgba(0,0,0,0.10)] transition",
                                                            disabled || room.status === "PLAYING"
                                                                ? "bg-[#efe2c8] text-[#6a5342]/60 border-[#e2cfae] cursor-not-allowed"
                                                                : "bg-[#7bb46b] hover:bg-[#6aa65a] text-white border-[#5a8f4e]",
                                                        ].join(" ")}
                                                        title={disabled ? "입장 불가" : "입장"}
                                                    >
                                                        {btnText}
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {sortedRooms.length === 0 && (
                                            <div className={`text-center ${TONE.brownText2} font-extrabold py-16`}>
                                                아직 발견된 섬이 없어.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 하단 버튼 */}
                        <div className="mt-6 flex items-center justify-center">
                            <button
                                onClick={() => setCreateOpen(true)}
                                className={[
                                    "px-10 py-3 rounded-full font-black",
                                    "border-2 shadow-[0_12px_20px_rgba(0,0,0,0.12)] transition",
                                    "bg-[#efe2c8] hover:bg-[#e9d7b5] text-[#4b3a2e] border-[#e2cfae]",
                                ].join(" ")}
                            >
                                섬 만들기
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ 섬 만들기 모달 */}
            {createOpen && (
                <CreateIslandModal
                    onClose={() => setCreateOpen(false)}
                    onCreate={(payload) => {
                        const reqId =
                            (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
                            `${Date.now()}-${Math.random().toString(16).slice(2)}`;

                        pendingCreateIdRef.current = reqId;

                        startTransition();

                        const ok = publish(`${WS_APP_PREFIX}/create`, {
                            ...payload,
                            clientRequestId: reqId,
                        });

                        if (!ok) {
                            pendingCreateIdRef.current = null;
                            endTransition();
                            return;
                        }

                        setCreateOpen(false);
                    }}
                />
            )}

            {/* ✅ 섬 입장 모달 */}
            {joinOpen && selectedRoom && (
                <JoinIslandModal
                    room={selectedRoom}
                    initialPlayers={roomPlayersMap[selectedRoom.id] || []}
                    onClose={() => setJoinOpen(false)}
                    onConfirm={confirmJoin}
                    authHeaders={authHeaders}
                />
            )}
        </div>
    );
}

/** ✅ 리스트에서 참여 주민 캐릭터(이모지) 미리보기 */
function RoomCharacterPreview({ players, maxSlots, currentPlayers, disabled }) {
    const list = Array.isArray(players) ? players : [];
    const slots = Math.max(0, maxSlots || 0);
    const filled = list.slice(0, slots);

    if (slots <= 0) return <div className="w-[120px]" />;

    return (
        <div className="w-[120px] flex items-center justify-end">
            <div className="flex -space-x-2">
                {Array.from({ length: slots }).map((_, idx) => {
                    const p = filled[idx];
                    const emoji = p?.characterId ? EMOJI_BY_CHARACTER_ID[Number(p.characterId)] : null;

                    const isOccupied = idx < Math.min(currentPlayers || 0, slots);
                    const hasPlayer = !!p;

                    return (
                        <div
                            key={idx}
                            className={[
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                "border-[3px] shadow-[0_10px_18px_rgba(0,0,0,0.08)]",
                                disabled
                                    ? "bg-[#efe2c8] border-[#e2cfae] text-[#6a5342]/50"
                                    : hasPlayer
                                        ? "bg-[#f2e6cf] border-[#d9c2a0] text-[#4b3a2e]"
                                        : "bg-[#fff8ea] border-[#ead7b8] text-[#6a5342]/50",
                            ].join(" ")}
                            title={
                                hasPlayer
                                    ? emoji
                                        ? `선택됨 ${emoji}`
                                        : "캐릭터 미선택"
                                    : isOccupied
                                        ? "참여 중(정보 없음)"
                                        : "빈 자리"
                            }
                        >
                            {hasPlayer ? <span className="text-lg">{emoji || "❔"}</span> : <span className="text-base opacity-50">·</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** 섬 만들기 모달 */
function CreateIslandModal({ onClose, onCreate }) {
    const [title, setTitle] = useState("");
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [totalRounds, setTotalRounds] = useState(10);

    // UI만(백엔드에 필드 없음 → payload에는 포함하지 않음)
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState("");

    const canSubmit = title.trim().length >= 1 && [2, 3, 4].includes(maxPlayers);

    return (
        <div className="fixed inset-0 bg-black/35 flex items-center justify-center px-6 z-50" onMouseDown={onClose}>
            <div
                className={[
                    "w-full max-w-xl rounded-[44px] shadow-[0_30px_80px_rgba(0,0,0,0.35)] p-8",
                    "bg-[#f7f0e4] border-[5px] border-[#d6b98a]",
                ].join(" ")}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#efe2c8] border border-[#e2cfae]">
                        <span className="text-lg">🪵</span>
                        <span className="text-[#5b4636] font-black">섬 만들기</span>
                        <span className="text-lg">🪵</span>
                    </div>
                </div>

                <div className="mt-6 bg-[#fff8ea] border-[3px] border-[#ead7b8] rounded-[26px] p-6">
                    {/* 섬 제목 */}
                    <div className="flex items-center gap-4">
                        <div className="w-24 text-sm font-black text-[#7a5c44]">섬 제목</div>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="섬 제목을 입력해줘"
                            maxLength={20}
                            className="flex-1 px-4 py-3 rounded-[14px] bg-[#f2e6cf] border-2 border-[#e2cfae] outline-none text-[#4b3a2e] placeholder:text-[#6a5342]/70"
                        />
                    </div>

                    {/* 인원수 */}
                    <div className="mt-5 flex items-center gap-4">
                        <div className="w-24 text-sm font-black text-[#7a5c44]">인원수</div>
                        <div className="flex items-center gap-3">
                            {[2, 3, 4].map((v) => (
                                <Chip key={v} active={maxPlayers === v} onClick={() => setMaxPlayers(v)}>
                                    {v}명
                                </Chip>
                            ))}
                        </div>
                    </div>

                    {/* 판수 */}
                    <div className="mt-5 flex items-center gap-4">
                        <div className="w-24 text-sm font-black text-[#7a5c44]">판수</div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {[5, 10, 15, 20].map((v) => (
                                <Chip key={v} active={totalRounds === v} onClick={() => setTotalRounds(v)}>
                                    {v}판
                                </Chip>
                            ))}
                        </div>
                    </div>

                    {/* 공개 설정 (UI만) */}
                    <div className="mt-5 flex items-center gap-4">
                        <div className="w-24 text-sm font-black text-[#7a5c44]">공개 설정</div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <Chip active={!isPrivate} onClick={() => setIsPrivate(false)}>
                                공개
                            </Chip>
                            <Chip active={isPrivate} onClick={() => setIsPrivate(true)}>
                                비공개 🔒
                            </Chip>
                            <span className="text-xs font-extrabold text-[#8a6e57]">(비공개/비밀번호 기능은 UI만 먼저)</span>
                        </div>
                    </div>

                    {/* 비밀번호 (UI만) */}
                    <div className="mt-4 flex items-center gap-4">
                        <div className="w-24 text-sm font-black text-[#7a5c44]">비밀번호</div>
                        <div className="flex-1 relative">
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={isPrivate ? "비밀번호" : "공개 섬은 비밀번호가 필요 없어요"}
                                disabled={!isPrivate}
                                className={[
                                    "w-full px-4 py-3 rounded-[14px] border-2 outline-none",
                                    "bg-[#f2e6cf] border-[#e2cfae] text-[#4b3a2e] placeholder:text-[#6a5342]/70",
                                    !isPrivate ? "opacity-60 cursor-not-allowed" : "",
                                ].join(" ")}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6a5342]">🔒</div>
                        </div>
                    </div>
                </div>

                <div className="mt-7 flex items-center justify-center gap-6">
                    <button
                        onClick={onClose}
                        className="px-9 py-3 rounded-full bg-[#efe2c8] hover:bg-[#e9d7b5] text-[#4b3a2e] font-black border-2 border-[#e2cfae]"
                    >
                        취소
                    </button>
                    <button
                        onClick={() =>
                            onCreate({
                                title: title.trim(),
                                maxPlayers,
                                totalRounds,
                            })
                        }
                        disabled={!canSubmit}
                        className={[
                            "px-9 py-3 rounded-full font-black border-2 shadow-[0_10px_18px_rgba(0,0,0,0.12)]",
                            "disabled:opacity-45 disabled:cursor-not-allowed transition",
                            "bg-[#7bb46b] hover:bg-[#6aa65a] text-white border-[#5a8f4e]",
                        ].join(" ")}
                    >
                        생성
                    </button>
                </div>
            </div>
        </div>
    );
}

function Chip({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "px-4 py-2 rounded-full font-black text-sm border-2 transition",
                active
                    ? "bg-[#7bb46b] text-white border-[#5a8f4e]"
                    : "bg-[#efe2c8] text-[#4b3a2e] border-[#e2cfae] hover:bg-[#e9d7b5]",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

/** 섬 입장 모달 */
function JoinIslandModal({ room, initialPlayers, onClose, onConfirm, authHeaders }) {
    const statusText = room.status === "PLAYING" ? "진행중" : "대기중";

    const [players, setPlayers] = useState(Array.isArray(initialPlayers) ? initialPlayers : []);
    const [playersLoading, setPlayersLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        const ac = new AbortController();

        const fetchPlayers = async () => {
            if (!room?.id) return;
            setPlayersLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/rooms/${room.id}/players`, {
                    method: "GET",
                    headers: authHeaders(),
                    signal: ac.signal,
                });

                // ✅ 여기서 401/403이면 "왜 안뜨지?"의 정답임 (토큰 헤더 필요)
                if (!res.ok) throw new Error(`players fetch fail (${res.status})`);

                const data = await res.json();
                if (ignore) return;
                setPlayers(Array.isArray(data) ? data : []);
            } catch {
                if (ignore) return;
                // 실패하면 initialPlayers라도 남기고 싶으면 여기에서 비우지 말고 유지해도 됨
            } finally {
                if (!ignore) setPlayersLoading(false);
            }
        };

        fetchPlayers();

        return () => {
            ignore = true;
            ac.abort();
        };
    }, [room?.id, authHeaders]);

    const maxSlots = Math.min(room.maxPlayers || 0, 4);
    const countText = `${players?.length || room.currentPlayers || 0}/${room.maxPlayers || 0}`;

    return (
        <div className="fixed inset-0 bg-black/35 flex items-center justify-center px-6 z-50" onMouseDown={onClose}>
            <div
                className={[
                    "w-full max-w-xl rounded-[40px] p-7",
                    "bg-[#f7f0e4]",
                    "border-[5px] border-[#d6b98a]",
                    "shadow-[0_28px_80px_rgba(0,0,0,0.35)]",
                ].join(" ")}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#efe2c8] border border-[#e2cfae]">
                        <span className="text-lg">🍃</span>
                        <span className="text-[#5b4636] font-black">입장 확인</span>
                        <span className="text-lg">🍃</span>
                    </div>
                    <div className="mt-4 text-[22px] font-black text-[#4b3a2e]">
                        {room.title || "이름 없는 섬"}에 입장하시겠습니까?
                    </div>
                </div>

                {/* 본문 카드 */}
                <div className="mt-6 bg-[#fff8ea] border-[3px] border-[#ead7b8] rounded-[26px] p-6">
                    <div className="grid grid-cols-[92px_1fr] gap-y-4 gap-x-3">
                        <div className="text-sm font-black text-[#7a5c44]">섬장</div>
                        <div className="font-extrabold text-[#4b3a2e]">{room.hostNickname || "-"}</div>

                        <div className="text-sm font-black text-[#7a5c44]">게임 판 수</div>
                        <div className="flex items-center gap-3 font-extrabold text-[#4b3a2e]">
                            <span className="text-lg">🎲</span>
                            <span>{room.totalRounds ? `${room.totalRounds}판` : "-"}</span>
                            <span className="text-[#8a6e57]">({statusText})</span>
                        </div>

                        <div className="text-sm font-black text-[#7a5c44]">참여 주민</div>
                        <div className="flex items-center gap-3">
                            <CharacterSlots players={players} maxSlots={maxSlots} loading={playersLoading} />
                            <div className="text-sm font-extrabold text-[#6a5342]">{countText}</div>
                        </div>
                    </div>

                    {playersLoading && (
                        <div className="mt-4 text-xs font-extrabold text-[#8a6e57]">주민 정보를 불러오는 중...</div>
                    )}
                </div>

                {/* 버튼 */}
                <div className="mt-7 flex items-center justify-center gap-6">
                    <button
                        onClick={onClose}
                        className={[
                            "px-9 py-3 rounded-full",
                            "bg-[#efe2c8] hover:bg-[#e9d7b5]",
                            "text-[#4b3a2e] font-black",
                            "border-2 border-[#e2cfae]",
                        ].join(" ")}
                    >
                        뒤로가기
                    </button>
                    <button
                        onClick={onConfirm}
                        className={[
                            "px-9 py-3 rounded-full",
                            "text-white font-black border-2",
                            TONE.greenBtn,
                            "shadow-[0_10px_18px_rgba(0,0,0,0.15)]",
                        ].join(" ")}
                    >
                        참여하기
                    </button>
                </div>
            </div>
        </div>
    );
}

function CharacterSlots({ players, maxSlots, loading }) {
    const list = Array.isArray(players) ? players : [];
    const slots = Math.max(0, maxSlots || 0);
    const filled = list.slice(0, slots);

    if (slots <= 0) return <div className="w-[88px]" />;

    return (
        <div className="flex items-center gap-2">
            {Array.from({ length: slots }).map((_, idx) => {
                const p = filled[idx];
                const characterId = p?.characterId ? Number(p.characterId) : null;
                const emoji = characterId ? EMOJI_BY_CHARACTER_ID[characterId] : null;
                const characterName = characterId ? (CHARACTER_BY_ID.get(characterId)?.name || "") : "";

                return (
                    <div
                        key={idx}
                        className={[
                            "w-12 h-12 rounded-full overflow-hidden",
                            "bg-[#f2e6cf]",
                            "border-[3px]",
                            p ? "border-[#d9c2a0]" : "border-[#ead7b8]",
                            "shadow-[0_8px_14px_rgba(0,0,0,0.10)]",
                            "flex items-center justify-center",
                        ].join(" ")}
                        title={
                            loading
                                ? "불러오는 중"
                                : p
                                    ? emoji
                                        ? `${characterName ? characterName + " " : ""}${emoji}`.trim()
                                        : "캐릭터 미선택"
                                    : "빈 자리"
                        }
                    >
                        {p ? (
                            <span className="text-2xl">{emoji || "❔"}</span>
                        ) : (
                            <span className="text-xl opacity-35">·</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
