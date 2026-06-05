package com.yaozher.v1.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageVo {

    private Long id;

    private String senderId;

    private String receiverId;

    private String type;

    private String content;

    private String fileUrl;

    private LocalDateTime createTime;
}
