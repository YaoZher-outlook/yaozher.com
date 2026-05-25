package com.yaozher.v1.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("biz_news")
public class BizNews {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    private String content;

    private String coverImage;

    private LocalDateTime createTime;

    private Long viewCount;
}
