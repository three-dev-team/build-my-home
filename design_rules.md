# 프론트 디자인 및 협업 가이드라인

> 포토샵(PSD) → JSX 변환을 위한 협업 규칙

**목표:** 디자인 파일(PSD)을 리액트 컴포넌트(JSX)로 변환하는 비용을 최소화하고, 개발 생산성을 극대화한다.

---

## 1. 캔버스 설정

| 항목          | 값                                   |
| ------------- | ------------------------------------ |
| 캔버스 사이즈 | **1920 x 1080 px** (FHD)             |
| Safe Area     | 중앙 **1280 x 720 px** (노트북 대응) |
| 해상도        | **72 PPI**                           |
| 색상 모드     | **RGB** (CMYK ❌)                    |

> 💡 핵심 UI는 Safe Area(1280x720) 안에 배치하세요.

---

## 2. 레이어 정리 규칙

### 폴더명 = 컴포넌트명

```
📁 GamePage/
  ├── 📁 Board/
  ├── 📁 PlayerActionPanel/
  ├── 📁 PlayerStatusPanel/
  └── 📁 Machurilla/

```

| ❌ 나쁜 예 | ✅ 좋은 예        |
| ---------- | ----------------- |
| 레이어 1   | Board             |
| 버튼 모음  | PlayerActionPanel |
| 사본 (2)   | ItemInventory     |

### GameStatus별 그룹화

```
📁 STATUS_WAITING_DICE/     (주사위 대기)
📁 STATUS_WAITING_ITEMS/    (아이템 획득)
📁 STATUS_WAITING_KK/       (KK 이벤트)

```

> 💡 레이어 눈(Eye) 토글로 각 상태 화면을 바로 확인할 수 있게 구성하세요.

---

## 3. 에셋 내보내기

| 종류          | 형식         | 용도                |
| ------------- | ------------ | ------------------- |
| 아이콘/UI     | **SVG**      | 버튼, 화살표 (벡터) |
| 캐릭터/아이템 | **PNG**      | 투명 배경 필요      |
| 배경          | **JPG/WebP** | 용량 절감           |

### 파일명 규칙

```
✅ btn-confirm.png
✅ char_1.png
✅ dice-idle.png
❌ 스크린샷 2024-01-26.png
❌ 최종_진짜최종_v3.png

```

> 💡 레이어 이름에 button_dice.png 처럼 확장자를 적으면 자동 내보내기 가능 (파일 > 생성 > 이미지 에셋)

---

## 4. 색상 팔레트

```jsx
const colors = {
  primary: '#E76C21', // 메인 오렌지
  secondary: '#6b8e5e', // 녹색 배경
  background: '#F0F2EB', // 연한 베이지
  text: '#594E36', // 다크 브라운
  border: '#C5D0C6', // 연한 테두리
};
```

---

## 5. 버튼 상태 디자인

모든 버튼은 **3가지 상태**를 레이어로 준비:

| 상태         | 설명                | 예시 색상 |
| ------------ | ------------------- | --------- |
| **Normal**   | 기본 상태           | `#E76C21` |
| **Hover**    | 마우스 오버         | `#d15a15` |
| **Disabled** | 비활성 (내 턴 아님) | `#9ca3af` |

---

## 6. 👩‍💻 개발자를 위한 변환 가이드 (Design to JSX)

### 📏 단위 변환 공식 (1920px 기준)

- **Tailwind rem:** `포토샵 px / 16` (예: 32px → `rem-2` or `p-2`)
- **vw (가로):** `(px / 1920) * 100`
- **vh (세로):** `(px / 1080) * 100`

| 포토샵     | CSS                  | 용도               |
| ---------- | -------------------- | ------------------ |
| px 그대로  | `px` / Tailwind 숫자 | 버튼, 아이콘       |
| % 계산     | `%`                  | 컨테이너, 레이아웃 |
| vw/vh 계산 | `vw` / `vh`          | 전체 화면 기준     |

```
Tailwind 숫자 = 포토샵 px / 4
rem = 포토샵 px / 16
vw = (포토샵 px / 1920) × 100
vh = (포토샵 px / 1080) × 100
```

### 변환 예시

```
포토샵: 240 x 64px, 하단에서 32px

JSX:
w-60 h-16 bottom-8
(240/4=60, 64/4=16, 32/4=8)

```

---

## 7. 컴포넌트 스펙 템플릿

팀원에게 전달할 때 이 형식 사용:

```markdown
## ButtonConfirm

📐 사이즈: 200 x 56px
🎨 배경: #E76C21
📝 폰트: Pretendard Bold 16px #FFFFFF
🔲 모서리: rounded-full (28px)
✨ 호버: #d15a15
📍 위치: 하단 중앙, bottom 24px

[스크린샷]
```

---

## 8. 실전 변환 예시

**포토샵 스펙:**

```
버튼: 240 x 64px
위치: 화면 하단 중앙, 바닥에서 32px
배경: #E76C21
모서리: 32px
```

**JSX:**

```jsx
<button
  className="
  w-60 h-16
  absolute bottom-8 left-1/2 -translate-x-1/2
  bg-[#E76C21] hover:bg-[#d15a15]
  rounded-full
  text-white font-bold
"
>
  결정하기
</button>
```

---

## 9. 디자인 전달 체크리스트

```
□ PSD 원본 파일
□ 에셋 폴더 (images/, icons/)
□ 색상표 (HEX 코드)
□ 폰트 정보 (이름, 굵기, 크기)
□ 컴포넌트별 스펙 문서
□ 인터랙션 설명 (호버, 클릭, 애니메이션)
□ 상태별 화면 스크린샷
```

---

## 10. 배치 가이드라인

개발자가 코딩하기 좋은 배치:

| ❌ 피할 것         | ✅ 권장                              |
| ------------------ | ------------------------------------ |
| 왼쪽에서 341px     | 정중앙, 또는 좌측 정렬               |
| 애매한 간격        | 8px, 16px, 24px, 32px 단위           |
| 요소마다 다른 간격 | 일관된 gap (예: 모든 카드 간격 16px) |

> 💡 Tailwind는 4px 단위 (gap-4 = 16px)이므로 간격을 4의 배수로 맞추면 변환이 쉬워요.

# 컬러코드

네, 동물의 숲(특히 **모여봐요 동물의 숲**, New Horizons) 특유의 따뜻하고 둥글둥글한 느낌을 주는 **대표 색상 팔레트**가 있습니다! 🎨

팀원들에게 전달할 디자인 가이드에 바로 추가할 수 있도록, 용도별로 나누어 정리해 드릴게요.

---

### 1. 🍃 모동숲 UI 시그니처 (Nook Inc. 테마)

게임 내 스마트폰(너굴폰)이나 인터페이스에 주로 쓰이는, **가장 상징적인 민트 & 크림** 조합입니다. 깔끔한 UI를 만들 때 추천합니다.

| **색상 이름**   | **Hex Code** | **설명**                         | **용도 추천**               |
| --------------- | ------------ | -------------------------------- | --------------------------- |
| **Nook Mint**   | `#78D7B2`    | 너굴 포털, 로딩 화면의 그 민트색 | 메인 버튼, 강조 테두리      |
| **Cream White** | `#FDFBF6`    | 쨍한 흰색이 아닌 부드러운 미색   | 모달/팝업창 배경, 카드 배경 |
| **Soft Yellow** | `#F9F0A3`    | 따뜻한 파스텔 노랑               | 하이라이트, 보조 버튼       |
| **Dark Brown**  | `#594E36`    | 가독성 좋은 짙은 갈색            | 본문 텍스트, 제목           |

---

### 2. 🏝 자연/보드판 팔레트 (Environment)

게임 보드판의 타일이나 배경에 깔았을 때 눈이 편안한 자연의 색감입니다.

| **색상 이름**   | **Hex Code** | **설명**                    | **용도 추천**        |
| --------------- | ------------ | --------------------------- | -------------------- |
| **Grass Green** | `#75CE67`    | 봄/여름의 싱그러운 잔디색   | 게임판 타일 배경     |
| **Ocean Blue**  | `#3DAAD6`    | 트로피칼 해변의 맑은 바다색 | 물가, 여름 테마 배경 |
| **Earth Beige** | `#E6D6AA`    | 모래사장이나 흙바닥 색      | 길, 땅 타일          |
| **Wood Brown**  | `#966F33`    | 나무, 울타리 색             | 아이템, 표지판 UI    |

---

### 3. 💬 말풍선 & 알림 (Dialog & Alert)

동물의 숲 대화창이나 경고 메시지에 쓰이는 색상입니다.

| **색상 이름**   | **Hex Code** | **설명**                                | **용도 추천**           |
| --------------- | ------------ | --------------------------------------- | ----------------------- |
| **Dialog Blue** | `#2D9CDB`    | 주민 이름이나 강조 텍스트에 쓰이는 파랑 | 정보성 알림, 링크       |
| **Alert Red**   | `#FF6B6B`    | 경고지만 위협적이지 않은 붉은색         | 삭제/취소 버튼, 닫기(X) |
| **Bell Coin**   | `#EAC02E`    | '벨' 동전 색상 (금색)                   | 상점, 돈 관련 UI        |

---

### 💻 개발팀 공유용 코드 (Tailwind Config)

위 색상들을 `tailwind.config.js`에 바로 붙여넣어 팀원들과 공유하세요!

```jsx
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // 동물의 숲 확장팩 🍃
        ac: {
          mint: '#78D7B2', // 너굴 민트
          cream: '#FDFBF6', // UI 배경용 미색
          yellow: '#F9F0A3', // 파스텔 노랑
          grass: '#75CE67', // 잔디 초록
          ocean: '#3DAAD6', // 바다 파랑
          sand: '#E6D6AA', // 모래 베이지
          wood: '#966F33', // 나무 갈색
          bell: '#EAC02E', // 벨(돈) 색상
          red: '#FF6B6B', // 부드러운 빨강
        },
      },
    },
  },
};
```

**📌 사용 팁:**

- 팀원들에게: *"배경에는 그냥 흰색(`Before:#FFFFFF`) 쓰지 말고, **`bg-ac-cream`** 써주세요! 그래야 동숲 느낌 나요."* 라고 전달하시면 됩니다.
- 오렌지색(`#E76C21`)은 '확인/건설' 같은 **가장 중요한 액션**에만 포인트로 쓰고, 나머지는 위 파스텔 톤을 섞어 쓰시면 촌스럽지 않고 예쁜 디자인이 나옵니다.

# 파일명 규칙

### 기본 형식

```
[카테고리]-[이름]-[상태/번호].확장자
```

### 카테고리 접두어

\*추가 카테고리가 필요할 경우 반드시 팀원들에게 공유 및 노션 업데이트 후 사용해주세요

| 접두어  | 용도    | 예시               |
| ------- | ------- | ------------------ |
| `btn-`  | 버튼    | `btn-confirm.png`  |
| `icon-` | 아이콘  | `icon-bell.svg`    |
| `bg-`   | 배경    | `bg-main.jpg`      |
| `char-` | 캐릭터  | `char-1.png`       |
| `tile-` | 타일/칸 | `tile-start.png`   |
| `item-` | 아이템  | `item-pipe.png`    |
| `card-` | 카드    | `card-fortune.png` |
| `ui-`   | 기타 UI | `ui-panel.png`     |

### 상태 접미어

\*추가 상태가 필요할 경우 반드시 팀원들에게 공유 및 노션 업데이트 후 사용해주세요

| 접미어      | 용도          | 예시                    |
| ----------- | ------------- | ----------------------- |
| `-idle`     | 기본 상태     | `btn-dice-idle.png`     |
| `-hover`    | 마우스 오버   | `btn-dice-hover.png`    |
| `-active`   | 클릭/활성     | `btn-dice-active.png`   |
| `-disabled` | 비활성        | `btn-dice-disabled.png` |
| `-pattern`  | 배경화면 패턴 | `bg-pattern-1.png`      |

### 예시

```
btn-confirm.png
btn-confirm-hover.png
btn-confirm-disabled.png
char-1.png
char-2.png
icon-bell.svg
bg-game-board.jpg
tile-start.png
item-pipe.png
card-fortune-back.png
```

### ❌ 피해야 할 것

```
버튼1.png          → 한글 금지
Button Confirm.png → 공백 금지
btnConfirm.png     → camelCase 금지
CONFIRM.PNG        → 대문자 금지
최종_v2_진짜.png   → 버전 표기 금지
```

## 파일명 필수 규칙

### ✅ 지켜야 할 것

| 규칙                      | 예시                        |
| ------------------------- | --------------------------- |
| **영어 소문자만**         | `btn-confirm.png`           |
| **단어 구분은 하이픈(-)** | `bg-game-board.jpg`         |
| **숫자는 맨 뒤에**        | `char-1.png`, `tile-12.png` |
| **확장자도 소문자**       | `.png`, `.jpg`, `.svg`      |
| **짧고 명확하게**         | `btn-dice.png` (O)          |

### ❌ 금지 항목

| 금지           | 이유                                    |
| -------------- | --------------------------------------- |
| 한글           | `버튼.png` → 인코딩 문제                |
| 공백           | `my image.png` → URL 깨짐               |
| 대문자         | `Button.PNG` → OS별 인식 차이           |
| 특수문자       | `btn@2x.png` → 예외: `-`, `_` 만 허용   |
| camelCase      | `btnConfirm.png` → 하이픈으로 통일      |
| 버전/날짜      | `final_v2_0126.png` → Git이 버전 관리함 |
| 길이 25자 초과 | 너무 길면 관리 어려움                   |

### 폴더 구조

```
public/
├── images/
│   ├── board/        # 게임판 관련
│   ├── characters/   # 캐릭터
│   ├── items/        # 아이템
│   ├── tiles/        # 타일/칸
│   ├── ui/           # 버튼, 패널 등
│   └── backgrounds/  # 배경
└── icons/            # SVG 아이콘

```

## 캐릭터 파일명

### **캐릭터 상태별 구조:**

```
public/images/characters/
├── apple/
│   ├── idle.png
│   ├── walk-1.png
│   ├── walk-2.png
│   ├── happy.png
│   ├── sad.png
│   └── dice.png
├── bingti/
│   ├── idle.png
│   ├── walk-1.png
│   └── ...
├── maple/
│   └── ...
└── michel/
    └── ...
```

### **코드 사용:**

```jsx
export const CHARACTERS = [
  {
    id: 1,
    key: 'apple',
    name: '애플',
  },
  {
    id: 2,
    key: 'bingti',
    name: '빙티',
  },
  {
    id: 3,
    key: 'maple',
    name: '메이플',
  },
  {
    id: 4,
    key: 'michel',
    name: '미첼',
  },
];
```

이미지 경로는 사용하는 곳에서 조합:

```jsx
const char = CHARACTERS.find(c => c.id === characterId);

// 캐릭터 선택 화면
<img src={`/images/characters/${char.key}/select-basic.png`} />
<img src={`/images/characters/${char.key}/select-hover.png`} />
<img src={`/images/characters/${char.key}/select-selected.png`} />

// 게임 내
<img src={`/images/characters/${char.key}/idle.png`} />
<img src={`/images/characters/${char.key}/walk-1.png`} />

```

### **상태 종류 예시:**

\*추가 상태가 필요할 경우 반드시 팀원들에게 공유 및 노션 업데이트 후 사용해주세요

| 상태               | 파일명        | 용도            |
| ------------------ | ------------- | --------------- |
| `idle`             | 기본 대기     | 평소            |
| `walk-1`, `walk-2` | 걷기 프레임   | 이동 애니메이션 |
| `happy`            | 기쁨          | 벨 획득, 승리   |
| `sad`              | 슬픔          | 벨 잃음, 패배   |
| `dice`             | 주사위 던지기 | 주사위 굴릴 때  |
| `skip`             | 스킵          | 턴 스킵될 때    |

동사형(-ing) 피하는 게 좋아.

**이유:**

- 상태가 애매해짐 (진행 중? 완료?)
- 파일명은 **명사/형용사**가 명확함
  | ❌ 피할 것 | ✅ 권장 |
  | --- | --- |
  | `walking.png` | `walk-1.png`, `walk-2.png` |
  | `running.png` | `run-1.png` |
  | `loading.png` | `load.png` 또는 `spinner.png` |
  | `selecting.png` | `select.png` 또는 `hover.png` |

```
### 동사형 금지
❌ -ing 형태 금지 (walking, loading, selecting)
✅ 명사/형용사 사용 (walk, load, select, idle, active)
```
