import React, { useMemo } from 'react';
import { HOUSE_LEVEL_MAP, getHouseIconByLevel } from '../../../constants/houseLevel.js';
import { rewardIconSrc, RESOURCE_ORDER, getCount } from '../../../constants/reward.js';
import './HouseStep2Materials.css';

const IMG = {
  bell: '/images/board/icon-bell.webp',
};

// 레벨 객체에서 "필요 재화 목록"을 [{key,count}] 형태로 뽑기(0개는 제외)
const buildReqs = (levelObj) => {
  if (!levelObj) return [];
  return RESOURCE_ORDER
    .map((K) => {
      const lower = String(K).toLowerCase();
      const cnt = getCount(levelObj, lower);
      return { key: K, count: cnt };
    })
    .filter((x) => Number(x?.count) > 0);
};

export default function HouseStep2Materials({ px, player }) {
  // level 1~5만 표시(안내서 카드 5개)
  const levels = useMemo(
    () => (HOUSE_LEVEL_MAP || []).filter((x) => Number(x?.level) >= 1 && Number(x?.level) <= 5),
    [],
  );

  const characterId = player?.characterId;

  return (
    <div className="houseMatPanel">
      <div className="houseMatTitle">집 재료 안내서</div>

      <div className="houseMatRow">
        {levels.map((lv) => {
          const levelNum = Number(lv?.level);

          // 레벨별 집 아이콘(레벨 5는 캐릭터별 houseImage도 고려)
          const houseIcon =
            lv?.icon ||
            getHouseIconByLevel(lv?.key, characterId) ||
            getHouseIconByLevel(levelNum, characterId) ||
            null;

          const reqs = buildReqs(lv);
          const bell = typeof lv?.bell === 'number' ? lv.bell : Number(lv?.bell || 0);

          return (
            <div key={lv?.key ?? levelNum} className="houseMatCard">
              <div className="houseMatLevel">{`level ${levelNum}`}</div>

              <div className="houseMatImgBox">
                {houseIcon ? <img src={houseIcon} alt={`house-${levelNum}`} draggable={false} className="houseMatImg" /> : null}
              </div>

              <div className="houseMatName">{lv?.name || ''}</div>

              <div className="houseMatReqs">
                <div className="houseMatBellRow">
                  <img src={IMG.bell} alt="bell" draggable={false} className="houseMatIcon" />
                  <span>{`x${bell}`}</span>
                </div>

                <div className="houseMatResWrap">
                  {reqs.map((r) => (
                    <div key={r.key} className="houseMatResItem">
                      <img src={rewardIconSrc(r.key)} alt={r.key} draggable={false} className="houseMatIcon" />
                      <span>{`x${r.count}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
