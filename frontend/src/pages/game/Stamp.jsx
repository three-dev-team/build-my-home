import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameTimer } from '../../hooks/useGameTimer.js';
import { boardTiles } from '../../constants/boardData.js';
import './css/Stamp.css';
import { useExitHandler } from '../../hooks/useExitHandler.js';
import Subtitle from '../../components/common/Subtitle.jsx';
import InstructionText from '../../components/common/InstructionText.jsx';
import useSpaceKey from '../../hooks/useSpaceKey.js';
import { COLORS } from '../../constants/colors.js';
import { CHARACTERS } from '../../constants/characters.js';

const DUPLICATE_REWARD = 20;

const STAMP_CONFIG = {
  GAPDOL: {
    name: '갑돌섬',
    npcName: '갑돌이',
    image: '/images/stamp/stamp-gapdol.webp',
    bg: '/images/stamp/bg-gapdol.jpeg',
    greeting: (playerName) =>
      `어이~ ${playerName}씨! 여기까지 오느라 고생 많았당께.\n자, 그... 뭐시기냐, 방문카드 좀 줘보라고.\n내가 기가 막히게 스탬프를 쾅!하고 찍어줄 테니껴~`,
    duplicate: (playerName) =>
      `어이쿠, ${playerName}아! 벌써 도장이 꽉 들어찼구마잉.\n빈칸이 없어서 서운하겠지만,\n아쉬운 대로 이거 20벨이라도 챙겨가랑께 껄껄~!`,
    success: (playerName) =>
      `자~ 아주 기가 막히게 찍혔구마잉~ 껄껄!\n내 스탬프가 들어가니까 카드가 아주 훤칠해졌어.\n남은 칸도 ${playerName}만의 추억으로 꽉꽉 채워보라고.`,
  },
  MUSEUM: {
    name: '박물관',
    npcName: '부엉이',
    image: '/images/stamp/stamp-museum.webp',
    bg: '/images/stamp/bg-museum.jpeg',
    greeting: (playerName) =>
      `호호! ${playerName}님 박물관에 오신 것을 환영합니다!\n괜찮으시다면 방문카드를 보여주시겠습니까?\n귀하의 방문을 기념하는 도장을 찍어드리겠습니다!`,
    duplicate: (playerName) =>
      `이럴 수가! 이미 완벽하게 수집이 끝난 상태로군요!\n대신, 멀리서 오신 ${playerName}님의 성의를 생각해서 여기\n20벨을 준비했으니 부디 받아주시겠습니까? 호호!`,
    success: (playerName) =>
      `호호! 아주 깔끔하고 완벽하게 각인되었습니다!\n이 스탬프가 나중에 ${playerName}님의 소중한 추억을 되새기는\n멋진 전시물이 되기를 바랍니다! 호호!`,
  },
  AIRPORT: {
    name: '비행장',
    npcName: '모리',
    image: '/images/stamp/stamp-airport.webp',
    bg: '/images/stamp/bg-airport.jpeg',
    greeting: (playerName) =>
      `로저! ${playerName} 비행장 착륙을 환영한다, 오버!\n자, 방문카드를 제시해 주길 바란다.\n확인되는 대로 즉시 스탬프를 각인하겠다. 이상!`,
    duplicate: (playerName) =>
      `현재 스탬프란이 모두 점유된 상태다, 오버!\n규정상 추가 각인은 불가능하지만, 헛걸음하게\n한 것에 대한 보상으로 20벨을 지급하겠다. 이상!`,
    success: (playerName) =>
      `스탬프 각인 완료, 오버!\n현재 방문카드 확인 절차가 정상적으로 처리되었다.\n남은 여행도 안전하게 수행하길 바란다. 이상!`,
  },
};

const Stamp = ({ isMyTurn = false, player, currentPlayerName = '익명의 주민', onAction, onExit }) => {
  // position으로 stampType 계산
  const position = player?.position || 0;
  const tile = boardTiles.find((t) => t.id === position);
  const stampType = tile?.type?.replace('STAMP_', '') || 'GAPDOL';

  const step = player?.uiStep || 0;
  const config = STAMP_CONFIG[stampType] || STAMP_CONFIG.GAPDOL;

  const collectedStamps = player?.collectedStamps || [];
  const isDuplicate = player?.actionData === 0; // 0: 중복, 1: 신규

  // 자동 나가기 처리 (중복 방지)
  // TODO: 프론트 타이머 대신 서버 타임아웃 방식으로 변경 필요 - Tiffany
  // exit 핸들러 생성, isMyTurn일 때만 onExit(event-complete) 호출
  const handleExit = useExitHandler(isMyTurn, onExit);
  // step 2에서 3초 후 자동 나가기
  useGameTimer(isMyTurn && step === 2 ? 3 : null, handleExit); // 타이머도 내 턴만

  const setStep = (newStep) => {
    if (!isMyTurn) return;
    onAction('SET_STEP', { uiStep: newStep });
  };

  // 도장 쾅 버튼 클릭 (uiStep 1 → 2 + 스탬프 획득)
  const handleStamp = () => {
    if (!isMyTurn) return;
    onAction('STAMP_COLLECT', { actionDataStr: stampType });
  };

  // 스페이스바 핸들러
  useSpaceKey(handleStamp, { enabled: isMyTurn && step === 1 });

  // NPC 이름 → COLORS 키 매핑
  const npcColorKey =
    {
      갑돌이: 'gapdol',
      부엉이: 'bueong',
      모리: 'mori',
    }[config.npcName] || 'default';

  // 현재 플레이어의 캐릭터 정보 가져오기
  const character = CHARACTERS.find((c) => Number(c.id) === Number(player?.characterId));
  const charImg = character?.backImage ?? null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="stamp-container"
      style={{
        backgroundImage: `url(${config.bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* uiStep 0: NPC 인사 */}
      {step === 0 && (
        <>
          <Subtitle
            nameText={config.npcName}
            nameColor={COLORS.characters[npcColorKey]?.nameBox}
            nameTextColor={COLORS.characters[npcColorKey]?.nameText}
            contentText={config.greeting(currentPlayerName)}
            contentColor={COLORS.subtitle.contentBox}
            contentTextColor={COLORS.subtitle.contentText}
            options={[
              { text: '빨리 찍어', onClick: () => setStep(1) },
              { text: '고마워!', onClick: () => setStep(1) },
            ]}
            optionColor={COLORS.subtitle.optionBox}
            optionTextColor={COLORS.subtitle.optionText}
            optionDisabled={!isMyTurn}
          />

          {/* 현재 플레이어 캐릭터 */}
          {charImg && (
            <div className="stamp-player-character">
              {charImg && (
                <img src={charImg} alt={currentPlayerName} className="stamp-character-img" draggable="false" />
              )}
            </div>
          )}
        </>
      )}

      {/* Step 1: 방문카드 화면 */}
      {step === 1 && (
        <div className="stamp-card-wrapper">
          <div className="stamp-card-container">
            {/* 방문카드 타이틀 */}
            <div className="stamp-card-title">{currentPlayerName}의 방문카드</div>
            {/* 방문카드 배경 */}
            <img src="/images/stamp/ui-stampcard.webp" alt="방문카드" className="stamp-card-image" />

            {/* 스탬프 위치 오버레이 */}
            <div className="stamp-overlay">
              {/* 비행장 스탬프 */}
              <div className="stamp-position stamp-position-airport">
                {collectedStamps.includes('AIRPORT') && (
                  <img src="/images/stamp/stamp-airport.webp" alt="비행장 스탬프" className="stamp-image" />
                )}
              </div>

              {/* 갑돌섬 스탬프 */}
              <div className="stamp-position stamp-position-gapdol">
                {collectedStamps.includes('GAPDOL') && (
                  <img src="/images/stamp/stamp-gapdol.webp" alt="갑돌섬 스탬프" className="stamp-image" />
                )}
              </div>

              {/* 박물관 스탬프 */}
              <div className="stamp-position stamp-position-museum">
                {collectedStamps.includes('MUSEUM') && (
                  <img src="/images/stamp/stamp-museum.webp" alt="박물관 스탬프" className="stamp-image" />
                )}
              </div>
            </div>

            {/* 스페이스바 안내 메시지 */}
            <InstructionText>
              {isMyTurn ? '스페이스바를 눌러 도장 찍기' : `${currentPlayerName}이 도장을 찍는 중입니다...`}
            </InstructionText>
          </div>
        </div>
      )}

      {/* Step 2: 결과 화면 */}
      {step === 2 && (
        <>
          {/* 상단 Subtitle */}
          <Subtitle
            nameText={config.npcName}
            nameColor={COLORS.characters[npcColorKey]?.nameBox || COLORS.characters.default.nameBox}
            nameTextColor={COLORS.characters[npcColorKey]?.nameText || COLORS.characters.default.nameText}
            contentText={isDuplicate ? config.duplicate(currentPlayerName) : config.success(currentPlayerName)}
            contentColor={COLORS.subtitle.contentBox}
            contentTextColor={COLORS.subtitle.contentText}
          />

          {/* 중앙 스탬프 카드 */}
          <div className="stamp-result-card">
            <div className="stamp-card-title">{currentPlayerName}의 방문카드</div>
            <img src="/images/stamp/ui-stampcard.webp" alt="방문카드" className="stamp-card-image" />

            {/* 스탬프 위치 오버레이 (애니메이션 포함) */}
            <div className="stamp-overlay">
              {/* 비행장 */}
              <div className="stamp-position stamp-position-airport">
                {collectedStamps.includes('AIRPORT') && (
                  <div className={stampType === 'AIRPORT' && !isDuplicate ? 'animate-stamp-slam' : ''}>
                    <img src="/images/stamp/stamp-airport.webp" alt="비행장" className="stamp-image" />
                  </div>
                )}
              </div>

              {/* 갑돌섬 */}
              <div className="stamp-position stamp-position-gapdol">
                {collectedStamps.includes('GAPDOL') && (
                  <div className={stampType === 'GAPDOL' && !isDuplicate ? 'animate-stamp-slam' : ''}>
                    <img src="/images/stamp/stamp-gapdol.webp" alt="갑돌섬" className="stamp-image" />
                  </div>
                )}
              </div>

              {/* 박물관 */}
              <div className="stamp-position stamp-position-museum">
                {collectedStamps.includes('MUSEUM') && (
                  <div className={stampType === 'MUSEUM' && !isDuplicate ? 'animate-stamp-slam' : ''}>
                    <img src="/images/stamp/stamp-museum.webp" alt="박물관" className="stamp-image" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Stamp;
