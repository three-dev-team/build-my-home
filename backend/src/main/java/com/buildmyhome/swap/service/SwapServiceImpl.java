package com.buildmyhome.swap.service;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.dto.ResourceType;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.house.constants.HouseLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class SwapServiceImpl implements SwapService {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final GameStateService gameStateService;

    // 방별 스왑 세션 저장소
    private final ConcurrentHashMap<Long, SwapSession> sessions = new ConcurrentHashMap<>();

    // 룰렛 회전 속도 기준값
    private static final long CENTER_CYCLE_MS = 120L;
    private static final long TARGET_CYCLE_MS = 110L;

    // 스왑 이벤트 시작 처리
    @Override
    public void start(Long roomId) {
        if (roomId == null) return;

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_SWAP) return;

            // 이미 세션이 살아있으면 중복 시작 방지
            SwapSession existing = sessions.get(roomId);
            if (existing != null && !existing.resolved.get()) return;

            Long giverId = gameState.getCurrentPlayerId();
            GamePlayerState giver = gameState.getPlayers().get(giverId);
            if (giver == null) return;

            // 대상 후보 목록 구성
            List<Candidate> candidates = buildCandidates(gameState, giverId);

            // 대상이 없으면 자동 스킵 처리
            if (candidates.isEmpty()) {
                giver.setUiStep(2);

                GameMessage res = toGameMessage("SWAP_RESULT", gameState);
                res.setActionDataStr("{\"phase\":\"RESOLVED\",\"resultSummary\":\"몽셰르: 대상이 없어 자동 스킵\"}");

                broadcast(roomId, res);
                clear(roomId);
                return;
            }

            // 가운데 옵션 구성 가중치 방식
            List<CenterOption> centerOptions = buildCenterOptionsWeighted();

            SwapSession session = new SwapSession(
                    giverId,
                    giver.getCharacterId(),
                    candidates,
                    centerOptions
            );
            sessions.put(roomId, session);

            // UI 단계 초기화
            giver.setUiStep(0);

            // 시작 브로드캐스트
            broadcast(roomId, buildStageMessage(roomId, gameState, session, Phase.INTRO, null));
        }
    }

    // 확정 입력 처리
    @Override
    public void confirm(Long roomId, Long actorId) {
        if (roomId == null || actorId == null) return;

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        SwapSession session = sessions.get(roomId);
        if (session == null || session.resolved.get()) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_SWAP) return;

            // 현재 턴 플레이어만 허용
            if (!Objects.equals(actorId, gameState.getCurrentPlayerId())) return;
            if (!Objects.equals(actorId, session.giverId)) return;

            GamePlayerState giver = gameState.getPlayers().get(session.giverId);
            if (giver == null) {
                clear(roomId);
                return;
            }

            int curStage = safeInt(giver.getUiStep());
            long now = System.currentTimeMillis();

            // intro에서 가운데 룰렛 시작
            if (curStage == 0) {
                giver.setUiStep(1);
                session.centerStartAtEpochMs = now;

                broadcast(roomId, buildStageMessage(roomId, gameState, session, Phase.SPIN_CENTER, null));
                return;
            }

            // 가운데 룰렛 고정 후 대상 룰렛 시작
            if (curStage == 1) {
                giver.setUiStep(2);

                int centerIdx = computeIndex(
                        session.centerStartAtEpochMs,
                        now,
                        CENTER_CYCLE_MS,
                        session.centerOptions.size()
                );
                session.lockedCenterIndex = centerIdx;

                session.targetStartAtEpochMs = now;

                broadcast(roomId, buildStageMessage(roomId, gameState, session, Phase.SPIN_TARGET, null));
                return;
            }

            // 대상 고정 후 결과 적용
            if (curStage >= 2) {
                if (session.resolved.get()) return;

                int targetIdx = computeIndex(
                        session.targetStartAtEpochMs,
                        now,
                        TARGET_CYCLE_MS,
                        session.candidates.size()
                );
                session.lockedTargetIndex = targetIdx;

                Candidate target = session.candidates.get(targetIdx);
                GamePlayerState receiver = gameState.getPlayers().get(target.memberId);

                if (receiver == null) {
                    applyAndBroadcastResultLocked(roomId, gameState, session, "몽셰르: 대상이 사라져 자동 스킵");
                    return;
                }

                String summary = applyResult(gameState, session, giver, receiver);
                applyAndBroadcastResultLocked(roomId, gameState, session, summary);
            }
        }
    }

    // 타임아웃 종료 처리
    @Override
    public void onTimeout(Long roomId) {
        if (roomId == null) return;

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        SwapSession session = sessions.get(roomId);
        if (session == null || session.resolved.get()) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_SWAP) {
                clear(roomId);
                return;
            }

            GamePlayerState giver = gameState.getPlayers().get(session.giverId);
            if (giver == null) {
                clear(roomId);
                return;
            }

            long now = System.currentTimeMillis();

            // 현재 화면 기준으로 강제 고정 처리
            if (session.centerStartAtEpochMs == null) {
                session.centerStartAtEpochMs = now - ThreadLocalRandom.current().nextLong(0, 3000);
            }
            if (session.lockedCenterIndex == null) {
                session.lockedCenterIndex = computeIndex(
                        session.centerStartAtEpochMs,
                        now,
                        CENTER_CYCLE_MS,
                        session.centerOptions.size()
                );
            }

            if (session.targetStartAtEpochMs == null) {
                session.targetStartAtEpochMs = now - ThreadLocalRandom.current().nextLong(0, 3000);
            }
            if (session.lockedTargetIndex == null) {
                session.lockedTargetIndex = computeIndex(
                        session.targetStartAtEpochMs,
                        now,
                        TARGET_CYCLE_MS,
                        session.candidates.size()
                );
            }

            giver.setUiStep(2);

            Candidate target = session.candidates.get(session.lockedTargetIndex);
            GamePlayerState receiver = gameState.getPlayers().get(target.memberId);

            if (receiver == null) {
                applyAndBroadcastResultLocked(roomId, gameState, session, "몽셰르: 대상이 사라져 자동 스킵");
                return;
            }

            String summary = applyResult(gameState, session, giver, receiver);
            applyAndBroadcastResultLocked(roomId, gameState, session, summary);
        }
    }

    // 재접속 동기화용 payload 제공
    @Override
    public Optional<String> getPayload(Long roomId) {
        if (roomId == null) return Optional.empty();

        SwapSession s = sessions.get(roomId);
        if (s == null) return Optional.empty();

        return Optional.of(buildPayloadJson(s, "INTRO", null));
    }

    // 세션 제거
    @Override
    public void clear(Long roomId) {
        if (roomId == null) return;
        sessions.remove(roomId);
    }

    // 결과 브로드캐스트 및 세션 정리
    private void applyAndBroadcastResultLocked(Long roomId, GameState gameState, SwapSession session, String summary) {
        if (session.resolved.getAndSet(true)) return;

        GameMessage res = toGameMessage("SWAP_RESULT", gameState);
        res.setActionDataStr(buildPayloadJson(session, "RESOLVED", summary));

        broadcast(roomId, res);
        clear(roomId);
    }

    // 결과 적용 로직
    private String applyResult(GameState gameState,
                               SwapSession session,
                               GamePlayerState giver,
                               GamePlayerState receiver) {

        int centerIdx = session.lockedCenterIndex == null ? 0 : session.lockedCenterIndex;
        CenterOption opt = session.centerOptions.get(Math.max(0, Math.min(centerIdx, session.centerOptions.size() - 1)));

        String giverName = safeName(giver.getNickname(), giver.getMemberId());
        String recvName = safeName(receiver.getNickname(), receiver.getMemberId());

        // 집은 서로 교환 처리
        if (opt.category == CenterCategory.HOUSE) {
            HouseLevel a = giver.getHouseLevel();
            HouseLevel b = receiver.getHouseLevel();

            giver.setHouseLevel(b);
            receiver.setHouseLevel(a);

            return "집 스왑: " + giverName + " ↔ " + recvName + "  (" + a.name() + " ↔ " + b.name() + ")";
        }

        // 방향에 따라 송신자와 수신자 결정
        boolean toOther = opt.direction == SwapDirection.TO_OTHER;
        GamePlayerState sender = toOther ? giver : receiver;
        GamePlayerState dest = toOther ? receiver : giver;

        String senderName = safeName(sender.getNickname(), sender.getMemberId());
        String destName = safeName(dest.getNickname(), dest.getMemberId());

        // 벨 이동 처리
        if (opt.category == CenterCategory.BELL) {
            int amount = randomStep(50, 200, 10);

            int senderBell = sender.getBell();
            int senderLoan = sender.getLoan();

            int need = Math.max(0, amount - senderBell);
            if (need > 0) {
                senderLoan += need;
                senderBell = 0;
            } else {
                senderBell -= amount;
            }

            sender.setBell(senderBell);
            sender.setLoan(senderLoan);
            dest.setBell(dest.getBell() + amount);

            return "현금 이동(부족분 자동 대출): " + senderName + " → " + destName + "  " + amount + "벨";
        }

        // 대출금 이동 처리
        if (opt.category == CenterCategory.LOAN) {
            int amount = randomStep(100, 500, 10);

            int senderLoan = Math.max(0, sender.getLoan());

            if (senderLoan > 0) {
                int moved = Math.min(amount, senderLoan);

                sender.setLoan(senderLoan - moved);
                dest.setLoan(Math.max(0, dest.getLoan()) + moved);

                return "대출금 떠넘기기: " + senderName + " → " + destName + "  " + moved;
            }

            // sender.loan이 0이면 대상에게 채무 부과 + 전원 벨 분배
            dest.setLoan(Math.max(0, dest.getLoan()) + amount);
            distributeBellEqually(gameState, amount);

            return "채무 부과(계약서): " + destName + " 대출금 +" + amount + " / 전원에게 " + amount + "벨 공평 분배";
        }

        // 재화 이동 처리
        int want = ThreadLocalRandom.current().nextInt(1, 4);
        InventoryPick pick = pickAnyTransferable(sender);

        if (pick == null) {
            return "재화 이동: " + senderName + " → " + destName + "  (보낼 재화가 없어 아무 일도 일어나지 않음)";
        }

        int moved = Math.min(want, pick.have);
        if (moved <= 0) {
            return "재화 이동: " + senderName + " → " + destName + "  (보낼 재화가 없어 아무 일도 일어나지 않음)";
        }

        if (pick.kind == InventoryKind.RESOURCE) {
            Map<ResourceType, Integer> sMap = safeResourceMap(sender);
            Map<ResourceType, Integer> dMap = safeResourceMap(dest);

            int have = sMap.getOrDefault(pick.resourceType, 0);
            sMap.put(pick.resourceType, Math.max(0, have - moved));
            dMap.put(pick.resourceType, dMap.getOrDefault(pick.resourceType, 0) + moved);

            return "재화 이동: " + senderName + " → " + destName + "  " + pick.resourceType.name() + " x" + moved;
        } else {
            Map<HarvestType, Integer> sMap = safeHarvestMap(sender);
            Map<HarvestType, Integer> dMap = safeHarvestMap(dest);

            int have = sMap.getOrDefault(pick.harvestType, 0);
            sMap.put(pick.harvestType, Math.max(0, have - moved));
            dMap.put(pick.harvestType, dMap.getOrDefault(pick.harvestType, 0) + moved);

            return "재화 이동: " + senderName + " → " + destName + "  " + pick.harvestType.name() + " x" + moved;
        }
    }

    // 가운데 옵션 가중치 구성
    private List<CenterOption> buildCenterOptionsWeighted() {
        List<CenterOption> list = new ArrayList<>(20);

        // HOUSE 1칸
        list.add(new CenterOption(CenterCategory.HOUSE, SwapDirection.SWAP));

        // BELL 9칸
        for (int i = 0; i < 5; i++) list.add(new CenterOption(CenterCategory.BELL, SwapDirection.TO_OTHER));
        for (int i = 0; i < 4; i++) list.add(new CenterOption(CenterCategory.BELL, SwapDirection.TO_ME));

        // RESOURCE 8칸
        for (int i = 0; i < 4; i++) list.add(new CenterOption(CenterCategory.RESOURCE, SwapDirection.TO_OTHER));
        for (int i = 0; i < 4; i++) list.add(new CenterOption(CenterCategory.RESOURCE, SwapDirection.TO_ME));

        // LOAN 2칸
        list.add(new CenterOption(CenterCategory.LOAN, SwapDirection.TO_OTHER));
        list.add(new CenterOption(CenterCategory.LOAN, SwapDirection.TO_ME));

        return list;
    }

    private enum InventoryKind { RESOURCE, HARVEST }

    private static class InventoryPick {
        final InventoryKind kind;
        final ResourceType resourceType;
        final HarvestType harvestType;
        final int have;

        private InventoryPick(ResourceType t, int have) {
            this.kind = InventoryKind.RESOURCE;
            this.resourceType = t;
            this.harvestType = null;
            this.have = have;
        }

        private InventoryPick(HarvestType t, int have) {
            this.kind = InventoryKind.HARVEST;
            this.resourceType = null;
            this.harvestType = t;
            this.have = have;
        }
    }

    // sender가 가진 ResourceType 또는 HarvestType 중 하나를 선택
    private InventoryPick pickAnyTransferable(GamePlayerState sender) {
        if (sender == null) return null;

        List<InventoryPick> pool = new ArrayList<>();

        Map<ResourceType, Integer> rMap = safeResourceMap(sender);
        for (ResourceType t : ResourceType.values()) {
            int v = rMap.getOrDefault(t, 0);
            if (v > 0) pool.add(new InventoryPick(t, v));
        }

        Map<HarvestType, Integer> hMap = safeHarvestMap(sender);
        for (HarvestType t : HarvestType.values()) {
            int v = hMap.getOrDefault(t, 0);
            if (v > 0) pool.add(new InventoryPick(t, v));
        }

        if (pool.isEmpty()) return null;
        return pool.get(ThreadLocalRandom.current().nextInt(pool.size()));
    }

    // ResourceType 맵을 null 안전하게 보장
    private Map<ResourceType, Integer> safeResourceMap(GamePlayerState p) {
        if (p.getResources() == null) {
            p.setResources(new EnumMap<>(ResourceType.class));
        }
        return p.getResources();
    }

    // HarvestType 맵을 null 안전하게 보장
    // 프로젝트에서 필드명이 harvests가 아니면 여기만 맞춰서 수정
    private Map<HarvestType, Integer> safeHarvestMap(GamePlayerState p) {
        if (p.getHarvests() == null) {
            p.setHarvests(new EnumMap<>(HarvestType.class));
        }
        return p.getHarvests();
    }

    // 전원에게 벨을 공평하게 분배
    private void distributeBellEqually(GameState gameState, int amount) {
        if (gameState == null || gameState.getPlayers() == null || gameState.getPlayers().isEmpty()) return;

        List<Long> ids = new ArrayList<>(gameState.getPlayers().keySet());
        ids.sort(Comparator.naturalOrder());

        int n = ids.size();
        int base = amount / n;
        int rem = amount % n;

        for (int i = 0; i < ids.size(); i++) {
            GamePlayerState p = gameState.getPlayers().get(ids.get(i));
            if (p == null) continue;

            int add = base + (i < rem ? 1 : 0);
            p.setBell(p.getBell() + add);
        }
    }

    // step 단위 랜덤 값 생성
    private int randomStep(int min, int max, int step) {
        int count = ((max - min) / step) + 1;
        int k = ThreadLocalRandom.current().nextInt(count);
        return min + (k * step);
    }

    // 대상 후보 목록 구성
    private List<Candidate> buildCandidates(GameState gameState, Long giverId) {
        List<Candidate> list = new ArrayList<>();

        for (GamePlayerState p : gameState.getPlayers().values()) {
            if (p == null) continue;
            if (Objects.equals(p.getMemberId(), giverId)) continue;
            list.add(new Candidate(p.getMemberId(), p.getCharacterId()));
        }

        list.sort(Comparator.comparingLong(c -> c.memberId));
        return list;
    }

    // 단계 메시지 구성
    private GameMessage buildStageMessage(Long roomId, GameState gameState, SwapSession session, Phase phase, String resultSummary) {
        GameMessage msg = toGameMessage("SWAP_STAGE", gameState);
        msg.setRoomId(roomId);
        msg.setActionDataStr(buildPayloadJson(session, phase.name(), resultSummary));
        return msg;
    }

    // payload JSON 문자열 생성
    private String buildPayloadJson(SwapSession s, String phase, String resultSummary) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");

        sb.append("\"phase\":\"").append(phase).append("\",");

        sb.append("\"actorId\":").append(s.giverId).append(",");
        sb.append("\"actorCharacterId\":").append(s.giverCharacterId == null ? 0 : s.giverCharacterId).append(",");

        sb.append("\"centerStartAt\":").append(s.centerStartAtEpochMs == null ? 0 : s.centerStartAtEpochMs).append(",");
        sb.append("\"centerCycleMs\":").append(CENTER_CYCLE_MS).append(",");
        sb.append("\"centerOptions\":[");
        for (int i = 0; i < s.centerOptions.size(); i++) {
            CenterOption o = s.centerOptions.get(i);
            if (i > 0) sb.append(",");
            sb.append("{")
                    .append("\"category\":\"").append(o.category.name()).append("\",")
                    .append("\"direction\":\"").append(o.direction.name()).append("\"")
                    .append("}");
        }
        sb.append("],");
        sb.append("\"lockedCenterIndex\":").append(s.lockedCenterIndex == null ? -1 : s.lockedCenterIndex).append(",");

        sb.append("\"targetStartAt\":").append(s.targetStartAtEpochMs == null ? 0 : s.targetStartAtEpochMs).append(",");
        sb.append("\"targetCycleMs\":").append(TARGET_CYCLE_MS).append(",");
        sb.append("\"targetCandidates\":[");
        for (int i = 0; i < s.candidates.size(); i++) {
            Candidate c = s.candidates.get(i);
            if (i > 0) sb.append(",");
            sb.append("{")
                    .append("\"memberId\":").append(c.memberId).append(",")
                    .append("\"characterId\":").append(c.characterId == null ? 0 : c.characterId)
                    .append("}");
        }
        sb.append("],");
        sb.append("\"lockedTargetIndex\":").append(s.lockedTargetIndex == null ? -1 : s.lockedTargetIndex);

        if (resultSummary != null) {
            sb.append(",\"resultSummary\":\"").append(escapeJson(resultSummary)).append("\"");
        }

        sb.append("}");
        return sb.toString();
    }

    // JSON 문자열 이스케이프 처리
    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    // 룰렛 인덱스 계산
    private int computeIndex(Long startAt, long now, long cycleMs, int len) {
        if (startAt == null || startAt <= 0 || cycleMs <= 0 || len <= 0) return 0;
        long elapsed = Math.max(0, now - startAt);
        return (int) ((elapsed / cycleMs) % len);
    }

    // 토픽 브로드캐스트 처리
    private void broadcast(Long roomId, GameMessage msg) {
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, msg);
    }

    // GameMessage 공통 세팅
    private GameMessage toGameMessage(String type, GameState gameState) {
        GameMessage response = new GameMessage();
        response.setType(type);
        response.setCurrentPlayerId(gameState.getCurrentPlayerId());
        response.setStatus(gameState.getStatus().name());
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        response.setTurnOrder(gameState.getTurnOrder());
        response.setCurrentRound(gameState.getCurrentRound());
        response.setTotalRounds(gameState.getTotalRounds());
        response.setRadishPrice(gameState.getRadishPrice());

        int definitionTimeout = gameState.getStatus().getTimeoutSeconds();
        if (definitionTimeout > 0 && gameState.getStatusUpdatedAt() != null) {
            long elapsed = Duration.between(gameState.getStatusUpdatedAt(), LocalDateTime.now()).toSeconds();
            int remain = Math.max(0, definitionTimeout - (int) elapsed);
            response.setTimeoutSeconds(remain);
        } else {
            response.setTimeoutSeconds(definitionTimeout);
        }

        return response;
    }

    // null 안전 정수 처리
    private int safeInt(Integer v) {
        return v == null ? 0 : v;
    }

    // 닉네임이 없을 때 표시 이름 처리
    private String safeName(String nickname, Long memberId) {
        if (nickname != null && !nickname.isBlank()) return nickname;
        return "Player#" + (memberId == null ? "?" : memberId);
    }

    private enum Phase {
        INTRO,
        SPIN_CENTER,
        SPIN_TARGET,
        RESOLVED
    }

    private enum CenterCategory {
        HOUSE,
        BELL,
        RESOURCE,
        LOAN
    }

    private enum SwapDirection {
        TO_OTHER,
        TO_ME,
        SWAP
    }

    private static class CenterOption {
        final CenterCategory category;
        final SwapDirection direction;

        private CenterOption(CenterCategory category, SwapDirection direction) {
            this.category = category;
            this.direction = direction;
        }
    }

    private static class Candidate {
        final Long memberId;
        final Long characterId;

        private Candidate(Long memberId, Long characterId) {
            this.memberId = memberId;
            this.characterId = characterId;
        }
    }

    private static class SwapSession {
        final Long giverId;
        final Long giverCharacterId;

        final List<Candidate> candidates;
        final List<CenterOption> centerOptions;

        volatile Long centerStartAtEpochMs;
        volatile Integer lockedCenterIndex;

        volatile Long targetStartAtEpochMs;
        volatile Integer lockedTargetIndex;

        final AtomicBoolean resolved = new AtomicBoolean(false);

        private SwapSession(Long giverId, Long giverCharacterId, List<Candidate> candidates, List<CenterOption> centerOptions) {
            this.giverId = giverId;
            this.giverCharacterId = giverCharacterId;
            this.candidates = candidates;
            this.centerOptions = centerOptions;
        }
    }
}
