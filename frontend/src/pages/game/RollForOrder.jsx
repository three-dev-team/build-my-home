import React, { useState, useCallback } from 'react';
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
  const myDiceValue = players.find((p) => p.memberId === myId)?.orderDiceValue;
  const [animationDone, setAnimationDone] = useState({});
  const [blackoutOpen, setBlackoutOpen] = useState(false);

  // 스페이스바: 내 주사위 아직 안 굴렸을 때만
  useSpaceKey(() => onRoll(), { enabled: !myDiceValue });

  // 전원 완료 체크
  const allDiceRolled = players.every((p) => p.orderDiceValue);
  const allAnimDone = players.every((p) => animationDone[p.memberId]);

  // 전원 애니메이션 끝나면 order-complete 호출 (turnOrder[0]만)
  const handleAnimEnd = useCallback((memberId) => {
    setAnimationDone((prev) => {
      const next = { ...prev, [memberId]: true };

      // 이 시점에서 전원 체크
      const everyoneDone = players.every((p) => next[p.memberId]);
      const everyoneRolled = players.every((p) => p.orderDiceValue);

      if (everyoneDone && everyoneRolled&&!blackoutOpen) {
        setBlackoutOpen(true); // 바로 전환효과 시작
      }

      return next;
    });
  }, [players]);

  const CHARACTER_IMG = CHARACTERS.reduce((acc, char) => {
    acc[Number(char.id)] = char.selectBasicImage;
    return acc;
  }, {});

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
          const charImg = player.characterId ? CHARACTER_IMG[player.characterId] : null;

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
                <Shadow>
                  <img src={charImg} alt={player.nickname} />
                  <div className={`nickname-tag ${isMe ? 'highlight' : ''}`}>{player.nickname}</div>
                </Shadow>
              </div>
            </div>
          );
        })}
      </div>
      <CircleBlackout
        open={blackoutOpen}
        mode="in"
        durationMs={550}
        onDone={() => onOrderComplete?.()} // 화면이 완전히 닫히면 서버 호출
      />
    </div>
  );
};

export default RollForOrder;
