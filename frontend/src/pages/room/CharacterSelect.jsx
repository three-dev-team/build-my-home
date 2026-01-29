import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { CHARACTERS } from '../../constants/characters.js';
import { COLORS } from '../../constants/colors.js'; // COLORS import
import { leaveRoom } from '../../utils/roomUtils.js';
import { getBrokerURL } from '../../utils/ws.js';

// Icons
import { CheckCircleIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/solid';

const CharacterSelect = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [takenCharacters, setTakenCharacters] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const [hoveredCharacterId, setHoveredCharacterId] = useState(null);
  const token = sessionStorage.getItem('token');

  // WebSocket Connection
  useEffect(() => {
    const client = new Client({
      brokerURL: getBrokerURL(),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        client.subscribe(`/topic/rooms/${roomId}`, (message) => {
          const data = JSON.parse(message.body);
          if (data.players) {
            const selectedIds = data.players.filter((p) => p.characterId !== null).map((p) => Number(p.characterId));
            setTakenCharacters(selectedIds);
          }
        });

        client.publish({
          destination: '/app/rooms/get-players',
          body: JSON.stringify({ roomId: roomId }),
        });
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      client.deactivate();
    };
  }, [roomId, token]);

  const handleSelect = (characterId) => {
    if (takenCharacters.includes(characterId)) return;
    if (selectedCharacter === characterId) {
      setSelectedCharacter(null); // Toggle off if clicked again? Or just keep it. Usually keep.
    } else {
      setSelectedCharacter(characterId);
    }
  };

  const handleEnter = () => {
    if (!selectedCharacter || !stompClient) return;

    stompClient.publish({
      destination: '/app/rooms/select-character',
      body: JSON.stringify({
        roomId: roomId,
        characterId: selectedCharacter,
      }),
    });
    navigate(`/rooms/${roomId}`);
  };

  const handleLeave = () => {
    leaveRoom(stompClient, roomId);
    navigate('/room-list');
  };

  // Preview Logic: Show Hovered if valid, otherwise Selected, otherwise Default (Apple or null)
  // Design implies "My Selection" is shown. If just hovering, maybe show hover preview?
  // Let's show: Hovered (if hovering and not taken) > Selected > First available or Apple.
  // Actually, standard UX: Show what you hover. If not hovering, show what you selected. If nothing selected, show instructions or neutral state.
  // The image shows "Apple" on the left and "Select Apple" behavior.
  const previewId = hoveredCharacterId || selectedCharacter || 1; // Default to ID 1 (Apple)
  const previewChar = CHARACTERS.find((c) => c.id === previewId);

  // Helper to determine image for usage in grid/preview
  // Grid uses iconIdle / iconActive.
  // Preview uses full body if available (selectBasicImage), else scales up active icon.
  const getPreviewImage = (char) => {
    if (!char) return null;
    return char.selectBasicImage || char.iconActive;
  };

  return (
    <div
      className="w-full h-screen bg-cover bg-center font-gosanja relative overflow-hidden"
      style={{ backgroundImage: "url('/images/room/bg-character-select.jpg')" }}
    >
      <div className="w-full h-full flex">
        {/* --- LEFT SECTION (Preview) (50%) --- */}
        <div className="w-1/2 h-full flex flex-col items-center justify-center relative">
          {/* House Image (Absolute Top-Left of Left Section) */}
          {previewChar && previewChar.houseImage && (
            <div className="absolute top-[15%] left-[10%] z-0 animate-fade-in">
              <img
                src={previewChar.houseImage}
                alt={`${previewChar.name}'s House`}
                className="w-[180px] h-auto object-contain drop-shadow-md hover:scale-105 transition-transform"
              />
            </div>
          )}

          {/* 캐릭터 미리보기 이미지 */}
          {/* 캐릭터 미리보기 이미지 & 설명 (상하 배치) */}
          {previewChar && (
            <div className="flex flex-col items-center mt-[40px] relative z-10 w-full">
              {/* 1. 캐릭터 이미지 (박스 위로 겹쳐보이게) */}
              {/* mb-[-60px]로 텍스트 박스와 겹침 효과 */}
              <div className="relative z-20 mb-[-60px] animate-fade-in-up">
                <img
                  src={getPreviewImage(previewChar)}
                  alt={previewChar.name}
                  className="h-[52vh] max-h-[520px] object-contain drop-shadow-2xl"
                />
              </div>

              {/* 2. 설명 텍스트 박스 (794px * 268px) */}
              <div
                className="w-[794px] h-[268px] rounded-[36px] shadow-lg flex flex-col items-center justify-end pb-[40px] relative z-10"
                style={{ backgroundColor: 'rgba(253, 251, 246, 0.9)' }} // #FDFBF6 90% opacity (user said 'stacked in white')
              >
                {/* 이름 (font 60px) */}
                <h2
                  className="text-[60px] font-black leading-none mb-4 tracking-tight"
                  style={{ color: COLORS.darkBrown }}
                >
                  {previewChar.name}
                </h2>

                {/* Dashed Line (Width 600px aligned center) */}
                <div className="w-[600px] h-[4px] border-t-4 border-dashed border-[#8A6F5D] opacity-40 mb-5" />

                {/* 명언 (font 36px) */}
                <p className="text-[36px] font-bold opacity-80 whitespace-nowrap" style={{ color: COLORS.darkBrown }}>
                  "{previewChar.quote}"
                </p>
              </div>
            </div>
          )}

          {/* 배경 장식 (나뭇잎 패턴 등은 bg 이미지에 포함됨) */}
        </div>

        {/* --- RIGHT SECTION (Grid & Actions) (50%) --- */}
        <div className="w-1/2 h-full flex flex-col items-center justify-center pt-[60px] relative">
          {/* 상단 타이틀 */}
          <h1 className="text-[60px] font-black mb-[60px]" style={{ color: COLORS.darkBrown }}>
            나의 주민을 선택해주세요
          </h1>

          {/* 캐릭터 그리드 (4x2) */}
          <div className="grid grid-cols-4 gap-[24px]">
            {CHARACTERS.map((char) => {
              const isTaken = takenCharacters.includes(char.id);
              const isSelected = selectedCharacter === char.id;
              const isHovered = hoveredCharacterId === char.id;

              return (
                <button
                  key={char.id}
                  onClick={() => !isTaken && handleSelect(char.id)}
                  onMouseEnter={() => !isTaken && setHoveredCharacterId(char.id)}
                  onMouseLeave={() => setHoveredCharacterId(null)}
                  disabled={isTaken}
                  className={`
                     relative w-[160px] h-[160px] rounded-[36px] bg-[#FDFBF6] shadow-lg flex items-center justify-center transition-all
                     ${isTaken ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                     ${/* Hover or Selected border */ ''}
                   `}
                  style={{
                    // Hover 시 또는 선택 시 테두리 (디자인: hover 시 8px solid nookCyan, selected도 동일할듯)
                    boxShadow:
                      isSelected || (!isTaken && isHovered)
                        ? `0 0 0 8px ${COLORS.ac.nookCyan}`
                        : '0 4px 6px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* 캐릭터 아이콘 */}
                  <img src={char.iconIdle} alt={char.name} className="w-[120px] h-[120px] object-contain" />

                  {/* 선택됨 뱃지 (체크마크) */}
                  {isSelected && (
                    <div
                      className="absolute -top-[16px] -right-[16px] w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-md z-10"
                      style={{ backgroundColor: COLORS.ac.nookCyan }}
                    >
                      <CheckCircleIcon className="w-[40px] h-[40px] text-white" />
                    </div>
                  )}

                  {/* 이미 선택됨 (다른 사람) 라벨? (디자인엔 없음, 그냥 딤처리만 되어있음) */}
                </button>
              );
            })}
          </div>

          {/* 하단 버튼 영역 */}
          <div className="mt-[80px] flex flex-col items-center gap-4">
            {/* 선택하기 버튼 */}
            <button
              onClick={handleEnter}
              disabled={!selectedCharacter}
              className={`
                 w-[400px] h-[120px] rounded-[48px] flex items-center justify-center shadow-xl transition-all
                 ${selectedCharacter ? 'hover:brightness-105 active:scale-95' : 'opacity-50 cursor-not-allowed'}
               `}
              style={{ backgroundColor: COLORS.ac.nookCyan }}
            >
              <span className="text-[50px] font-black text-white pb-2">선택하기</span>
            </button>
          </div>

          {/* 뒤로가기 (나가기) - 우측 하단 절대 위치 */}
          <div className="absolute bottom-[40px] right-[40px]">
            <button
              onClick={handleLeave}
              className="w-[205px] h-[62px] bg-white rounded-[31px] shadow-lg flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-transform"
            >
              <ArrowUturnLeftIcon className="w-[32px] h-[32px]" style={{ color: COLORS.darkBrown }} />
              <span className="text-[32px] font-bold pb-2" style={{ color: COLORS.darkBrown }}>
                나가기
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterSelect;
