import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AspectLayout from '../components/layout/AspectLayout';
import Subtitle from '../components/common/Subtitle';
import { COLORS } from '../constants/colors.js';

const NotFound = () => {
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState(false);

  const fullText = '거긴 길이 없다고!\n갑자기 툭 튀어나오면 어쩌자는 거야!\n제대로 된 주소 치고 돌아가!';

  return (
    <AspectLayout>
      <div
        className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/404.jpg)' }}
      >
        <Subtitle
          nameText="도루묵씨"
          nameColor={COLORS.characters.dorumook.nameBox}
          nameTextColor={COLORS.characters.dorumook.nameText}
          contentText={fullText}
          onTypingComplete={() => setShowOptions(true)}
          showTriangle={!showOptions}
          options={
            showOptions
              ? [{ text: '돌아가자..', onClick: () => navigate('/home') }]
              : []
          }
        />
      </div>
    </AspectLayout>
  );
};

export default NotFound;
