package com.buildmyhome.member.storage;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "storage.type", havingValue = "memory", matchIfMissing = true)
public class MemoryVerificationStorage implements VerificationStorage {
    private final Map<String, String> storage = new ConcurrentHashMap<>();

    @Override
    public void save(String email, String code, long durationSeconds) {
        storage.put(email, code);
    }

    @Override
    public String get(String email) {
        return storage.get(email);
    }

    @Override
    public void remove(String email) {
        storage.remove(email);
    }
}