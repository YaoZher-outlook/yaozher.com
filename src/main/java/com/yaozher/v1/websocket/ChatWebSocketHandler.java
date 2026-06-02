package com.yaozher.v1.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.entity.SysSkillBot;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.mapper.SysSkillBotMapper;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.service.ChatMessageService;
import com.yaozher.v1.strategy.SkillBotStrategy;
import com.yaozher.v1.strategy.SkillBotStrategyFactory;
import com.yaozher.v1.utils.JwtUtils;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final String ATTR_USER_ID = "userId";

    private final ObjectMapper objectMapper;
    private final WebSocketSessionManager sessionManager;
    private final SysSkillBotMapper skillBotMapper;
    private final SysUserMapper sysUserMapper;
    private final SkillBotStrategyFactory strategyFactory;
    private final ChatMessageService chatMessageService;
    private final AppProperties appProperties;

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
        String userId = resolveUserIdFromToken(session);
        if (!StringUtils.hasText(userId)) {
            log.warn("WS connect rejected: missing or invalid token, session={}", session.getId());
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Unauthorized"));
            return;
        }
        session.getAttributes().put(ATTR_USER_ID, userId);
        sessionManager.put(userId, session);
    }

    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) throws Exception {
        String senderIdStr = (String) session.getAttributes().get(ATTR_USER_ID);
        if (!StringUtils.hasText(senderIdStr)) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Unauthorized"));
            return;
        }

        ChatInboundMessage inbound = objectMapper.readValue(message.getPayload(), ChatInboundMessage.class);
        if (inbound == null || !StringUtils.hasText(inbound.getReceiverId())) {
            return;
        }

        String receiverIdStr = inbound.getReceiverId();
        Long senderId = safeToLong(senderIdStr);
        Long receiverId = safeToLong(receiverIdStr);
        SysUser sender = senderId == null ? null : sysUserMapper.selectById(senderId);
        if (sender == null || receiverId == null || !canSendTo(sender, receiverId)) {
            return;
        }

        chatMessageService.saveAsync(senderId, receiverId, inbound);

        if (receiverId < 0) {
            handleBotMessage(session, senderIdStr, senderId, Math.abs(receiverId), inbound);
            return;
        }

        WebSocketSession receiverSession = sessionManager.get(receiverIdStr);
        if (receiverSession != null && receiverSession.isOpen()) {
            ChatOutboundMessage outbound = ChatOutboundMessage.builder()
                    .senderId(senderIdStr)
                    .receiverId(receiverIdStr)
                    .type(inbound.getType())
                    .content(inbound.getContent())
                    .fileUrl(inbound.getFileUrl())
                    .createTime(LocalDateTime.now())
                    .build();
            receiverSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(outbound)));
            return;
        }

    }

    private void handleBotMessage(
            WebSocketSession session,
            String senderIdStr,
            Long senderId,
            Long botId,
            ChatInboundMessage inbound
    ) throws Exception {
        SysSkillBot bot = skillBotMapper.selectById(botId);
        if (bot == null) {
            return;
        }

        SkillBotStrategy strategy = strategyFactory.getStrategy(bot);
        String replyText = strategy.reply(bot, senderId, inbound.getContent());

        ChatOutboundMessage botReply = ChatOutboundMessage.builder()
                .senderId(String.valueOf(-bot.getId()))
                .receiverId(senderIdStr)
                .type(ChatMessageType.TEXT)
                .content(replyText)
                .createTime(LocalDateTime.now())
                .build();

        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(botReply)));

        if (senderId != null && bot.getId() != null) {
            ChatInboundMessage fakeInbound = ChatInboundMessage.builder()
                    .receiverId(senderIdStr)
                    .content(replyText)
                    .type(ChatMessageType.TEXT)
                    .build();
            chatMessageService.saveAsync(-bot.getId(), senderId, fakeInbound);
        }
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        Object userId = session.getAttributes().get(ATTR_USER_ID);
        if (userId instanceof String s && StringUtils.hasText(s)) {
            sessionManager.remove(s);
        }
    }

    private String resolveUserIdFromToken(WebSocketSession session) {
        String token = getQueryParam(session, "token");
        if (!StringUtils.hasText(token)) {
            return null;
        }
        try {
            String secret = appProperties.getJwt() == null || appProperties.getJwt().getSecret() == null
                    ? JwtUtils.DEFAULT_SECRET
                    : appProperties.getJwt().getSecret();
            Claims claims = JwtUtils.parseToken(token, secret);
            if (JwtUtils.isExpired(claims)) {
                return null;
            }
            Object uid = claims.get("uid");
            return uid == null ? null : String.valueOf(uid);
        } catch (Exception e) {
            log.warn("WS token verify failed: {}", e.getMessage());
            return null;
        }
    }

    private String getQueryParam(WebSocketSession session, String key) {
        URI uri = session.getUri();
        if (uri == null || uri.getQuery() == null) {
            return null;
        }
        for (String p : uri.getQuery().split("&")) {
            String[] kv = p.split("=", 2);
            if (kv.length == 2 && key.equals(kv[0])) {
                return URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    private Long safeToLong(String s) {
        try {
            return Long.valueOf(s);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean canSendTo(SysUser sender, Long receiverId) {
        if (receiverId < 0) {
            return skillBotMapper.selectById(Math.abs(receiverId)) != null;
        }
        SysUser receiver = sysUserMapper.selectById(receiverId);
        if (receiver == null) {
            return false;
        }
        if ("ADMIN".equalsIgnoreCase(sender.getRole())) {
            return true;
        }
        return "ADMIN".equalsIgnoreCase(receiver.getRole());
    }
}
