package com.yaozher.v1.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginUserVo {

    private Long id;

    private String username;

    private String nickname;

    private String avatar;

    private String role;
}
