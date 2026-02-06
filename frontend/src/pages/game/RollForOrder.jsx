import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import useSpaceKey from '../../hooks/useSpaceKey';
import Dice3D from '../../components/dice/Dice3D.jsx';
import InstructionText from '../../components/common/InstructionText.jsx';
import Shadow from '../../components/common/Shadow.jsx';
import { CHARACTERS } from '../../constants/characters.js';
import './css/RollForOrder.css';
import CircleBlackout from '../../components/common/CircleBlackout.jsx';

// GLB 프리로드 (마운트 전에 캐싱)
for (let i = 1; i <= 6; i++) {
  useGLTF.preload(`/images/dice/dice-${i}.glb`);
}

const RollForOrder = ({ players, myId, onRoll, onOrderComplete }) => {
  const [animationDone, setAnimationDone] = useState({});
  // 1. 처음 마운트될 때 열리는 애니메이션을 위해 true로 시작
  const [isOpening, setIsOpening] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  // const [showBlackout, setShowBlackout] = useState(false); // 암전 실행용 스위치

  const characterImages = useMemo(() => {
    return CHARACTERS.reduce((acc, char) => {
      acc[Number(char.id)] = char.selectBasicImage;
      return acc;
    }, {});
  }, []);

  const myDiceValue = players.find((p) => p.memberId === myId)?.orderDiceValue;

  // 스페이스바: 내 주사위 아직 안 굴렸을 때만
  useSpaceKey(() => onRoll(), { enabled: !myDiceValue });

  // 전원 완료 체크
  const allDiceRolled = players.length > 0 && players.every((p) => p.orderDiceValue);
  const allAnimDone = players.length > 0 && players.every((p) => animationDone[p.memberId]);

  // 전원 완료 시 블랙아웃 실행
  useEffect(() => {
    // 모든 주사위 애니메이션이 끝났을 때만 showBlackout을 true로!
    if (allDiceRolled && allAnimDone) {
      setIsClosing(true);
    }
  }, [allDiceRolled, allAnimDone]);

  const handleAnimEnd = useCallback((memberId) => {
    setAnimationDone((prev) => ({ ...prev, [memberId]: true }));
  }, []);

  // 안내 문구
  const getMessage = () => {
    if (allDiceRolled && allAnimDone) return '';
    if (!myDiceValue) return '스페이스바를 눌러 주사위 굴리기';
    return '다른 플레이어를 기다리는 중...';
  };

  return (
    <div className="order-scene-container">
      <InstructionText>{getMessage()}</InstructionText>

      <div className="player-lineup">
        {players.map((player) => {
          const diceValue = player.orderDiceValue;
          const isMe = player.memberId === myId;
          const charImg = player.characterId ? characterImages[player.characterId] : null;

          return (
            <div key={player.memberId} className="player-unit">
              <div className="dice-wrapper">
                {diceValue ? (
                  <Dice3D
                    value={diceValue}
                    onAnimationEnd={() => handleAnimEnd(player.memberId)}
                  />
                ) : (
                  <div></div>
                )}
              </div>

              <div className="character-box">
                <Shadow fill={true}>
                  <img src={charImg} alt={player.nickname} />
                  <div className={`nickname-tag ${isMe ? 'highlight' : ''}`}>{player.nickname}</div>
                </Shadow>
              </div>
            </div>
          );
        })}
      </div>
      {/* 4. 여기에 컴포넌트 배치 */}
      {/* 2. 화면 열기 (등장 연출) */}
      <CircleBlackout
        show={isOpening}
        type="open"
        duration={1500} // 1초 동안 부드럽게 열림
        onDone={() => setIsOpening(false)} // 다 열리면 메모리 확보를 위해 제거
      />
      <CircleBlackout
        show={isClosing}
        type="close"        // 닫기(암전)
        duration={1500}     // 1.5초 (원하는 대로 조절)
        onDone={() => {
          // 다 닫히면 부모에게 완료 알림
          onOrderComplete?.();
        }}
      />
    </div>
  );
};

export default RollForOrder;
