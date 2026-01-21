// House.jsx
import React, {useEffect, useState} from "react";
import {motion} from "framer-motion";
import {HOUSE_LEVEL_MAP, RESOURCE_MAP, HOUSE_DETAILS} from "../../constants/houseLevel.js";

// TODO: 내 차례가 아닐때 버튼 비활성화 유지보수를 위한 공통처리 방법 고민
const House = ({player, isMyTurn, onClose, onAction}) => {
    const {houseLevel, canUpgradeHouse, nextHouseLevel, requiredResourcesForNextHouse} = player;

    // setStep 함수로 UI 스텝 변경
    const step = player?.uiStep || 0;  // 서버에서 받아옴
    const setStep = (newStep) => {
        if (!isMyTurn) return;
        onAction("SET_STEP", { uiStep: newStep });
    };

    // 서버 문자열("LAND")로 해당 레벨 상수 정보(벨,  프론트에서 가져오기
    const nextLevelData = HOUSE_DETAILS[nextHouseLevel];
    const diffBell = nextLevelData?.bell - player.bell; // 부족한 벨
    const isBellEnough = diffBell <= 0;                 // 벨이 충분한지 여부

    const handleUpgrade = () => {
        onAction("UPGRADE_HOUSE", {});
    };

    return (
        <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            className="fixed inset-0 bg-[#ffffff] z-[100]"
        >
            {/* 상시 닫기 버튼 */}
            {isMyTurn && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full text-black text-2xl font-bold shadow-lg z-10"
                >
                    ✕
                </button>
            )}

            {/* Step 0: 메뉴 선택 */}
            {step === 0 && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                    <h2 className="text-3xl font-bold mb-6 text-black">🏠 너굴씨의 집짓기</h2>
                    <p className="text-xl mb-8 text-black">집을 지으러 왔구리?</p>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => setStep(1)}
                            disabled={!isMyTurn}
                            className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 rounded-full font-bold text-lg"
                        >
                            집 짓는 재료를 알고 싶어
                        </button>
                        <button
                            onClick={() => setStep(2)}
                            disabled={!isMyTurn}
                            className="px-8 py-4 bg-green-400 hover:bg-green-500 rounded-full font-bold text-lg"
                        >
                            집을 업그레이드 하고 싶어
                        </button>
                    </div>
                </div>
            )}

            {/* Step 1: 필요한 재료 안내 */}
            {step === 1 && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                    <h2 className="text-3xl font-bold mb-8 text-black">🏠 집 업그레이드</h2>

                    {/* 가로 슬라이드 */}
                    <div className="flex gap-6 overflow-x-auto pb-4 px-4">
                        {HOUSE_LEVEL_MAP.filter(level => level.level > 0).map((level) => {
                            return (
                                <div
                                    key={level.key}
                                    className={"flex-shrink-0 w-48 rounded-xl p-4 text-center"}>
                                    {/* TODO: 이미지로 대체 */}
                                    <div
                                        className="w-28 h-28 mx-auto bg-gray-300 rounded-lg mb-2 flex items-center justify-center text-4xl">
                                        🏠
                                    </div>

                                    <p className="font-bold text-lg mb-2">{level.name}</p>

                                    {/* 필요 재화 */}
                                    <div className="text-sm text-gray-600 space-y-1">
                                        {level.bell > 0 && <p>💰 {level.bell}벨</p>}
                                        {level.cloth > 0 && <p>천 x{level.cloth}</p>}
                                        {level.iron > 0 && <p>철광석 x{level.iron}</p>}
                                        {level.clay > 0 && <p>점토 x{level.clay}</p>}
                                        {level.wood > 0 && <p>목재 x{level.wood}</p>}
                                        {level.brick > 0 && <p>벽돌 x{level.brick}</p>}
                                        {level.wallpaper > 0 && <p>벽지 x{level.wallpaper}</p>}
                                        {level.flooring > 0 && <p>바닥 x{level.flooring}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => setStep(0)}
                        disabled={!isMyTurn}
                        className="mt-6 px-8 py-4 bg-gray-300 hover:bg-gray-400 rounded-full font-bold text-lg"
                    >
                        돌아가기
                    </button>
                </div>
            )}

            {/* Step 2: 조건 체크 (이미 맥스 레벨 / 업그레이드 가능 / 업그레이드 불가) */}
            {step === 2 && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                    {!nextHouseLevel ? (
                        <>
                            <p className="text-2xl mb-8 text-black text-center">
                                이미 최고 등급의 집이라구리! 🎉
                            </p>
                            <button
                                onClick={() => setStep(0)}
                                disabled={!isMyTurn}
                                className="mt-6 px-8 py-4 bg-gray-300 hover:bg-gray-400 rounded-full font-bold text-lg"
                            >
                                돌아가기
                            </button>
                        </>
                    ) : canUpgradeHouse ? (
                        <>
                            <p className="text-2xl mb-8 text-black text-center">
                                오! {player?.nickname}!<br/>
                                재료를 다 구해왔구나!<br/>
                                이제 <span className="font-bold text-yellow-300">{nextLevelData?.name}</span>를 건설할 수 있다구리.<br/>
                                진행하겠냐구리?
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!isMyTurn}
                                    className="px-8 py-4 bg-green-400 hover:bg-green-500 rounded-full font-bold text-lg"
                                >
                                    응! 건설해줘
                                </button>
                                <button
                                    onClick={() => setStep(0)}
                                    disabled={!isMyTurn}
                                    className="px-8 py-4 bg-gray-300 hover:bg-gray-400 rounded-full font-bold text-lg"
                                >
                                    아니 다음에 할게
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-2xl mb-6 text-black text-center">
                                돈과 재료를 더 열심히 벌어서<br/>
                                찾아오라구리! 💪
                            </p>
                            <div className="bg-white/80 rounded-xl p-6 mb-8">
                                <p className="font-bold text-center text-gray-800 mb-2">
                                    {nextLevelData?.name}를 지으려면 아래 재료를 더 가져오라구리
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-gray-700">
                                    {/* 벨 상태에 따른 메시지 노출 */}
                                    <p className={`text-right text-sm mt-1 ${isBellEnough ? "text-green-500 font-bold" : "text-red-400"}`}>
                                        {isBellEnough ? (
                                            "벨을 다 모았어구리! 이제 업그레이드 할 수 있다구리! ✨"
                                        ) : (
                                            `앞으로 ${diffBell.toLocaleString()}벨이 더 필요해구리!`
                                        )}
                                    </p>

                                    {/* 자원 섹션 */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(requiredResourcesForNextHouse).map(([resKey, amount]) => (
                                            <div key={resKey}
                                                 className="flex items-center justify-between p-3 bg-white/90 rounded-lg shadow-sm">
                                                <span className="text-lg">{RESOURCE_MAP[resKey]?.icon}</span>
                                                <span className="font-bold text-red-500">-{amount}개</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setStep(0)}
                                disabled={!isMyTurn}
                                className="mt-6 px-8 py-4 bg-gray-300 hover:bg-gray-400 rounded-full font-bold text-lg"
                            >
                                돌아가기
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Step 3: 업그레이드 확인 */}
            {step === 3 && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                    <h2 className="text-3xl font-bold mb-6 text-black">🏗️ 업그레이드 확인</h2>

                    {/* 집 이미지 */}
                    <div className="bg-white/90 rounded-xl p-8 mb-6">
                        <div className="w-32 h-32 mx-auto bg-gray-300 rounded-lg mb-4 flex items-center justify-center text-5xl">
                            🏠
                        </div>
                        <div className="bg-white/80 rounded-xl p-6 mb-8 text-center text-gray-700">
                            <p className="text-2xl font-bold text-center mb-4">{nextLevelData?.name}</p>
                            <p className="text-lg font-bold mb-3">🛠️ 필요한 재료구리</p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {/* 벨 정보 */}
                                <p className={isBellEnough ? "text-green-600" : "text-red-500"}>
                                    💰 {player.bell.toLocaleString()} / {nextLevelData?.bell.toLocaleString()}벨
                                </p>

                                {/* 자원 정보들 */}
                                {Object.entries(requiredResourcesForNextHouse).map(([key, amount]) => (
                                    <p key={key} className="text-red-500 font-medium">
                                        / {RESOURCE_MAP[key]?.icon} {RESOURCE_MAP[key]?.name} x{amount}
                                    </p>
                                ))}
                            </div>

                            {/* 아까 만든 부족한 금액/재료 요약 메시지 */}
                            <p className={`mt-4 text-sm ${isBellEnough && Object.keys(requiredResourcesForNextHouse).length === 0 ? "text-green-500" : "text-red-400"}`}>
                                {isBellEnough && Object.keys(requiredResourcesForNextHouse).length === 0
                                    ? "모든 준비가 끝났다구리! ✨"
                                    : "조금만 더 힘내라구리! 💪"}
                            </p>
                        </div>
                    </div>

                    <p className="text-xl mb-6 text-black">업그레이드 하겠냐구리?</p>

                    <div className="flex gap-4">
                        <button
                            onClick={handleUpgrade}
                            disabled={!isMyTurn}
                            className="px-8 py-4 bg-green-400 hover:bg-green-500 rounded-full font-bold text-lg"
                        >
                            응!
                        </button>
                        <button
                            onClick={() => setStep(2)}
                            disabled={!isMyTurn}
                            className="px-8 py-4 bg-gray-300 hover:bg-gray-400 rounded-full font-bold text-lg"
                        >
                            아니
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: 완료 */}
            {step === 4 && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                    <h2 className="text-4xl font-bold mb-6 text-black">🎉 축하한다구리!</h2>
                    <p className="text-2xl mb-8 text-black">
                        {HOUSE_DETAILS[houseLevel]?.name} 업그레이드 완료!
                    </p>
                    <button
                        onClick={onClose}
                        disabled={!isMyTurn}
                        className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 rounded-full font-bold text-lg"
                    >
                        나가기
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default House;