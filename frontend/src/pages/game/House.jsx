// BuildHousePage.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";

const House = ({ player, onClose, onUpgrade }) => {
    const [step, setStep] = useState(0);

    const currentLevel = player?.houseLevel || "NONE";

    // 업그레이드 실행
    const handleUpgrade = () => {
        onUpgrade();
        setStep(4);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]"
        >
            <div className="bg-[#FFF8DC] rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl">

                {/* Step 0: 메뉴 선택 */}
                {step === 0 && (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-6">🏠 너굴씨의 집짓기</h2>
                        <p className="text-lg mb-8">집을 지으러 왔구리?</p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 rounded-full font-bold"
                            >
                                집 짓는 재료를 알고 싶어
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                className="px-6 py-3 bg-green-400 hover:bg-green-500 rounded-full font-bold"
                            >
                                집을 업그레이드 하고 싶어
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-full font-bold"
                            >
                                나가기
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 1: 필요한 재료 안내 */}
                {step === 1 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4 text-center">📋 집짓기 재료 안내</h2>

                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {Object.entries(HOUSE_LEVELS).filter(([key]) => key !== "NONE").map(([key, level]) => (
                                <div key={key} className="bg-white/50 p-3 rounded-lg">
                                    <p className="font-bold">{level.name}</p>
                                    <p className="text-sm text-gray-600">
                                        💰 {level.bell}벨
                                        {level.cloth && ` / 천 ${level.cloth}`}
                                        {level.iron && ` / 철 ${level.iron}`}
                                        {level.clay && ` / 점토 ${level.clay}`}
                                        {level.wood && ` / 나무 ${level.wood}`}
                                        {level.brick && ` / 벽돌 ${level.brick}`}
                                        {level.wallpaper && ` / 벽지 ${level.wallpaper}`}
                                        {level.flooring && ` / 바닥 ${level.flooring}`}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep(0)}
                            className="mt-6 w-full px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-full font-bold"
                        >
                            돌아가기
                        </button>
                    </div>
                )}

                {/* Step 2: 조건 체크 */}
                {step === 2 && (
                    <div className="text-center">
                        {currentLevel === "HOUSE_3" ? (
                            <>
                                <p className="text-xl mb-6">이미 최고 등급의 집이라구리! 🎉</p>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-full font-bold"
                                >
                                    나가기
                                </button>
                            </>
                        ) : canUpgrade() ? (
                            <>
                                <p className="text-xl mb-6">
                                    오! {player?.nickname}!<br/>
                                    재료를 다 구해왔구나!<br/>
                                    이제 <span className="font-bold text-green-600">{nextLevel?.name}</span>를 건설할 수 있다구리.<br/>
                                    진행하겠냐구리?
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setStep(3)}
                                        className="px-6 py-3 bg-green-400 hover:bg-green-500 rounded-full font-bold"
                                    >
                                        응!
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-full font-bold"
                                    >
                                        아니
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-xl mb-6">
                                    돈과 재료를 더 열심히 벌어서<br/>
                                    찾아오라구리! 💪
                                </p>
                                <p className="text-sm text-gray-600 mb-4">
                                    다음 단계: {nextLevel?.name}<br/>
                                    필요: 💰 {nextLevel?.bell}벨
                                    {nextLevel?.cloth && ` / 천 ${nextLevel.cloth}`}
                                    {nextLevel?.iron && ` / 철 ${nextLevel.iron}`}
                                    {nextLevel?.clay && ` / 점토 ${nextLevel.clay}`}
                                    {nextLevel?.wood && ` / 나무 ${nextLevel.wood}`}
                                    {nextLevel?.brick && ` / 벽돌 ${nextLevel.brick}`}
                                    {nextLevel?.wallpaper && ` / 벽지 ${nextLevel.wallpaper}`}
                                    {nextLevel?.flooring && ` / 바닥 ${nextLevel.flooring}`}
                                </p>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-full font-bold"
                                >
                                    나가기
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Step 3: 업그레이드 확인 */}
                {step === 3 && (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">🏗️ 업그레이드 확인</h2>

                        {/* 집 이미지 (나중에 추가) */}
                        <div className="bg-white/50 rounded-xl p-6 mb-4">
                            <p className="text-lg font-bold mb-2">{nextLevel?.name}</p>
                            <p className="text-sm text-gray-600">
                                💰 {nextLevel?.bell}벨
                                {nextLevel?.cloth && ` / 천 ${nextLevel.cloth}`}
                                {nextLevel?.iron && ` / 철 ${nextLevel.iron}`}
                                {nextLevel?.clay && ` / 점토 ${nextLevel.clay}`}
                                {nextLevel?.wood && ` / 나무 ${nextLevel.wood}`}
                                {nextLevel?.brick && ` / 벽돌 ${nextLevel.brick}`}
                                {nextLevel?.wallpaper && ` / 벽지 ${nextLevel.wallpaper}`}
                                {nextLevel?.flooring && ` / 바닥 ${nextLevel.flooring}`}
                            </p>
                        </div>

                        <p className="text-lg mb-6">업그레이드 하겠냐구리?</p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={handleUpgrade}
                                className="px-6 py-3 bg-green-400 hover:bg-green-500 rounded-full font-bold"
                            >
                                응!
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-full font-bold"
                            >
                                아니
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: 완료 */}
                {step === 4 && (
                    <div className="text-center">
                        <h2 className="text-3xl font-bold mb-6">🎉 축하한다구리!</h2>
                        <p className="text-xl mb-8">
                            {nextLevel?.name} 업그레이드 완료!
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 rounded-full font-bold"
                        >
                            나가기
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default House;