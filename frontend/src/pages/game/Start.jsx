import React, {useRef} from "react";
import {motion} from "framer-motion";
import {useGameTimer} from "../../hooks/useGameTimer.js";

// TODO: GameConstants.java와 일치해야 함
const STAMP_REWARDS = [0, 50, 200, 1000];

const Start = ({
                   isMyTurn = false,
                   player,
                   currentPlayerName = "익명의 주민",
                   onAction,
                   onExit,
               }) => {
    const step = player?.uiStep || 0;
    const collectedStamps = player?.collectedStamps || [];
    const stampCount = collectedStamps.length;
    // uiStep 0: 프론트에서 미리보기 계산
    // uiStep 1: 서버에서 받은 실제 값
    const reward = step === 0
        ? STAMP_REWARDS[Math.min(stampCount, 3)]
        : (player?.actionData || 0);

    // 자동 나가기 처리 (중복 방지)
    const hasExited = useRef(false);

    const handleExit = () => {
        if (hasExited.current) return;
        hasExited.current = true;
        if (!isMyTurn) return;
        onExit();
    };

    // TODO: 프론트 타이머 대신 서버 타임아웃 방식으로 변경 필요
    useGameTimer((step === 1 || step === 2) ? 3 : 0, handleExit);

    const handleExchange = () => {
        if (!isMyTurn) return;
        onAction("START_STAMP_EXCHANGE", {});
    };

    const handleSkip = () => {
        if (!isMyTurn) return;
        onAction("START_STAMP_SKIP", {});
    };

    return (
        <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center z-[100] overflow-hidden bg-blue-200"
        >
            {/* uiStep 0: 정산 여부 질문 */}
            {step === 0 && (
                <div className="bg-[#FFF8DC] rounded-3xl p-12 max-w-xl text-center shadow-2xl">
                    <h2 className="text-4xl font-bold mb-8 text-blue-600">
                        여울사무소
                    </h2>
                    <p className="text-2xl leading-relaxed mb-8">
                        {currentPlayerName}!<br/>
                        {stampCount === 3 ? (
                            <>
                                스탬프를 다 모았구나 대단해!<br/>
                                스탬프를 다 모았으니 무려 <span className="font-bold text-yellow-600">{reward}벨</span>을 받을 수
                                있다고!<br/>
                                정산할래?
                            </>
                        ) : stampCount > 0 ? (
                            <>
                                스탬프 {stampCount}개 모았네.<br/>
                                정산하면 <span className="font-bold text-yellow-600">{reward}벨</span> 받아!<br/>
                                정산할래?
                            </>
                        ) : (
                            <>
                                아직 스탬프가 없네...<br/>
                                다음에 또 오렴!<br/>
                            </>
                        )}
                    </p>
                    <div className="flex gap-4 justify-center">
                        {stampCount > 0 ? (
                            <>
                                <button
                                    onClick={handleExchange}
                                    disabled={!isMyTurn}
                                    className="px-8 py-4 bg-green-500 text-white rounded-full text-2xl font-bold disabled:opacity-50"
                                >
                                    응! 지금 할게
                                </button>
                                <button
                                    onClick={handleSkip}
                                    disabled={!isMyTurn}
                                    className="px-8 py-4 bg-gray-400 text-white rounded-full text-2xl font-bold disabled:opacity-50"
                                >
                                    다음에 할게
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleSkip}
                                disabled={!isMyTurn}
                                className="px-8 py-4 bg-gray-400 text-white rounded-full text-2xl font-bold disabled:opacity-50"
                            >
                                다음에 보자
                            </button>
                        )}
                    </div>
                </div>
            )}
            {/* TODO: 스탬프를 3개 다 모았을 때 정산 버튼을 누르면, 단순한 메시지 창보다는 폭죽이 터지거나 돈다발이 쏟아지는 애니메이션 uiStep 1에 추가*/}
            {/* uiStep 1: 정산 완료 */}
            {step === 1 && (
                <div className="bg-[#FFF8DC] rounded-3xl p-12 max-w-xl text-center shadow-2xl">
                    <p className="text-2xl leading-relaxed">
                        <span className="font-bold text-yellow-600">{reward}벨</span>을 송금했어!<br/>
                        여기 새로운 카드를 줄게.<br/>
                        또 모으면 좋은 일이 생길거야!
                        다음에 또 보자!
                    </p>
                    <p className="text-gray-400 text-lg mt-8">잠시 후 자동으로 닫힙니다...</p>
                </div>
            )}

            {/* uiStep 2: 스킵 */}
            {step === 2 && (
                <div className="bg-[#FFF8DC] rounded-3xl p-12 max-w-xl text-center shadow-2xl">
                    <h2 className="text-4xl font-bold mb-8 text-gray-600">
                        알겠어!
                    </h2>
                    <p className="text-2xl leading-relaxed">
                        스탬프 더 모아서 와!
                    </p>
                    <p className="text-gray-400 text-lg mt-8">잠시 후 자동으로 닫힙니다...</p>
                </div>
            )}
        </motion.div>
    );
};

export default Start;