# 🏠 지어봐요 마이홈 (Build My Home)

> 동물의 숲 스타일의 **실시간 멀티플레이어 보드게임**
> Spring Boot · React · WebSocket(STOMP) 기반의 풀스택 웹 게임

<br>

## 🎥 데모 영상

[![데모 영상 보기](https://img.youtube.com/vi/t57Ejpxnj6k/maxresdefault.jpg)](https://www.youtube.com/watch?v=t57Ejpxnj6k)

> 👆 이미지를 클릭하면 YouTube 데모 영상으로 이동합니다.

<br>

## 📌 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **컨셉** | 동물의 숲 IP를 활용한 4인 실시간 보드게임 |
| **기간** | 약 1개월 (개발자 양성 과정 팀 프로젝트) |
| **팀 구성** | 4명 |
| **핵심 도전** | 실시간 동기화 · 동시성 제어 · 네트워크 안정성 |

플레이어는 주사위를 굴려 24칸 보드를 돌며 재화를 모으고, 집을 단계별로 업그레이드합니다. 정해진 라운드(10/20/30/40) 종료 시 **대출금 → 집 등급 → 보유 벨** 순의 우선순위로 순위를 매겨 승자를 가립니다.

<br>

## 🛠 기술 스택

**Backend**
- Spring Boot 3.x
- WebSocket (STOMP) — 실시간 통신
- Spring Security + JWT — 인증
- Spring Data JPA · MySQL
- OAuth2 (Google / Kakao / Naver / GitHub)

**Frontend**
- React 18 + Vite
- Three.js — 3D 주사위 연출
- STOMP.js — WebSocket 클라이언트

<br>

## 🏗 아키텍처 & 핵심 설계

### 1. 실시간 멀티플레이어 아키텍처

- **서버를 Single Source of Truth로 설계** — 모든 게임 액션은 서버에서 검증 후 전체 플레이어에게 브로드캐스트되어 상태 불일치를 방지
- **중앙 허브 컨트롤러**(`GameWsController`)에서 50여 개의 게임 액션을 분기 처리하고 다수의 도메인 서비스를 통합 관리

### 2. 동시성 제어 (Race Condition 방지)

여러 플레이어가 동시에 자원을 거래·대출하는 상황의 데이터 정합성 문제를 해결.

```java
synchronized (gameState) {
    // 대출 한도 체크 → 벨 차감 + 대출금 증가를 원자적으로 처리
}
```

- 대출, 무 거래(무파니), 자원 정산 등 공유 상태 변경 지점에 \`synchronized\` 블록 적용

### 3. 중복 액션 방지 (LOCK-ONCE)

네트워크 지연으로 같은 액션이 중복 전송되는 문제를 이벤트 키 기반으로 차단.

```java
eventKey  = "roomId|round|playerId|status"
dedupeKey = eventKey + "|actionType"
if (dedupeKey.equals(prev)) return false; // 중복 거부
```

- 1 이벤트당 1회 처리를 보장해, 스왑·아이템 획득 등 중요 액션의 무결성 확보

### 4. 타임아웃 & 이탈 처리

- `ScheduledExecutorService` 기반 상태별 타임아웃으로, 응답 없는 플레이어가 게임을 멈추지 않도록 자동 진행
- 플레이어 이탈 시 `turnOrder` 재정렬 + 턴 인덱스 보정, 1명 이하 남으면 자동 종료 및 정산

<br>

## 🎮 주요 게임 시스템

| 시스템 | 설명 |
|--------|------|
| **무파니** | 전 플레이어 동시 참여 거래. 전원 결정 감지 후 자동 종료 (`ConcurrentHashMap.newKeySet()`) |
| **마추릴라** | 운명의 카드 8종. 우정운은 한 명의 행동이 전원에게 영향(벨 분배) |
| **스왑** | 룰렛 기반 3단계 교환(집/벨/재화/대출 × 방향) |
| **낚시** | 확률 기반 미니게임 + 떡밥 시스템, 환불 안전장치 |
| **상점** | `ShopSession` 기반 중복 구매 방지, 3단계 검증 |
| **아이템** | 6종 (커스텀 주사위, 더블 주사위, 순간이동, 위치 교환 등) |

<br>

## 💡 기술적 도전과 해결

<details>
<summary><b>동시성 — 동시 대출 시 한도 초과</b></summary>

여러 플레이어가 동시에 대출을 요청하면 한도를 초과하는 문제가 있었습니다. 공유 상태(`gameState`)에 대한 변경을 `synchronized` 블록으로 묶어 원자성을 보장하고 트랜잭션 무결성을 확보했습니다.
</details>

<details>
<summary><b>네트워크 — 패킷 손실 · 지연 · 중복</b></summary>

WebSocket 환경의 불안정성에 대응해 ① LOCK-ONCE 중복 방지, ② 타임아웃 자동 진행, ③ 재연결 로직을 조합해 안정적인 게임 흐름을 유지했습니다.
</details>

<details>
<summary><b>상태 동기화 — 서버/클라이언트 불일치</b></summary>

서버를 유일한 상태 권한으로 두고, 모든 액션을 서버 검증 후 브로드캐스트하는 구조로 클라이언트 간 상태 불일치를 제거했습니다.
</details>

<br>

## 📊 프로젝트 규모

- **백엔드**: 다수의 도메인 서비스 + 중앙 컨트롤러(50+ 액션 처리)
- **프론트엔드**: 20+ 컴포넌트
- **게임 콘텐츠**: 타일 15종 · 아이템 6종 · 재화 7종 · 수확물 8종

<br>

## ⚙️ 시작하기

**Frontend**
```bash
cd frontend
npm install
npm install -D @tailwindcss/vite tailwindcss   # tailwindcss v4
npm run build
```

**Backend**
```bash
cd backend
./gradlew bootRun
```

> 실행에는 MySQL 및 환경변수(OAuth 키, JWT secret 등) 설정이 필요합니다.

<br>

---

<sub>본 게임은 학습 목적의 팀 프로젝트이며, 동물의 숲 관련 요소는 게임 메커니즘 학습을 위해 참고한 것입니다.</sub>
