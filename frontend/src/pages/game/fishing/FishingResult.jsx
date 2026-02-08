import Subtitle from '../../../components/common/Subtitle.jsx';
import AutoMove from '../../../components/common/AutoMove.jsx';

import { CHARACTERS } from '../../../constants/characters.js';
import { rewardImageSrc, koName } from '../../../constants/reward.js';
import { eulReul } from '../../../utils/josa.js';

import './Fishing.css';

const findCharacter = (characterId) => {
  // 캐릭터 id로 메타 찾기
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;
  return (CHARACTERS || []).find((c) => Number(c?.id) === id) || null;
};

const inferSuccess = (msgObj) => {
  // 결과 성공/실패 추론(서버 success 있으면 우선)
  if (typeof msgObj?.success === 'boolean') return msgObj.success;

  const harvestType = String(msgObj?.harvestType ?? '').trim();
  if (!harvestType) return false;

  const text = String(msgObj?.message ?? '').trim();
  if (text.includes('도망')) return false;

  const gainedQty = Number(msgObj?.gainedQty);
  if (Number.isFinite(gainedQty) && gainedQty <= 0) return false;

  return true;
};

const normalizeHabit = (habitRaw) => {
  // 말버릇 문자열 안전 정리
  const h = String(habitRaw ?? '').trim();
  if (!h) return '';
  if (h.includes('${')) return '';
  return h;
};

const normalizeResultMessage = (rawMessage, success, fishName, habit) => {
  // 결과 메시지 구성(성공/실패 + 말버릇)
  const h = normalizeHabit(habit);

  if (success) {
    const name = String(fishName ?? '').trim();
    if (name) return `${name}${eulReul(name)} 잡았어!${h ? ` ${h}~!` : ''}`;
    return `물고기를 잡았어!${h ? ` ${h}~!` : ''}`;
  }

  const s = String(rawMessage ?? '').trim();
  const base = s.includes('시간 초과') ? '물고기가 도망갔어...' : s || '물고기가 도망갔어...';

  return `${base}${h ? ` ${h}...` : ''}`;
};

const RESULT_SIZE_BY_CHAR = {
  2: { success: { h: 500 }, fail: { h: 480 } }, // 미첼
  4: { success: { h: 510 }, fail: { h: 510 } }, // 빙티
  3: { success: { h: 480 }, fail: { h: 430 } }, // 메이플
  1: { success: { h: 440 }, fail: { h: 410 } }, // 애플
};

const buildSizeStyle = (spec) => {
  // 캐릭터 결과 이미지 크기 스펙 적용
  if (!spec) return undefined;

  const w = Number(spec.w);
  const h = Number(spec.h);

  if (Number.isFinite(w)) return { width: `calc(${w} * var(--s, 1))`, height: 'auto' };
  if (Number.isFinite(h)) return { width: 'auto', height: `calc(${h} * var(--s, 1))` };
  return undefined;
};

const FISH_LAYOUT_BY_KEY = {
  FISH_RARE: { h: 500, x: 310, y: 250 },
  FISH_MEDIUM_1: { w: 430, x: 718, y: 464 },
  FISH_LARGE: { h: 1060, x: 506, y: 0 },
  FISH_MEDIUM_2: { h: 160, x: 618, y: 475 },
  FISH_SMALL_2: { w: 190, x: 985, y: 450 },
  FISH_SMALL_1: { h: 110, x: 960, y: 445 },
};

const buildFishStyleByKey = (harvestTypeKey) => {
  // 물고기 이미지 배치 스펙 적용
  const key = String(harvestTypeKey || '').trim();
  const spec = FISH_LAYOUT_BY_KEY[key];
  if (!spec) return undefined;

  const x = Number(spec.x);
  const y = Number(spec.y);

  const style = {
    position: 'absolute',
    transform: 'none',
    left: Number.isFinite(x) ? `calc(${x} * var(--s, 1))` : undefined,
    top: Number.isFinite(y) ? `calc(${y} * var(--s, 1))` : undefined,
  };

  const w = Number(spec.w);
  const h = Number(spec.h);

  if (Number.isFinite(w)) {
    style.width = `calc(${w} * var(--s, 1))`;
    style.height = 'auto';
  } else if (Number.isFinite(h)) {
    style.width = 'auto';
    style.height = `calc(${h} * var(--s, 1))`;
  }

  return style;
};

export default function FishingResult({ currentPlayerName, currentPlayerCharacterId, resultMessage }) {
  const harvestType = String(resultMessage?.harvestType ?? '').trim();
  const isSuccess = inferSuccess(resultMessage);

  const fishName = harvestType ? koName(harvestType) : '';

  const characterIdNum = Number(currentPlayerCharacterId);
  const character = findCharacter(characterIdNum);
  const habit = character?.habit || '';

  const message = normalizeResultMessage(resultMessage?.message, isSuccess, fishName, habit);

  const fishSrc = isSuccess && harvestType ? rewardImageSrc(harvestType) : null;
  const fishStyle = buildFishStyleByKey(harvestType);

  const charImg = character ? (isSuccess ? character.successImage : character.failImage) : null;

  const entry = RESULT_SIZE_BY_CHAR[characterIdNum];
  const resultCharImgStyle = entry ? buildSizeStyle(isSuccess ? entry.success : entry.fail) : undefined;

  const subtitleColors = {
    nameColor: 'var(--bmhFishing-subtitleNameBox)',
    nameTextColor: 'var(--bmhFishing-subtitleNameText)',
  };

  const highlights =
    isSuccess && fishName
      ? [
        {
          text: fishName,
          color: 'var(--bmhFishing-highlightNookCyan)',
        },
      ]
      : [];

  return (
    <>
      <div className="bmhFishing-resultStage" aria-hidden="true">
        <div className="bmhFishing-resultCharBox" aria-hidden="true">
          {charImg ? (
            <img
              className="bmhFishing-resultChar"
              src={charImg}
              alt="result-character"
              draggable={false}
              style={resultCharImgStyle}
            />
          ) : null}
        </div>

        {fishSrc ? (
          <img
            className="bmhFishing-resultFish"
            src={fishSrc}
            alt={fishName || 'fish'}
            draggable={false}
            style={fishStyle}
          />
        ) : null}

        <div className="bmhFishing-autoMoveLayer" aria-hidden="true">
          <AutoMove />
        </div>
      </div>

      <div className="bmhFishing-resultSubtitle">
        <Subtitle
          nameText={currentPlayerName || '플레이어'}
          nameColor={subtitleColors.nameColor}
          nameTextColor={subtitleColors.nameTextColor}
          contentText={message}
          highlights={highlights}
          options={[]}
          optionDisabled
          showTriangle={false}
          typingSpeed={30}
        />
      </div>
    </>
  );
}
