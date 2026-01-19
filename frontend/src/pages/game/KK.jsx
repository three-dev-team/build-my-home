// KK.jsx
import React, {useState, useRef} from "react";
import {motion} from "framer-motion";
import {useGameTimer} from "../../hooks/useGameTimer.js";

const KK = ({
                isMyTurn = false,
                currentPlayerName = "익명의 주민",
                userBell = 0,
                timeoutSeconds,
                onAction,
                onExit,
            }) => {
    const [mode, setMode] = useState("select");  // "select" | "loan" | "playing"
    const [selectedSong, setSelectedSong] = useState(null);
    const [pendingSong, setPendingSong] = useState(null);
    const audioRef = useRef(null);

    const ENTRY_FEE = 100;
    const loanAmount = ENTRY_FEE - userBell;

    const songs = [
        {id: 1, title: "발라드", audio: "/audio/kk-ballad.mp3", mood: "ballad"},
        {id: 2, title: "힙합", audio: "/audio/kk-hiphop.mp3", mood: "hiphop"},
        {id: 3, title: "랜덤", audio: "/audio/kk-random.mp3", mood: "random"},
    ];

    const moodConfig = {
        ballad: {image: "/images/kk-ballad-background.jpeg"},
        hiphop: {image: "/images/kk-hiphop-background.jpeg"},
        random: {image: "/images/kk-random-background.jpeg"},
    };

    const {timeLeft, isUrgent, hasTimeOutPanel} = useGameTimer(
        mode === "select" || mode === "loan" ? timeoutSeconds : 0
    );

    // 노래 선택 클릭
    const handleSelectSong = (song) => {
        if (!isMyTurn) return;

        if (userBell < ENTRY_FEE) {
            // 벨 부족 → 대출 확인 화면으로
            setPendingSong(song);
            setMode("loan");
        } else {
            // 벨 충분 → 바로 재생
            confirmSelectSong(song);
        }
    };

    // 대출 확인 후 진행
    const confirmSelectSong = (song) => {
        setSelectedSong(song);
        setMode("playing");
        onAction("KK_ACTION", {songId: song.id});
    };

    const handleEnd = () => {
        onExit();
    };

    const handleSkip = () => {
        if (audioRef.current) audioRef.current.pause();
        onExit();
    };

    const currentMood = selectedSong ? moodConfig[selectedSong.mood] : null;

    return (
        <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            className="fixed inset-0 w-screen h-screen flex items-end justify-center z-[100] overflow-hidden"
            style={{
                backgroundImage: mode === "playing" && currentMood
                    ? `url(${currentMood.image})`
                    : "url('/images/kk-select-background.jpeg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* 노래 선택 모드 */}
            {mode === "select" && (
                <div
                    className="relative w-full max-w-[1400px] aspect-[2.5/1] transform scale-[1.3] origin-bottom mb-[-120px]"
                    style={{
                        backgroundImage: "url('/images/bubble_select.webp')",
                        backgroundSize: "contain",
                        backgroundPosition: "bottom center",
                        backgroundRepeat: "no-repeat",
                    }}
                >
                    <div >
                        {/* 왼쪽: KK 대사 */}
                        <div>
                            <p className="text-2xl text-gray-800">
                                안녕, {currentPlayerName}.<br/>
                                기분에 맞는 노래를 골라보겠어?<br/>
                                공연료는 {ENTRY_FEE}벨이라구.
                            </p>
                        </div>

                        {/* 오른쪽: 노래 선택 버튼 */}
                        <div>
                            {songs.map((song) => (
                                <button
                                    key={song.id}
                                    onClick={() => handleSelectSong(song)}
                                    disabled={!isMyTurn}
                                    className={`px-6 py-2 rounded-full text-lg font-bold transition-all
                                        ${isMyTurn
                                        ? "bg-[#FFF8DC] hover:bg-[#FFE4B5] cursor-pointer"
                                        : "bg-gray-300 cursor-not-allowed"
                                    }`}
                                >
                                    {song.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 대출 확인 모드 */}
            {mode === "loan" && (
                <div
                    style={{
                        backgroundImage: "url('/images/bubble_select.webp')",
                        backgroundSize: "contain",
                        backgroundPosition: "bottom center",
                        backgroundRepeat: "no-repeat",
                    }}
                >
                    <div>
                        {/* 왼쪽: KK 대사 */}
                        <div>
                            <p className="text-2xl text-gray-800">
                                앗... {currentPlayerName}....<br/>
                                벨이 부족한 거 같네...<br/>
                                너굴씨에게 {loanAmount}벨 대출금 올려놓을게.
                            </p>
                        </div>

                        {/* 오른쪽: 확인 버튼 */}
                        <div>
                            <button
                                onClick={() => confirmSelectSong(pendingSong)}
                            >
                                좋아! 알았어!
                            </button>
                            <button
                                onClick={() => confirmSelectSong(pendingSong)}
                            >
                                어쩔수 없지...
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 재생 모드 */}
            {mode === "playing" && selectedSong && (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div className="bg-black/50 px-8 py-4 rounded-full text-white text-3xl font-bold">
                        🎵 {selectedSong.title}
                    </div>

                    <audio
                        ref={audioRef}
                        src={selectedSong.audio}
                        autoPlay
                        onEnded={handleEnd}
                    />

                    <button
                        onClick={handleSkip}
                        className="absolute bottom-10 right-10 px-8 py-4 bg-white/20 hover:bg-white/40 text-white rounded-full text-2xl font-bold"
                    >
                        Skip
                    </button>
                </div>
            )}

            {/* 타이머 표시 */}
            {hasTimeOutPanel && (mode === "select" || mode === "loan") && (
                <div className="absolute top-8 right-8">
                    <span className={`text-3xl font-bold ${isUrgent ? "text-red-500" : "text-white"}`}>
                        {timeLeft}s
                    </span>
                </div>
            )}
        </motion.div>
    );
};

export default KK;