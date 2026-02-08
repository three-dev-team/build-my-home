import './css/PlayerStatusPanel.css';
import { useMemo } from 'react';

import { CHARACTERS } from '../../constants/characters.js';
import { getHouseIconByLevel, HOUSE_DETAILS } from '../../constants/houseLevel.js';
import { ITEM_INFO_BY_KEY, resolveItemKey } from '../../constants/items.js';
import { COLORS, withAlpha } from '../../constants/colors.js';

const IMG = {
  bell: '/images/board/icon-bell.webp',
  loan: '/images/board/icon-loan.webp',
};

// 순위 숫자 -> 1st/2nd/3rd/nth 변환
const getRankText = (rank) => {
  const n = Number(rank);
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
};

// characterId -> 캐릭터 메타 조회
const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

// 아이템 raw -> 아이템 메타 정규화
const toItemMeta = (raw) => {
  const meta = resolveItemKey?.(raw);
  if (meta) return meta;

  const key = raw === null || raw === undefined ? '' : String(raw).trim();
  return ITEM_INFO_BY_KEY[key] || null;
};

// houseLevel 입력(숫자/키/문자열) -> 레벨 숫자 정규화
const normalizeHouseLevelNumber = (levelOrKey) => {
  if (levelOrKey === null || levelOrKey === undefined) return 0;

  if (typeof levelOrKey === 'number') {
    return Number.isFinite(levelOrKey) ? levelOrKey : 0;
  }

  const s = String(levelOrKey).trim();
  if (!s) return 0;

  const byKey = HOUSE_DETAILS?.[s];
  if (byKey && typeof byKey.level === 'number') return byKey.level;

  const asNum = Number(s);
  if (Number.isFinite(asNum)) return asNum;

  return 0;
};

// 랭킹 산정(loan ↑, houseLevel ↓, bell ↓) -> rankMap(memberId -> denseRank)
const buildRankMap = (players) => {
  const list = Array.isArray(players) ? players.slice() : [];

  list.sort((a, b) => {
    const aloan = Number(a?.loan ?? 0);
    const bloan = Number(b?.loan ?? 0);
    if (aloan !== bloan) return aloan - bloan;

    const ah = normalizeHouseLevelNumber(a?.houseLevel);
    const bh = normalizeHouseLevelNumber(b?.houseLevel);
    if (ah !== bh) return bh - ah;

    const abell = Number(a?.bell ?? 0);
    const bbell = Number(b?.bell ?? 0);
    return bbell - abell;
  });

  const rankMap = new Map();
  if (!list.length) return rankMap;

  let denseRank = 1;
  rankMap.set(Number(list[0]?.memberId), denseRank);

  for (let i = 1; i < list.length; i += 1) {
    const prev = list[i - 1];
    const cur = list[i];

    const sameLoan = Number(prev?.loan ?? 0) === Number(cur?.loan ?? 0);
    const sameHouse =
      normalizeHouseLevelNumber(prev?.houseLevel) === normalizeHouseLevelNumber(cur?.houseLevel);
    const sameBell = Number(prev?.bell ?? 0) === Number(cur?.bell ?? 0);

    if (!(sameLoan && sameHouse && sameBell)) denseRank += 1;
    rankMap.set(Number(cur?.memberId), denseRank);
  }

  return rankMap;
};

// turnOrder 기준으로 "현재 턴부터" 시작하도록 players 회전
const buildTurnRotatedPlayers = (players, turnOrder, currentPlayerId, originalTurnOrder) => {
  const list = Array.isArray(players) ? players.slice() : [];
  const origOrder = Array.isArray(originalTurnOrder) ? originalTurnOrder.map((x) => Number(x)) : [];
  const curId = Number(currentPlayerId);
  const byId = new Map(list.map((p) => [Number(p?.memberId), p]));

  // fallback: 비정상이면 originalTurnOrder 기준 정렬
  if (!curId || !origOrder.length) {
    if (origOrder.length) {
      return origOrder.map((id) => byId.get(id)).filter(Boolean);
    }
    return list;
  }

  // originalTurnOrder 기준으로 현재 턴부터 회전
  const idx = origOrder.findIndex((id) => id === curId);
  if (idx < 0) return list;
  const rotated = origOrder.slice(idx).concat(origOrder.slice(0, idx));

  return rotated.map((id) => byId.get(id)).filter(Boolean);
};

// const buildTurnRotatedPlayers = (players, turnOrder, currentPlayerId) => {
//   const list = Array.isArray(players) ? players.slice() : [];
//   const order = Array.isArray(turnOrder) ? turnOrder.map((x) => Number(x)) : [];
//   const curId = Number(currentPlayerId);
//
//   if (!order.length || !curId) return list;
//
//   const byId = new Map(list.map((p) => [Number(p?.memberId), p]));
//   const idx = order.findIndex((id) => id === curId);
//   if (idx < 0) return list;
//
//   const rotatedIds = order.slice(idx).concat(order.slice(0, idx));
//   const rotatedPlayers = rotatedIds.map((id) => byId.get(id)).filter(Boolean);
//
//   // turnOrder 누락 플레이어 보정
//   const included = new Set(rotatedPlayers.map((p) => Number(p?.memberId)));
//   const extras = list.filter((p) => !included.has(Number(p?.memberId)));
//
//   return rotatedPlayers.concat(extras);
// };

export default function PlayerStatusPanel({ players = [], currentPlayerId, myId, turnOrder = [], originalTurnOrder = [] }) {
  // 카드 배치용(현재 턴부터) players
  const rotatedPlayers = buildTurnRotatedPlayers(players, turnOrder, currentPlayerId, originalTurnOrder);
  // 랭킹 표시용(memberId -> rankNum)
  const rankMap = buildRankMap(players);

  const cssVars = useMemo(
    () => ({
      '--ps-box-border': withAlpha(COLORS.ac.black, 0.3),
      '--ps-box-bg': withAlpha(COLORS.ac.white, 0.3),
      '--ps-text-white-95': withAlpha(COLORS.ac.white, 0.95),
      '--ps-text-white-92': withAlpha(COLORS.ac.white, 0.92),
      '--ps-stroke-30': withAlpha(COLORS.ac.black, 0.3),
      '--ps-dot-30': withAlpha(COLORS.ac.black, 0.3),
      '--ps-ph-bg': withAlpha(COLORS.ac.black, 0.08),
      '--ps-nickname-bg': withAlpha(COLORS.ac.black, 0.3),
    }),
    []
  );

  return (
    <div className="ps-container" role="presentation" style={cssVars}>
      <div className="ps-row">
        {rotatedPlayers.map((player) => {
          const pid = Number(player?.memberId);
          const isCurrentTurn = pid === Number(currentPlayerId);
          const isMe = pid === Number(myId);
          const ch = getCharacter(player?.characterId);
          const iconImg = ch?.roomListImage || null;
          const bell = Number(player?.bell ?? 0);
          const loan = Number(player?.loan ?? 0);
          // MYHOME(프론트) = HOUSE_3(백엔드)인 경우 캐릭터별 houseImage를 쓰려면 characterId가 필요
          const houseIcon = getHouseIconByLevel(player?.houseLevel, player?.characterId);
          const rawItems = Array.isArray(player?.items) ? player.items.slice(0, 3) : [];
          const itemMetas = rawItems.map(toItemMeta);
          // 카드 index 대신 rankMap 기준 랭크 사용
          const rankNum = rankMap.get(pid) ?? 1;

          return (
            <div
              key={pid}
              className={`ps-card ${isCurrentTurn ? 'is-current' : ''} ${isMe ? 'is-me' : ''} ${player?.disconnected ? 'is-disconnected' : ''}`}
            >
              <div className="ps-box">
                {/* 집/랭크 */}
                <div className="ps-left">
                  <div className="ps-house" aria-label="집 레벨 아이콘">
                    {houseIcon ? (
                      <img className="ps-house-img" src={houseIcon} alt="" draggable={false} />
                    ) : (
                      <span className="ps-house-dot" aria-hidden />
                    )}
                  </div>
                  <div className="ps-rank f1">{getRankText(rankNum)}</div>
                </div>

                {/* 캐릭터 */}
                <div className="ps-char" aria-label="캐릭터 아이콘">
                  {iconImg ? (
                    <img className="ps-char-img" src={iconImg} alt="" draggable={false} />
                  ) : (
                    <div className="ps-char-ph" aria-hidden />
                  )}
                </div>

                {/* 소지금/대출 */}
                <div className="ps-money" aria-label="돈 영역">
                  <div className="ps-money-row">
                    <img className="ps-money-icon" src={IMG.bell} alt="" draggable={false} />
                    <div className="ps-money-val f1">{bell}</div>
                  </div>
                  <div className="ps-money-row">
                    <img className="ps-money-icon" src={IMG.loan} alt="" draggable={false} />
                    <div className="ps-money-val f1">{loan}</div>
                  </div>
                </div>

                {/* 아이템 3칸 */}
                <div className="ps-items" aria-label="아이템 3칸">
                  {Array.from({ length: 3 }).map((_, i) => {
                    const meta = itemMetas[i];
                    return (
                      <div key={i} className="ps-item-slot">
                        {meta?.image ? (
                          <img className="ps-item-img" src={meta.image} alt="" draggable={false} />
                        ) : (
                          <span className="ps-item-dot" aria-hidden />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 닉네임 */}
              <div className="ps-nickname" title={player?.nickname}>
                {player?.nickname}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
