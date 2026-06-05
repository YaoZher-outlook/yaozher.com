package com.yaozher.v1.strategy;

import com.yaozher.v1.entity.SysSkillBot;

public interface SkillBotStrategy {

    /**
     * 是否支持该 bot
     */
    boolean support(SysSkillBot bot);

    /**
     * 处理用户消息，返回机器人回复文本
     */
    String reply(SysSkillBot bot, Long userId, String content);
}
