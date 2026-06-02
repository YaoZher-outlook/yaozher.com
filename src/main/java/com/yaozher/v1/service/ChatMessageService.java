package com.yaozher.v1.service;

import com.yaozher.v1.websocket.ChatInboundMessage;
import com.yaozher.v1.vo.ChatContactVo;
import com.yaozher.v1.vo.ChatMessageVo;

import java.util.List;

public interface ChatMessageService {

    /**
     * 异步保存消息
     */
    void saveAsync(Long senderId, Long receiverId, ChatInboundMessage inbound);

    List<ChatContactVo> listContacts();

    List<ChatMessageVo> listHistory(String peerId);

    void clearView(String peerId);

    void deleteHistory(String peerId);
}
