import './css/PlayerStatusPanel.css';
import { CHARACTERS } from '../../constants/characters.js';

const IMG = {
  bell: '/images/board/icon-bell.webp',
  loan: '/images/board/icon-loan.png',
};

const HOUSE_ICON_BY_LEVEL = {
  1: '/images/board/land.webp',
  2: '/images/board/tent.webp',
  3: '/images/board/house_1.webp',
  4: '/images/board/house_2.webp',
};

const getRankText = (index) => {
  const rank = index + 1;
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
};

const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

export default function PlayerStatusPanel({ players = [], currentPlayerId, myId }) {
  // 순위 정렬: 집 레벨 높은 순 -> 벨 많은 순
  const sortedPlayers = [...players].sort((a, b) => {
    if (Number(b.houseLevel) !== Number(a.houseLevel)) return Number(b.houseLevel) - Number(a.houseLevel);
    return Number(b.bell) - Number(a.bell);
  });

  return (
    <div className="ps-container" role="presentation">
      <div className="ps-row">
        {sortedPlayers.map((player, index) => {
          // 현재 턴/내 카드 여부
          const isCurrentTurn = Number(player.memberId) === Number(currentPlayerId);
          const isMe = Number(player.memberId) === Number(myId);

          // 캐릭터 데이터 및 아이콘(roomListImage 고정)
          const ch = getCharacter(player.characterId);
          const iconImg = ch?.roomListImage || null;

          // 표시용 숫자(기본값 방어)
          const bell = Number(player.bell ?? 0);
          const loan = Number(player.loan ?? 0);
          const houseLevel = Number(player.houseLevel ?? 0);

          // 집 아이콘(레벨별, 없으면 도트)
          const houseIcon = HOUSE_ICON_BY_LEVEL[houseLevel] || null;

          // 아이템 3칸만 노출
          const items = Array.isArray(player.items) ? player.items.slice(0, 3) : [];

          return (
            <div
              key={player.memberId}
              className={`ps-card ${isCurrentTurn ? 'is-current' : ''} ${isMe ? 'is-me' : ''}`}
            >
              <div className="ps-box">
                {/* 왼쪽 블록: 집 아이콘 + 랭크 */}
                <div className="ps-left">
                  <div className="ps-house" aria-label="집 레벨 아이콘">
                    {houseIcon ? (
                      <img className="ps-house-img" src={houseIcon} alt="" />
                    ) : (
                      <span className="ps-house-dot" aria-hidden />
                    )}
                  </div>

                  <div className="ps-rank f1">{getRankText(index)}</div>
                </div>

                {/* 캐릭터 아이콘(roomListImage) */}
                <div className="ps-char" aria-label="캐릭터 아이콘">
                  {iconImg ? (
                    <img className="ps-char-img" src={iconImg} alt="" />
                  ) : (
                    <div className="ps-char-ph" aria-hidden />
                  )}
                </div>

                {/* 재화: 벨 / 대출 */}
                <div className="ps-money" aria-label="돈 영역">
                  <div className="ps-money-row">
                    <img className="ps-money-icon" src={IMG.bell} alt="" />
                    <div className="ps-money-val f1">{bell}</div>
                  </div>
                  <div className="ps-money-row">
                    <img className="ps-money-icon" src={IMG.loan} alt="" />
                    <div className="ps-money-val f1">{loan}</div>
                  </div>
                </div>

                {/* 아이템 3칸 */}
                <div className="ps-items" aria-label="아이템 3칸">
                  {Array.from({ length: 3 }).map((_, i) => {
                    const item = items[i];
                    return (
                      <div key={i} className="ps-item-slot">
                        {item ? (
                          <img className="ps-item-img" src={item} alt="" />
                        ) : (
                          <span className="ps-item-dot" aria-hidden />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 닉네임 */}
              <div className="ps-nickname" title={player.nickname}>
                {player.nickname}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
