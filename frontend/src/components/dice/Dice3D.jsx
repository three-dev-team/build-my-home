import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';

const DiceModel = ({ value, onAnimationEnd }) => {
  const group = useRef();
  // const { scene, animations } = useGLTF(`/images/dice/dice-${value}.glb`);
  const { scene, animations } = useGLTF(`/images/dice/dice-6.glb`);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const action = actions[Object.keys(actions)[0]];
      if (action) {
        action.reset();
        action.repetitions = 1; // 1번만 재생
        action.clampWhenFinished = true;
        action.play();

        // 애니메이션 끝나면 콜백
        const mixer = action.getMixer();
        const onFinished = () => {
          onAnimationEnd?.();
        };
        mixer.addEventListener('finished', onFinished);

        return () => {
          mixer.removeEventListener('finished', onFinished);
        };
      }
    }
  }, [actions, onAnimationEnd]);

  return <primitive ref={group} object={scene} />;
};

const Dice3D = ({ value, onAnimationEnd }) => {
  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <DiceModel value={value} onAnimationEnd={onAnimationEnd} />
    </Canvas>
  );
};

export default Dice3D;
