import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { CHARACTERS } from '../../constants/characters.js';
import { COLORS } from '../../constants/colors.js'; // COLORS import
import { leaveRoom } from '../../utils/roomUtils.js';
import { getBrokerURL } from '../../utils/ws.js';
import ExitButton from '../../components/common/ExitButton';
import AspectLayout from '../../components/layout/AspectLayout';

const CharacterSelect = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [takenCharacters, setTakenCharacters] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const [hoveredCharacterId, setHoveredCharacterId] = useState(null);
  const token = sessionStorage.getItem('token');

  // 웹소켓 연결
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
      setSelectedCharacter(null); // 다시 클릭 시 해제? 아니면 유지. 보통은 유지.
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

  // 미리보기 로직: 호버 중이면 호버, 아니면 선택된 캐릭터, 그것도 아니면 기본값(애플)
  // 디자인상 "나의 선택"이 보여짐. 호버 중일 때는 호버된 캐릭터를 보여줄 수 있음.
  // 로직: 호버됨(선점되지 않은 경우) > 선택됨 > 첫 번째 가능 또는 애플.
  // UX 표준: 호버 시 호버된 내용 표시. 호버하지 않을 때는 선택된 내용 표시. 선택된 게 없으면 안내 또는 중립 상태.
  // 이미지는 왼쪽에 "애플", "애플 선택" 동작을 보여줌.
  const previewId = hoveredCharacterId || selectedCharacter || 1; // 기본값 ID 1 (애플)
  const previewChar = CHARACTERS.find((c) => c.id === previewId);

  // 그리드/미리보기에 사용할 이미지 결정 헬퍼
  // 그리드는 iconIdle / iconActive 사용.
  // 미리보기는 전신 이미지(selectBasicImage)가 있으면 사용, 없으면 활성 아이콘 확대 사용.
  const getPreviewImage = (char) => {
    if (!char) return null;
    return char.selectBasicImage || char.iconActive;
  };

  return (
    <AspectLayout>
      <div className="relative w-full h-full bg-cover bg-center flex overflow-hidden font-gosanja bg-[url('/images/room/bg-character-select.jpg')]">
        {/* --- LEFT SECTION (Preview) (50%) --- */}
        <div className="w-1/2 h-full flex flex-col items-center justify-center relative">
          {/* 집 이미지 (완쪽 섹션 절대 위치 상단 좌측) */}
          {previewChar && previewChar.houseImage && (
            <div className="absolute top-[9.2%] left-[12%] z-0 animate-fade-in">
              <img
                src={previewChar.houseImage}
                alt={`${previewChar.name}'s House`}
                className="w-[9.38cqw] h-[9.38cqw] object-contain hover:scale-105 transition-transform"
              />
            </div>
          )}

          {/* 캐릭터 미리보기 이미지 */}
          {/* 캐릭터 미리보기 이미지 & 설명 (상하 배치) */}
          {previewChar && (
            <div className="flex flex-col items-center mt-[8.08cqw] relative z-10 w-full">
              {/* 1. 캐릭터 이미지 (박스 위로 겹쳐보이게) */}
              {/* mb-[-3.13cqw]로 텍스트 박스와 겹침 효과 */}
              <div className="relative z-20 mb-[-2.08cqw] animate-fade-in-up">
                <img
                  src={getPreviewImage(previewChar)}
                  alt={previewChar.name}
                  className="mt-[2.08cqw] w-[15.52cqw] h-[22.76cqw] object-contain"
                />
              </div>

              {/* 2. 설명 텍스트 박스 (41.35cqw * 13.96cqw) */}
              <div
                className="w-[41.35cqw] h-[13.96cqw] rounded-[1.88cqw] flex flex-col items-center justify-end pb-[2.08cqw] relative z-10"
                style={{ backgroundColor: 'rgba(254, 254, 254, 0.4)' }} // creamIvory 50% opacity
              >
                {/* 이름 */}
                <h2
                  className="text-[3.13cqw] font-black leading-none mb-[0.83cqw] tracking-tight"
                  style={{ color: COLORS.darkBrown }}
                >
                  {previewChar.name}
                </h2>

                {/* 점선 (너비 31.25cqw 중앙 정렬) */}
                <div className="w-[31.25cqw] h-[0.21cqw] border-t-[0.21cqw] border-dashed border-[#8A6F5D] opacity-40 mb-[1.04cqw]" />

                {/* 명언 */}
                <p
                  className="text-[1.88cqw] font-bold opacity-80 whitespace-nowrap"
                  style={{ color: COLORS.darkBrown }}
                >
                  "{previewChar.quote}"
                </p>
              </div>
            </div>
          )}

          {/* 배경 장식 (나뭇잎 패턴 등은 bg 이미지에 포함됨) */}
        </div>

        {/* --- RIGHT SECTION (Grid & Actions) (50%) --- */}
        <div className="w-1/2 h-full flex flex-col items-center justify-center pt-[3.13cqw] relative">
          {/* 상단 타이틀 */}
          <h1 className="text-[3.13cqw] font-black mb-[3.13cqw]" style={{ color: COLORS.darkBrown }}>
            나의 주민을 선택해주세요
          </h1>

          {/* 캐릭터 그리드 (4x2) */}
          <div className="grid grid-cols-4 gap-[1.25cqw]">
            {CHARACTERS.map((char) => {
              const isTaken = takenCharacters.includes(char.id);
              const isSelected = selectedCharacter === char.id;

              return (
                <button
                  key={char.id}
                  onClick={() => !isTaken && handleSelect(char.id)}
                  onMouseEnter={() => !isTaken && setHoveredCharacterId(char.id)}
                  onMouseLeave={() => setHoveredCharacterId(null)}
                  disabled={isTaken}
                  className={`
                     relative w-[8.33cqw] h-[8.33cqw] flex items-center justify-center transition-all p-0 overflow-visible rounded-[24px]
                     ${isSelected ? 'outline outline-[5px] outline-[#34C4D3]' : ''}
                     ${isTaken ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                   `}
                  style={{}}
                >
                  {/* 캐릭터 아이콘 - 항상 idle 이미지 사용 */}
                  <img src={char.iconIdle} alt={char.name} className="w-full h-full object-cover rounded-[1.04cqw]" />

                  {/* 선택 체크 아이콘 - 우상단 테두리 중간에 위치 */}
                  {isSelected && (
                    <div className="absolute -top-[1cqw] -right-[1cqw] w-[2.5cqw] h-[2.5cqw] bg-[#34C4D3] rounded-full flex items-center justify-center">
                      <svg
                        className="w-[1.8cqw] h-[1.8cqw] text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 하단 버튼 영역 */}
          <div className="mt-[4.17cqw] flex flex-col items-center gap-[0.83cqw]">
            {/* 선택하기 버튼 */}
            <button
              onClick={handleEnter}
              disabled={!selectedCharacter}
              className={`
                 w-[20.83cqw] h-[6.25cqw] rounded-[2.5cqw] flex items-center justify-center transition-all
                 ${selectedCharacter ? 'hover:brightness-105 active:scale-95' : 'opacity-50 cursor-not-allowed'}
               `}
              style={{ backgroundColor: COLORS.ac.nookCyan }}
            >
              <span className="text-[2.60cqw] font-black text-white pb-[0.42cqw]">선택하기</span>
            </button>
          </div>

          {/* 뒤로가기 (나가기) - 우측 하단 절대 위치 */}
          <div className="absolute bottom-[2.08cqw] right-[2.08cqw]">
            <ExitButton onClick={handleLeave} />
          </div>
        </div>
      </div>
    </AspectLayout>
  );
};

export default CharacterSelect;
