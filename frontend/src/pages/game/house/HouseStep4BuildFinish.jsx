import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Subtitle from '../../../components/common/Subtitle.jsx';
import AutoMove from '../../../components/common/AutoMove.jsx';
import { COLORS } from '../../../constants/colors.js';
import { HOUSE_LEVEL_MAP, getHouseIconByLevel, normalizeHouseLevelByAny } from '../../../constants/houseLevel.js';
import { roEuro } from '../../../constants/josa.js';
import './HouseStep4BuildFinish.css';

const IMG = {
  ui: '/images/board/ui-buildhouse.webp',
};

const CLOSED_FLAG = 'HOUSE_FINISH_CLOSED';

const getPlayerDisplayName = (player) => {
  const v = player?.nickname || player?.playerName || player?.memberName || player?.name || '플레이어';
  return String(v ?? '').trim() || '플레이어';
};

const getCurrentHouseLevel = (player) => {
  const cand = [player?.houseLevel, player?.house?.level, player?.house?.currentLevel, player?.homeLevel];
  const v = cand.find((x) => x !== undefined && x !== null);
  return normalizeHouseLevelByAny(v);
};

export default function HouseStep4BuildFinish({
  player,
  character,
  onCloseNow, // 즉시 닫힘(서버 브로드캐스트 1단계)
  onFinishAfter3s, // 3초 뒤 종료(서버 브로드캐스트 2단계)
  isSpectator = false,
}) {
  const myName = useMemo(() => getPlayerDisplayName(player), [player]);
  const characterId = player?.characterId;

  // 현재 집 레벨 기준으로만 표시
  const curLevel = useMemo(() => getCurrentHouseLevel(player), [player]);

  const curLevelObj = useMemo(() => {
    return (HOUSE_LEVEL_MAP || []).find((x) => Number(x?.level) === Number(curLevel)) || null;
  }, [curLevel]);

  const houseName = curLevelObj?.name || '집';

  const houseSrc = useMemo(() => {
    return getHouseIconByLevel(curLevel, characterId) || '';
  }, [curLevel, characterId]);

  // Step4 대사는 "다음 레벨"이 아니라 "현재 완성된 집" 기준
  const contentText = useMemo(() => {
    return `${houseName}${roEuro(houseName)} 공사를 진행하겠다구리!\n돌아가면 멋진 집이 완성되어있을거라구리`;
  }, [houseName]);

  const highlights = useMemo(() => {
    return [
      { text: houseName, color: COLORS.ac.nookCyan },
      { text: myName, color: character?.color || COLORS.ac.darkBrown },
    ];
  }, [houseName, myName, character?.color]);

  // 서버 동기화 닫힘 플래그(actionDataStr) 감지
  const closedByServer = useMemo(() => String(player?.actionDataStr ?? '') === CLOSED_FLAG, [player?.actionDataStr]);

  const [open, setOpen] = useState(true);
  const [lockedClosed, setLockedClosed] = useState(false); // 로컬 잠금(문구 변경 등으로 재오픈 방지)
  const nextTimerRef = useRef(null);

  // 서버 닫힘/로컬 잠금이면 문구가 바뀌어도 다시 열지 않음
  useEffect(() => {
    if (closedByServer) return;
    if (lockedClosed) return;
    setOpen(true);
  }, [contentText, closedByServer, lockedClosed]);

  // 서버가 닫힘 플래그를 뿌리면 모두 닫힘(관전자 포함)
  useEffect(() => {
    if (closedByServer) {
      setLockedClosed(true);
      setOpen(false);
    }
  }, [closedByServer]);

  useEffect(() => {
    return () => {
      if (nextTimerRef.current) {
        clearTimeout(nextTimerRef.current);
        nextTimerRef.current = null;
      }
    };
  }, []);

  const handleOk = useCallback(() => {
    if (isSpectator) return;

    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }

    // 로컬 잠금 -> 즉시 닫기 -> 서버에 닫힘 브로드캐스트 -> 3초 뒤 종료 브로드캐스트
    setLockedClosed(true);
    setOpen(false);
    onCloseNow?.();

    nextTimerRef.current = setTimeout(() => {
      onFinishAfter3s?.();
      nextTimerRef.current = null;
    }, 3000);
  }, [onCloseNow, onFinishAfter3s, isSpectator]);

  const options = useMemo(() => {
    if (isSpectator) return [];
    return [{ text: '알겠어!', onClick: handleOk }];
  }, [isSpectator, handleOk]);

  return (
    <div className="houseStep4Root">
      <img src={IMG.ui} alt="" draggable={false} className="houseStep4Ui" />

      <AutoMove />

      <div
        className="houseStep4TitleBox"
        style={{
          left: 'calc(var(--uiOffsetX) + (60 * var(--s)))',
          top: 'calc(var(--uiOffsetY) + (188 * var(--s)))',
          width: 'calc(280 * var(--s))',
          height: 'calc(140 * var(--s))',
        }}
      >
        <div className="houseStep4Title" style={{ color: COLORS.ac.grass }}>
          {myName}의
          <br />
          {houseName}
        </div>
      </div>

      <div
        className="houseStep4ImageBox"
        style={{
          top: 'calc(var(--uiOffsetY) + (188 * var(--s)))',
          width: 'calc(600 * var(--s))',
          height: 'calc(500 * var(--s))',
        }}
      >
        {!!houseSrc && <img src={houseSrc} alt="house" draggable={false} className="houseStep4HouseImg" />}
      </div>

      {open && (
        <Subtitle
          nameText="너굴"
          nameColor={COLORS.characters.naugul.nameBox}
          nameTextColor={COLORS.characters.naugul.nameText}
          contentText={contentText}
          highlights={highlights}
          options={options}
          optionDisabled={isSpectator}
        />
      )}
    </div>
  );
}
