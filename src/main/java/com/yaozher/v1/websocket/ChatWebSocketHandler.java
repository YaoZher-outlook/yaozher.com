package com.yaozher.v1.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaozher.v1.entity.SysSkillBot;
import com.yaozher.v1.mapper.SysSkillBotMapper;
import com.yaozher.v1.service.ChatMessageService;
import com.yaozher.v1.strategy.SkillBotStrategy;
import com.yaozher.v1.strategy.SkillBotStrategyFactory;
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
import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final WebSocketSessionManager sessionManager;
    private final SysSkillBotMapper skillBotMapper;
    private final SkillBotStrategyFactory strategyFactory;
    private final ChatMessageService chatMessageService;

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        // 简化：通过 query param 传 userId，例如 ws://host/ws/chat?userId=1
        String userId = getQueryParam(session, "userId");
        if (!StringUtils.hasText(userId)) {
            log.warn("WS connect missing userId, session={}", session.getId());
            return;
        }
        sessionManager.put(userId, session);
    }

    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) throws Exception {
        String senderIdStr = getQueryParam(session, "userId");
        if (!StringUtils.hasText(senderIdStr)) {
            return;
        }

        ChatInboundMessage inbound = objectMapper.readValue(message.getPayload(), ChatInboundMessage.class);
        if (inbound == null || !StringUtils.hasText(inbound.getReceiverId())) {
            return;
        }

        String receiverIdStr = inbound.getReceiverId();
        Long senderId = safeToLong(senderIdStr);
        Long receiverId = safeToLong(receiverIdStr);

        // 先异步落库：用户 -> 接收方
        if (senderId != null && receiverId != null) {
            chatMessageService.saveAsync(senderId, receiverId, inbound);
        }

        // 1) 如果 receiverId 对应在线用户，直接转发
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
            String json = objectMapper.writeValueAsString(outbound);
            receiverSession.sendMessage(new TextMessage(json == null ? "" : json));
            return;
        }

        // 2) 否则尝试当作 bot：查 sys_skill_bot
        if (receiverId == null) {
            return;
        }
        SysSkillBot bot = skillBotMapper.selectById(receiverId);
        if (bot == null) {
            // 接收方既不在线也不是bot：略过（可在 Step 5 改为返回错误消息）
            return;
        }

        SkillBotStrategy strategy = strategyFactory.getStrategy(bot);
        String replyText = strategy.reply(bot, inbound.getContent());

        ChatOutboundMessage botReply = ChatOutboundMessage.builder()
                .senderId(String.valueOf(bot.getId()))
                .receiverId(senderIdStr)
                .type(ChatMessageType.TEXT)
                .content(replyText)
                .createTime(LocalDateTime.now())
                .build();

        // bot -> sender：回写到当前 session
        String replyJson = objectMapper.writeValueAsString(botReply);
        session.sendMessage(new TextMessage(replyJson == null ? "" : replyJson));

        // bot 回复也异步落库
        if (senderId != null && bot.getId() != null) {
            ChatInboundMessage fakeInbound = ChatInboundMessage.builder()
                    .receiverId(senderIdStr)
                    .content(replyText)
                    .type(ChatMessageType.TEXT)
                    .build();
            chatMessageService.saveAsync(bot.getId(), senderId, fakeInbound);
        }
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        String userId = getQueryParam(session, "userId");
        if (StringUtils.hasText(userId)) {
            sessionManager.remove(userId);
        }
    }

    private String getQueryParam(WebSocketSession session, String key) {
        URI uri = session.getUri();
        if (uri == null) {
            return null;
        }
        String query = uri.getQuery();
        if (query == null) {
            return null;
        }
        for (String p : query.split("&")) {
            String[] kv = p.split("=", 2);
            if (kv.length == 2 && key.equals(kv[0])) {
                return kv[1];
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
}
