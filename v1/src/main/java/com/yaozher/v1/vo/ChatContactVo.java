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
public class ChatContactVo {

    private String id;

    private String type;

    private String role;

    private String name;

    private String avatar;

    private String email;

    private LocalDateTime createTime;

    private String description;
}
