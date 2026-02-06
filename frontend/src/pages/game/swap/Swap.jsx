// Swap.jsx
import { useMemo } from 'react';
import FadeBlurTransition from '../../../components/common/FadeBlurTransition.jsx';
import './Swap.css';

import EntryScreen from './EntryScreen.jsx';
import SelectCategory from './SelectCategory.jsx';
import SelectFirstPlayer from './SelectFirstPlayer.jsx';
import SelectSecondPlayer from './SelectSecondPlayer.jsx';
import SelectArrow from './SelectArrow.jsx';
import ResultScreen from './ResultScreen.jsx';

export default function Swap({ isMyTurn, player, players, gameState, onAction, onExit }) {
  const stage = useMemo(() => Number(player?.uiStep ?? 0), [player?.uiStep]);

  // 플레이어 1명이면 자동 종료
  if (!players || players.length <= 1) {
    onExit?.();
    return null;
  }

  const commonProps = {
    isMyTurn,
    player,
    players,
    gameState,
    onAction,
    onExit,
  };

  const renderStage = () => {
    switch (stage) {
      case 0:
        return <EntryScreen {...commonProps} />;
      case 1:
        return <SelectCategory {...commonProps} />;
      case 2:
        return <SelectFirstPlayer {...commonProps} />;
      case 3:
        return <SelectSecondPlayer {...commonProps} />;
      case 4:
        return <SelectArrow {...commonProps} />;
      case 5:
        return <ResultScreen {...commonProps} />;
      default:
        return <EntryScreen {...commonProps} />;
    }
  };

  return <FadeBlurTransition stageKey={stage}>{renderStage()}</FadeBlurTransition>;
}
