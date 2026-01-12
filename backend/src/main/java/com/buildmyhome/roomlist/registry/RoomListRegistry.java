package com.buildmyhome.roomlist.registry;

import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RoomListRegistry {

    private final ConcurrentHashMap<Long, Set<Long>> roomMembers = new ConcurrentHashMap<>();

    public boolean hasMember(Long roomId, Long memberId) {
        Set<Long> memberIds = roomMembers.get(roomId);
        return memberIds != null && memberIds.contains(memberId);
    }

    public int addMember(Long roomId, Long memberId) {
        Set<Long> memberIds = roomMembers.computeIfAbsent(roomId, id -> ConcurrentHashMap.newKeySet());
        memberIds.add(memberId);
        return memberIds.size();
    }

    public int removeMember(Long roomId, Long memberId) {
        Set<Long> memberIds = roomMembers.get(roomId);
        if (memberIds == null) return 0;

        memberIds.remove(memberId);

        if (memberIds.isEmpty()) {
            roomMembers.remove(roomId);
            return 0;
        }

        return memberIds.size();
    }

    public void clearRoom(Long roomId) {
        roomMembers.remove(roomId);
    }
}
