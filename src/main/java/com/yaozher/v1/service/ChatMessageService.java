package com.yaozher.v1.service;

import com.yaozher.v1.websocket.ChatInboundMessage;

public interface ChatMessageService {

    /**
     * 异步保存消息
     */
    void saveAsync(Long senderId, Long receiverId, ChatInboundMessage inbound);
}
