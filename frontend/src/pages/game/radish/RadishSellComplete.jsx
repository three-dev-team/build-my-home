import React, { useEffect, useMemo } from 'react';

import AutoMove from '../../../components/common/AutoMove.jsx';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';

const fmt = (n) => {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return '0';
  return x.toLocaleString('ko-KR');
};

export default function RadishSellComplete({
                                             open = true,

                                             // 콩돌이(너굴) UI 색
                                             nameText = '콩돌',
                                             nameColor = COLORS?.characters?.naugul?.nameBox ?? COLORS.ac.nookCyan,
                                             nameTextColor = COLORS?.characters?.naugul?.nameText ?? COLORS.ac.darkBrown,

                                             // 판매 결과
                                             soldQty = 0,
                                             soldAmount = 0,

                                             // 3초 후 자동 종료
                                             autoExitMs = 3000,
                                             onExit,
                                           }) {
  if (!open) return null;

  const qtyText = useMemo(() => fmt(soldQty), [soldQty]);
  const amtText = useMemo(() => fmt(soldAmount), [soldAmount]);

  // ✅ 3초 뒤 자동 종료
  useEffect(() => {
    if (typeof onExit !== 'function') return undefined;
    const t = window.setTimeout(() => onExit(), autoExitMs);
    return () => window.clearTimeout(t);
  }, [onExit, autoExitMs]);

  // ✅ 스샷 문구 그대로 + 숫자만 하이라이트
  const highlights = useMemo(
    () => [
      { text: qtyText, color: COLORS.ac.nookCyan },
      { text: amtText, color: COLORS.ac.nookCyan },
    ],
    [qtyText, amtText]
  );

  return (
    <>
      {/* ✅ AutoMove가 "대사보다 위" */}
      <AutoMove open text="잠시후 자동으로 이동합니다..." />

      <Subtitle
        nameText={nameText}
        nameColor={nameColor}
        nameTextColor={nameTextColor}
        contentText={`싱싱한 무 ${qtyText}개를 매입했습니다! 매입했습니다-!\n정산 금액은 총 ${amtText}벨입니다.\n감사합니다! 합니다 -!`}
        highlights={highlights}
        contentColor={COLORS.subtitle.contentBox}
        contentTextColor={COLORS.subtitle.contentText}
        showTriangle
        // ✅ 3페이지는 버튼/선택지 없음
        options={[]}
        optionDisabled
        optionColor={COLORS.subtitle.optionBox}
        optionTextColor={COLORS.subtitle.optionText}
      />
    </>
  );
}
