import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment } from '@react-three/drei';

const DiceModel = ({ value, onAnimationEnd }) => {
  const group = useRef();
  const hasEnded = useRef(false); // 중복 방지 플래그
  const { scene, animations } = useGLTF(`/images/dice/dice-1.glb`);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const action = actions[Object.keys(actions)[0]];
      if (action) {
        hasEnded.current = false; // 리셋

        action.reset();
        action.repetitions = 1; // 1번만 재생
        action.clampWhenFinished = true;
        action.timeScale = 0.7;

        // 처음부터 끝까지 전체 재생
        action.time = 0;
        action.play();

        // 애니메이션 끝나면 콜백
        const mixer = action.getMixer();
        const onFinished = () => {
          if (!hasEnded.current) {
            // 한 번만 실행
            hasEnded.current = true;
            onAnimationEnd?.();
          }
        };
        mixer.addEventListener('finished', onFinished);

        return () => {
          mixer.removeEventListener('finished', onFinished);
          action.stop(); // cleanup 시 정지
        };
      }
    }
  }, [actions]);

  return <primitive ref={group} object={scene} scale={0.9} />;
};

const Dice3D = ({ value, onAnimationEnd }) => {
  const [showImage, setShowImage] = useState(false);

  // 애니메이션 끝나면 1초 후 이미지 표시
  const handleAnimationEnd = () => {
    setTimeout(() => {
      setShowImage(true);

      // 이미지 보여주고 0.5초 후 최종 콜백
      setTimeout(() => {
        onAnimationEnd?.();
      }, 2000);
    }, 500);
  };

  if (showImage) {
    return (
      <img
        src={`/images/dice/dice-result-${value}.webp`}
        alt={`주사위 ${value}`}
        className="dice-result-img bounce-in"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      {/* 환경맵 - 전체적인 분위기/반사광 결정 (sunset = 따뜻한 노을 톤) */}
      <Environment preset="sunset" />

      {/* 주변광 - 모든 방향에서 균일하게 비추는 빛 (그림자 없음) */}
      {/* intensity: 밝기 (0~2), color: 빛 색상 */}
      <ambientLight intensity={2} color="#ffcc88" />

      {/* 방향광 - 태양처럼 한 방향에서 비추는 빛 (그림자 생성) */}
      {/* position: 빛이 오는 위치, intensity: 밝기, color: 빛 색상 */}
      <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffaa55" />

      <DiceModel value={value} onAnimationEnd={handleAnimationEnd} />
    </Canvas>
  );
};
export default Dice3D;
