package com.yaozher.v1.service.impl;

import com.yaozher.v1.entity.BizChatMessage;
import com.yaozher.v1.mapper.BizChatMessageMapper;
import com.yaozher.v1.service.ChatMessageService;
import com.yaozher.v1.websocket.ChatInboundMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {

    private final BizChatMessageMapper chatMessageMapper;

    @Async
    @Override
    public void saveAsync(Long senderId, Long receiverId, ChatInboundMessage inbound) {
        try {
            BizChatMessage msg = BizChatMessage.builder()
                    .senderId(senderId)
                    .receiverId(receiverId)
                    .messageType(inbound.getType() == null ? null : inbound.getType().name())
                    .content(inbound.getContent())
                    .fileUrl(inbound.getFileUrl())
                    .build();
            chatMessageMapper.insert(msg);
        } catch (Exception e) {
            log.error("save chat message failed", e);
        }
    }
}
