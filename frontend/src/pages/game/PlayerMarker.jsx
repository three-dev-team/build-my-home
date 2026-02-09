import React, { useMemo } from 'react';
import { getTileById, getPawnOffset } from '../../constants/boardData';
import { CHARACTERS } from '../../constants/characters.js';
import Shadow from '../../components/common/Shadow.jsx';
import './css/PlayerMarker.css';

const BASE_W = 1920;
const BASE_H = 1080;

const findCharacter = (characterId) => {
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;
  return (CHARACTERS || []).find((c) => Number(c?.id) === id) || null;
};

const PlayerMarker = ({
                        player,
                        animatingPosition,
                        slotIndex = 0,
                        countOnTile = 1,
                        isMoving = false,
                      }) => {
  // 현재 위치 값 산출
  const position = animatingPosition ?? player?.position;

  // position 기반 타일 메타 조회
  const tile = getTileById(position);
  if (!tile) return null;

  // 동일 타일 내 말 분산 오프셋 계산
  const { dx, dy } = getPawnOffset(tile, slotIndex, countOnTile);

  // 오프셋 비율값 산출
  const dxr = (Number(dx) || 0) / BASE_W;
  const dyr = (Number(dy) || 0) / BASE_H;

  // 캐릭터 메타 조회
  const character = useMemo(() => findCharacter(player?.characterId), [player?.characterId]);

  // 캐릭터 이미지 소스
  const imgSrc = character?.selectBasicImage || '';

  // 보드 기준 픽셀 좌표 산출
  const xPx = (Number(tile?.rCenterX ?? 0) * BASE_W) + (Number(dx) || 0);
  const yPx = (Number(tile?.rCenterY ?? 0) * BASE_H) + (Number(dy) || 0);

  // 보드 스케일 변수(--s) 기반 좌표 적용
  const leftCss = `calc(${xPx} * var(--s))`;
  const topCss  = `calc(${yPx} * var(--s))`;

  // z-index 기본값
  const baseZ = 3000;

  // y 오프셋 기반 깊이 정렬값
  const zByDepth = Math.round((Number(dy) || 0) * 10);

  // 슬롯 인덱스 기반 미세 정렬값
  const zBySlot = (Number(slotIndex) || 0);

  // 최종 z-index 값
  const zIndex = baseZ + zByDepth + zBySlot;

  return (
    <div
      className={`player-marker ${isMoving ? 'is-moving' : ''}`}
      style={{
        left: leftCss,
        top: topCss,
        zIndex,
      }}
    >
      <Shadow fill>
        <div className="player-marker-wrap">
          <div className="player-marker-box">
            <img
              src={imgSrc}
              alt={player?.nickname || 'player'}
              className="character-img"
              draggable={false}
            />
          </div>
        </div>
      </Shadow>
    </div>
  );
};

export default PlayerMarker;
