package com.yaozher.v1.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatOutboundMessage {

    private String senderId;

    private String receiverId;

    private ChatMessageType type;

    private String content;

    private String fileUrl;

    private LocalDateTime createTime;
}
