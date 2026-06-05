package com.yaozher.v1.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class WebSocketSessionManager {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public void put(String userId, WebSocketSession session) {
        sessions.put(userId, session);
        log.info("WS session added: userId={}, sessionId={}", userId, session.getId());
    }

    public WebSocketSession get(String userId) {
        return sessions.get(userId);
    }

    public void remove(String userId) {
        WebSocketSession s = sessions.remove(userId);
        if (s != null) {
            log.info("WS session removed: userId={}, sessionId={}", userId, s.getId());
        }
    }

    public void remove(String userId, WebSocketSession session) {
        boolean removed = sessions.remove(userId, session);
        if (removed) {
            log.info("WS session removed: userId={}, sessionId={}", userId, session.getId());
        }
    }
}
