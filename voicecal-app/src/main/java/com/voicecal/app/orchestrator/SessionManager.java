package com.voicecal.app.orchestrator;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages voice interaction sessions.
 * Provides session lifecycle management, lookup, and automatic cleanup of expired sessions.
 */
@Slf4j
@Component
public class SessionManager {

    private final Map<String, VoiceSession> sessions = new ConcurrentHashMap<>();

    /**
     * Default session timeout in minutes.
     */
    private static final int DEFAULT_TIMEOUT_MINUTES = 30;

    /**
     * Create a new voice session.
     *
     * @param userId   the user identifier, or null for anonymous
     * @param language the preferred language code
     * @return the created session
     */
    public VoiceSession createSession(String userId, String language) {
        String sessionId = UUID.randomUUID().toString();
        VoiceSession session = new VoiceSession(sessionId);
        session.setUserId(userId);
        session.setLanguage(language != null ? language : "zh-CN");
        sessions.put(sessionId, session);
        log.info("Created voice session: {} for user: {}", sessionId, userId);
        return session;
    }

    /**
     * Retrieve an existing session by ID.
     *
     * @param sessionId the session identifier
     * @return the session if found and not timed out, empty otherwise
     */
    public Optional<VoiceSession> getSession(String sessionId) {
        VoiceSession session = sessions.get(sessionId);
        if (session == null) {
            return Optional.empty();
        }
        if (session.isTimedOut(DEFAULT_TIMEOUT_MINUTES)) {
            log.info("Session {} timed out, removing", sessionId);
            session.setState(VoiceSession.SessionState.TERMINATED);
            sessions.remove(sessionId);
            return Optional.empty();
        }
        return Optional.of(session);
    }

    /**
     * Get or create a session. If the given session ID is valid, return it;
     * otherwise create a new one.
     *
     * @param sessionId the session identifier, or null to create new
     * @param userId    the user identifier
     * @param language  the preferred language
     * @return the session
     */
    public VoiceSession getOrCreateSession(String sessionId, String userId, String language) {
        if (sessionId != null) {
            Optional<VoiceSession> existing = getSession(sessionId);
            if (existing.isPresent()) {
                return existing.get();
            }
        }
        return createSession(userId, language);
    }

    /**
     * Explicitly terminate and remove a session.
     *
     * @param sessionId the session identifier
     */
    public void terminateSession(String sessionId) {
        VoiceSession session = sessions.remove(sessionId);
        if (session != null) {
            session.setState(VoiceSession.SessionState.TERMINATED);
            log.info("Terminated session: {}", sessionId);
        }
    }

    /**
     * Get the number of active sessions.
     */
    public int getActiveSessionCount() {
        return sessions.size();
    }

    /**
     * Scheduled cleanup of expired sessions.
     * Runs every 5 minutes.
     */
    @Scheduled(fixedRate = 300000)
    public void cleanupExpiredSessions() {
        int removed = 0;
        var iterator = sessions.entrySet().iterator();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            if (entry.getValue().isTimedOut(DEFAULT_TIMEOUT_MINUTES)) {
                entry.getValue().setState(VoiceSession.SessionState.TERMINATED);
                iterator.remove();
                removed++;
            }
        }
        if (removed > 0) {
            log.info("Cleaned up {} expired sessions. Active sessions: {}",
                    removed, sessions.size());
        }
    }
}
