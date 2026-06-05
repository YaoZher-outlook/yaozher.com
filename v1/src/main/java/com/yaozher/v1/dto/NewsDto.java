package com.yaozher.v1.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsDto {

    private Long id;

    private String title;

    private String content;

    private String coverImage;

    /**
     * 分类：更新/公告/日常
     */
    private String type;

    private LocalDateTime createTime;

    private Long viewCount;
}
