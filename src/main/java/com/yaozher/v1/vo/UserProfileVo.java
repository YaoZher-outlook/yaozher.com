package com.yaozher.v1.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileVo {

    private Long id;

    private String username;

    private String nickname;

    private String avatar;

    private String email;

    private String role;

    /**
     * LED 配置（JSON字符串）
     */
    private String ledConfig;
}
