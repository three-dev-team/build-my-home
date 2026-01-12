import React, {useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";

// import SockJS from "sockjs-client/dist/sockjs";
import {Client} from "@stomp/stompjs";

const API_BASE = ""; // Vite proxy 쓰면 "" 유지
// const WS_URL = "/ws"; // SockJS 엔드포인트

const WS_APP_PREFIX = "/app/roomlist/rooms";
const WS_TOPIC_ROOMS = "/topic/roomlist/rooms";

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

    // ✅ REST: @RequestMapping("/api/roomlists") 고정이므로 여기 경로도 맞춤
    const refreshRooms = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/roomlists/rooms`, {
                method: "GET",
                headers: {"Content-Type": "application/json"},
            });

            if (!res.ok) throw new Error(`방 목록 조회 실패 (${res.status})`);

            const data = await res.json();
            const normalized = Array.isArray(data) ? data.map(normalizeRoom) : [];
            setRooms(normalized);
        } catch (e) {
            showToast(e?.message || "방 목록을 불러오지 못했어.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshRooms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // WS 연결: RoomsSnapshot / Error / RoomCreatedEvent 받기
    useEffect(() => {
        const token = sessionStorage.getItem("token");

        const client = new Client({
            brokerURL: 'ws://localhost:5173/ws',
            // webSocketFactory: () => new SockJS(WS_URL),
            reconnectDelay: 3000,
            debug: () => {
            },
            connectHeaders: token ? {Authorization: `Bearer ${token}`} : {},
        });

        client.onConnect = () => {
            client.subscribe(WS_TOPIC_ROOMS, (message) => {
                try {
                    const payload = JSON.parse(message.body);

                    // ✅ 방 목록 스냅샷
                    if (payload?.type === "ROOMS_SNAPSHOT") {
                        const list = Array.isArray(payload.rooms) ? payload.rooms : [];
                        setRooms(list.map(normalizeRoom));
                        return;
                    }

                    // ✅ 방 생성 완료 이벤트(요청한 사람만 clientRequestId로 매칭)
                    if (payload?.type === "ROOM_CREATED") {
                        const reqId = pendingCreateIdRef.current;
                        if (reqId && payload?.clientRequestId === reqId && payload?.roomId) {
                            pendingCreateIdRef.current = null;
                            endTransition();
                            setCreateOpen(false);
                            navigate(`/rooms/${payload.roomId}/select`);
                            // navigate(`/character-select/${payload.roomId}`);
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

    // ✅ 입장 모달에서 "입장하기" 눌렀을 때: 로딩 -> join publish -> CharacterSelect로 이동
    const confirmJoin = () => {
        if (!selectedRoom) return;

        const isFull = selectedRoom.currentPlayers >= selectedRoom.maxPlayers;
        if (isFull || !selectedRoom.joinable) {
            showToast("입장할 수 없는 방이야.");
            setJoinOpen(false);
            return;
        }

        startTransition();

        const ok = publish(`${WS_APP_PREFIX}/join`, {roomId: selectedRoom.id});
        if (!ok) {
            endTransition();
            return;
        }

        setJoinOpen(false);
        navigate(`/rooms/${selectedRoom.id}/select`);
        // navigate(`/character-select/${selectedRoom.id}`);
    };

    return (
        <div className="w-full min-h-screen bg-[#f6f6f6]">
            {/* ✅ 전환 로딩 오버레이 */}
            {transitioning && (
                <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
                    <div className="bg-white rounded-[18px] px-6 py-5 shadow-2xl flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin"/>
                        <div className="font-black text-black/70">로딩 중...</div>
                    </div>
                </div>
            )}

            {/* 상단바 */}
            <div className="h-20 bg-white border-b border-black/10 flex items-center justify-between px-8">
                <div className="flex items-center gap-3">
                    <button
                        className="w-12 h-12 rounded-full bg-[#efe7d1] border-[3px] border-[#a67c52] shadow-md"
                        onClick={() => navigate("/")}
                        title="홈"
                    >
                        🏠
                    </button>
                </div>

                <div className="relative flex items-center gap-3">
                    <button
                        className="w-12 h-12 rounded-full bg-[#efe7d1] border-[3px] border-[#a67c52] shadow-md"
                        title="프로필"
                    >
                        👤
                    </button>
                    <button
                        className="w-12 h-12 rounded-full bg-[#efe7d1] border-[3px] border-[#a67c52] shadow-md"
                        title="알림"
                    >
                        🔔
                    </button>

                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="w-12 h-12 rounded-full bg-[#efe7d1] border-[3px] border-[#a67c52] shadow-md"
                        title="설정"
                    >
                        ⚙️
                    </button>

                    {menuOpen && (
                        <div
                            className="absolute right-0 top-14 w-44 bg-white border border-black/10 rounded-2xl shadow-xl overflow-hidden"
                            onMouseLeave={() => setMenuOpen(false)}
                        >
                            <button
                                className="w-full text-left px-4 py-3 hover:bg-black/5 font-bold text-[#5d4037]"
                                onClick={() => navigate("/mypage")}
                            >
                                마이페이지
                            </button>
                            <button
                                className="w-full text-left px-4 py-3 hover:bg-black/5 font-bold text-[#5d4037]"
                                onClick={() => navigate("/login")}
                            >
                                로그아웃
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 토스트 */}
            {toast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50">
                    <div className="px-5 py-3 rounded-full bg-black/80 text-white font-bold shadow-lg">
                        {toast}
                    </div>
                </div>
            )}

            {/* 본문 */}
            <div className="max-w-5xl mx-auto px-6 py-14">
                <div className="flex justify-center">
                    <div className="w-full max-w-2xl bg-[#d9d9d9] rounded-[24px] p-10 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <div className="font-black text-[#333]">게임방 목록</div>
                            <div className="text-sm font-extrabold text-[#f39c12]">
                                {loading ? "갱신 중..." : `총 ${sortedRooms.length}개`}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            {sortedRooms.map((room) => {
                                const isFull = room.currentPlayers >= room.maxPlayers;
                                const disabled = isFull || !room.joinable;
                                const statusText = room.status === "PLAYING" ? "게임중" : "대기중";

                                return (
                                    <div
                                        key={room.id}
                                        className="bg-white rounded-[16px] px-5 py-4 flex items-center justify-between shadow"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">👤</span>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-[#333]">{room.title}</span>
                                                    <span className="text-sm font-extrabold text-black/60">
                            ({room.currentPlayers}/{room.maxPlayers})
                          </span>
                                                </div>
                                                <div className="text-xs font-bold text-black/45">
                                                    {room.hostNickname ? `방장: ${room.hostNickname} · ` : ""}
                                                    {room.totalRounds ? `${room.totalRounds}판 · ` : ""}
                                                    {statusText}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                disabled={disabled}
                                                onClick={() => openJoinModal(room)}
                                                className={[
                                                    "px-4 py-2 rounded-[10px] font-black",
                                                    disabled
                                                        ? "bg-black/10 text-black/40 cursor-not-allowed"
                                                        : "bg-white border border-black/20 text-black/70 hover:bg-black/5",
                                                ].join(" ")}
                                            >
                                                {room.status === "PLAYING" ? "진행중" : isFull ? "만원" : "입장"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {sortedRooms.length === 0 && (
                                <div className="text-center text-black/40 font-bold py-10">
                                    현재 생성된 방이 없습니다.
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => setCreateOpen(true)}
                                className="px-8 py-3 rounded-[14px] bg-white border border-black/20 font-black hover:bg-black/5"
                            >
                                방 만들기
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ 방 만들기 모달 */}
            {createOpen && (
                <CreateRoomModal
                    onClose={() => setCreateOpen(false)}
                    onCreate={(payload) => {
                        // ✅ create는 roomId를 바로 못 받으니까: clientRequestId로 ROOM_CREATED 매칭해서 이동
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

                        // 모달은 일단 닫아도 되고(UX), 유지해도 되는데 여기선 닫아줄게
                        setCreateOpen(false);
                    }}
                />
            )}

            {/* ✅ 방 입장하기 모달 */}
            {joinOpen && selectedRoom && (
                <JoinRoomModal
                    room={selectedRoom}
                    onClose={() => setJoinOpen(false)}
                    onConfirm={confirmJoin}
                />
            )}
        </div>
    );
}

/** 방 만들기 모달 */
function CreateRoomModal({onClose, onCreate}) {
    const [title, setTitle] = useState("");
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [totalRounds, setTotalRounds] = useState(10);

    const canSubmit = title.trim().length >= 1 && [2, 3, 4].includes(maxPlayers);

    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50"
            onMouseDown={onClose}
        >
            <div
                className="w-full max-w-md bg-[#d9d9d9] rounded-[22px] shadow-2xl p-6"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="text-center text-2xl font-black mb-6">방 만들기</div>

                <div className="flex flex-col gap-4">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="방 제목"
                        maxLength={20}
                        className="w-full px-4 py-3 rounded-[12px] bg-white outline-none"
                    />

                    <div className="bg-white rounded-[12px] px-4 py-3">
                        <div className="text-sm font-black mb-2">인원수</div>
                        <div className="flex items-center gap-6 font-bold">
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="players"
                                    checked={maxPlayers === 2}
                                    onChange={() => setMaxPlayers(2)}
                                />
                                2
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="players"
                                    checked={maxPlayers === 3}
                                    onChange={() => setMaxPlayers(3)}
                                />
                                3
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="players"
                                    checked={maxPlayers === 4}
                                    onChange={() => setMaxPlayers(4)}
                                />
                                4
                            </label>
                        </div>
                    </div>

                    <div className="bg-white rounded-[12px] px-4 py-3">
                        <div className="text-sm font-black mb-2">판 수</div>
                        <div className="flex items-center gap-4 font-bold">
                            {[5, 10, 15, 20].map((v) => (
                                <label key={v} className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="rounds"
                                        checked={totalRounds === v}
                                        onChange={() => setTotalRounds(v)}
                                    />
                                    {v}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center gap-6 mt-2">
                        <button onClick={onClose} className="px-6 py-3 rounded-[14px] bg-white font-black">
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
                            className="px-6 py-3 rounded-[14px] bg-white font-black disabled:opacity-50"
                        >
                            생성
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** 방 입장하기 모달 */
function JoinRoomModal({room, onClose, onConfirm}) {
    const statusText = room.status === "PLAYING" ? "게임중" : "대기중";

    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50"
            onMouseDown={onClose}
        >
            <div
                className="w-full max-w-md bg-[#d9d9d9] rounded-[22px] shadow-2xl p-6"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="text-center font-black mb-4">
                    [ {room.title} ] 방에 입장 하시겠습니까?
                </div>

                <div className="bg-white rounded-[14px] p-4 mb-5">
                    <div className="text-sm font-extrabold text-black/70 mb-2">방 정보</div>
                    <div className="text-sm font-bold text-black/60 leading-6">
                        <div>방장: {room.hostNickname || "-"}</div>
                        <div>
                            인원: {room.currentPlayers}/{room.maxPlayers}
                        </div>
                        <div>판수: {room.totalRounds ? `${room.totalRounds}판` : "-"}</div>
                        <div>상태: {statusText}</div>
                    </div>
                </div>

                <div className="flex justify-center gap-8">
                    <button onClick={onClose} className="px-6 py-3 rounded-[14px] bg-white font-black">
                        뒤로가기
                    </button>
                    <button onClick={onConfirm} className="px-6 py-3 rounded-[14px] bg-white font-black">
                        입장하기
                    </button>
                </div>
            </div>
        </div>
    );
}
