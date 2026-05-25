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

    private String coverImage;

    private LocalDateTime createTime;

    private Long viewCount;
}
