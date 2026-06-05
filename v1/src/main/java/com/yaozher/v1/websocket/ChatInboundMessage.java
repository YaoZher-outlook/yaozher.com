package com.yaozher.v1.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatInboundMessage {

    /**
     * 接收者ID（用户ID或bot ID）
     */
    private String receiverId;

    private String content;

    /**
     * TEXT/FILE/IMAGE
     */
    private ChatMessageType type;

    /**
     * FILE/IMAGE 时可传
     */
    private String fileUrl;
}
