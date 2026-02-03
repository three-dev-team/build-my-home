import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';
import { CHARACTERS } from '../../../constants/characters.js';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import './HouseCommon.css';
import HouseStep0 from './HouseStep0.jsx';
import HouseStep1Naugul from './HouseStep1Naugul.jsx';
import HouseStep2Materials from './HouseStep2Materials.jsx';
import HouseStep3Upgrade from './HouseStep3Upgrade.jsx';

// 1920 기준 스케일 변수(--s)로 px처럼 쓰는 헬퍼
const px = (n) => `calc(${n} * var(--s))`;

// characterId로 캐릭터 메타 찾기
const pickCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

export default function House({ player, isMyTurn, onClose, onAction, onInventory, onATM }) {
  // 서버/상태에서 내려오는 uiStep(하우스 화면 단계)
  const step = player?.uiStep ?? 0;

  // 내 턴일 때만 step 변경(서버로 SET_STEP 전송)
  const setStep = (newStep) => {
    if (!isMyTurn) return;
    onAction?.('SET_STEP', { uiStep: newStep });
  };

  // 현재 플레이어 캐릭터 메타(이미지/색 등)
  const character = useMemo(() => pickCharacter(player?.characterId), [player?.characterId]);

  // step별 배경 이미지 매핑
  const BG_BY_STEP = {
    0: '/images/board/bg-buildhouse-main.webp',
    1: '/images/board/bg-buildhouse-naugul.webp',
    2: '/images/board/bg-buildhouse-naugul.webp',
    3: '/images/board/bg-buildhouse-naugul.webp',
  };

  // 공용 배경/카드 컬러(알파 적용)
  const PANEL_BG = withAlpha(COLORS.ac.black, 0.55);
  const CARD_BG = withAlpha(COLORS.ac.black, 0.35);

  // 뒤로가기(단계별 이동 규칙)
  const handleBack = () => {
    if (!isMyTurn) return;

    if (step >= 3) return setStep(1); // step3에서도 너굴(step1)로
    if (step === 2) return setStep(1);
    if (step === 1) return setStep(0);
    onClose?.();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="houseOverlay">
      <AspectLayout>
        <div
          className="houseStage"
          style={{
            ['--s']: 'calc(100cqw / 1920)', // 16:9 캔버스 스케일 기준
            ['--house-panel-bg']: PANEL_BG, // 패널 배경 컬러 변수
            ['--house-card-bg']: CARD_BG, // 카드 배경 컬러 변수
            ['--house-white']: COLORS.ac.white, // 공용 화이트 변수
          }}
        >
          <img src={BG_BY_STEP[step]} alt="house-bg" draggable={false} className="houseBg" />

          {step === 0 && (
            <HouseStep0
              player={player}
              isMyTurn={isMyTurn}
              character={character}
              px={px}
              onInventory={onInventory}
              onATM={onATM}
              onOpenNaugul={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <HouseStep1Naugul
              player={player}
              isMyTurn={isMyTurn}
              character={character}
              px={px}
              onSelectUpgrade={() => setStep(3)} // 업그레이드 안내서
              onSelectMaterials={() => setStep(2)} // 재료 안내서
            />
          )}

          {step === 2 && <HouseStep2Materials player={player} isMyTurn={isMyTurn} character={character} px={px} />}

          {step === 3 && (
            <HouseStep3Upgrade
              player={player}
              isMyTurn={isMyTurn}
              character={character}
              px={px}
              onBackToNaugul={() => setStep(1)}
              onConfirmUpgrade={() => onAction?.('HOUSE_UPGRADE', {})} // 업그레이드 확정 트리거
            />
          )}

          <ExitButton
            onClick={handleBack}
            disabled={!isMyTurn}
            style={{ position: 'absolute', right: px(30), bottom: px(28) }}
          />
        </div>
      </AspectLayout>
    </motion.div>
  );
}
