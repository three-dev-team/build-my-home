import React, {useState} from "react";
import {Link, useNavigate} from "react-router-dom";

export default function Loading() {
    const navigate = useNavigate();
    const [roomTitle, setRoomTitle] = useState("");

    const handleBack = () => navigate(-1); // 이전 화면(Home)으로 이동

    return (
        <div className="relative w-full h-screen bg-[#f8f1e7] flex items-center justify-center overflow-hidden">
            {/* 좌상단 홈 버튼 */}
            <Link
                to="/"
                className="absolute top-6 left-6 bg-[#fdf6e3] border-[4px] border-[#8b5a2b] p-2 rounded-2xl shadow-md hover:scale-110 transition z-30"
            >
                <span className="text-2xl text-[#8b5a2b]">🏠</span>
            </Link>

            {/* 방 만들기 중앙 카드 (제공해주신 aside 코드로 대체) */}
            <div
                className="relative w-80 bg-[#fdf6e3] p-6 rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl z-20">
                {/* 상단 헤더 */}
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-2xl font-black text-[#8b5a2b]">Create Room</h2>
                    <button
                        onClick={handleBack}
                        className="w-8 h-8 flex items-center justify-center bg-[#8b5a2b] text-white rounded-full font-bold hover:brightness-110 transition-all"
                    >
                        X
                    </button>
                </div>

                {/* 입력 및 설정 섹션 */}
                <div className="space-y-5">
                    {/* 방 제목 입력 */}
                    <div className="bg-[#efe7d1] p-3 rounded-2xl border-2 border-[#a67c52]/10">
                        <label className="block text-sm font-bold text-[#8b5a2b] mb-1">
                            Room Title
                        </label>
                        <input
                            type="text"
                            value={roomTitle}
                            onChange={(e) => setRoomTitle(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-[#5d4037] font-bold"
                            placeholder="마이홈에 놀러와!"
                        />
                    </div>

                    {/* 인원 설정 표시 */}
                    <div
                        className="bg-[#efe7d1] p-3 rounded-2xl border-2 border-[#a67c52]/10 flex justify-between items-center">
                        <label className="text-sm font-bold text-[#8b5a2b]">
                            Max Players
                        </label>
                        <span className="font-bold text-[#5d4037]">4명</span>
                    </div>

                    {/* 실행 버튼 (Action) */}
                    <button
                        className="w-full bg-[#8b5a2b] text-[#fdf6e3] py-4 rounded-3xl text-xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
                        onClick={() => {
                            if (!roomTitle.trim()) {
                                alert("방 제목을 입력해주세요!");
                                return;
                            }
                            alert(`${roomTitle} 방이 생성되었습니다!`);
                            // 이후 API 호출 및 게임 화면 이동 로직 작성
                        }}
                    >
                        Action
                    </button>
                </div>
            </div>
        </div>
    );
}
