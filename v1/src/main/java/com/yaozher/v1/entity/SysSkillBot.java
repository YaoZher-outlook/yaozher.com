package com.yaozher.v1.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("sys_skill_bot")
public class SysSkillBot {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String botName;

    private String description;

    private String triggerKeyword;
}
