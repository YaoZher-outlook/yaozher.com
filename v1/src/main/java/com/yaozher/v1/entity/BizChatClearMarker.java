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
@TableName("biz_chat_clear_marker")
public class BizChatClearMarker {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long peerId;

    private LocalDateTime clearedBefore;

    private LocalDateTime updateTime;
}
