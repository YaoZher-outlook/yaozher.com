package com.yaozher.v1.strategy.impl;

import com.yaozher.v1.entity.SysSkillBot;
import com.yaozher.v1.strategy.SkillBotStrategy;
import org.springframework.stereotype.Component;

@Component
public class DefaultEchoSkillBotStrategy implements SkillBotStrategy {

    @Override
    public boolean support(SysSkillBot bot) {
        return true;
    }

    @Override
    public String reply(SysSkillBot bot, String content) {
        String botName = bot == null ? "Bot" : bot.getBotName();
        return "Received your query regarding " + botName + ": " + content + ". I am processing it.";
    }
}
