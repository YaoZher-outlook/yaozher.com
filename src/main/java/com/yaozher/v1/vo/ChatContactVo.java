package com.yaozher.v1.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    private String description;
}
