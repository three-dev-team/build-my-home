import './css/PlayerStatusPanel.css';
import { CHARACTERS } from '../../constants/characters.js';
import { getHouseIconByLevel } from '../../constants/houseLevel.js';
import { ITEM_INFO_BY_KEY, resolveItemKey } from '../../constants/items.js';

const IMG = {
  bell: '/images/board/icon-bell.webp',
  loan: '/images/board/icon-loan.webp',
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

const toItemMeta = (raw) => {
  const meta = resolveItemKey?.(raw);
  if (meta) return meta;

  const key = raw === null || raw === undefined ? '' : String(raw).trim();
  return ITEM_INFO_BY_KEY[key] || null;
};

export default function PlayerStatusPanel({ players = [], currentPlayerId, myId }) {
  const sortedPlayers = [...players].sort((a, b) => {
    const ah = Number(a.houseLevel);
    const bh = Number(b.houseLevel);
    if (bh !== ah) return bh - ah;
    return Number(b.bell) - Number(a.bell);
  });

  return (
    <div className="ps-container" role="presentation">
      <div className="ps-row">
        {sortedPlayers.map((player, index) => {
          const isCurrentTurn = Number(player.memberId) === Number(currentPlayerId);
          const isMe = Number(player.memberId) === Number(myId);

          const ch = getCharacter(player.characterId);
          const iconImg = ch?.roomListImage || null;

          const bell = Number(player.bell ?? 0);
          const loan = Number(player.loan ?? 0);
          const houseLevel = Number(player.houseLevel ?? 0);

          const houseIcon = getHouseIconByLevel(houseLevel);

          const rawItems = Array.isArray(player.items) ? player.items.slice(0, 3) : [];
          const itemMetas = rawItems.map(toItemMeta);

          return (
            <div
              key={player.memberId}
              className={`ps-card ${isCurrentTurn ? 'is-current' : ''} ${isMe ? 'is-me' : ''}`}
            >
              <div className="ps-box">
                {/* 집 + 랭크 */}
                <div className="ps-left">
                  <div className="ps-house" aria-label="집 레벨 아이콘">
                    {houseIcon ? (
                      <img className="ps-house-img" src={houseIcon} alt="" draggable={false} />
                    ) : (
                      <span className="ps-house-dot" aria-hidden />
                    )}
                  </div>

                  <div className="ps-rank f1">{getRankText(index)}</div>
                </div>

                {/* 캐릭터 */}
                <div className="ps-char" aria-label="캐릭터 아이콘">
                  {iconImg ? (
                    <img className="ps-char-img" src={iconImg} alt="" draggable={false} />
                  ) : (
                    <div className="ps-char-ph" aria-hidden />
                  )}
                </div>

                {/* 돈 */}
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

                {/* 아이템 */}
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
