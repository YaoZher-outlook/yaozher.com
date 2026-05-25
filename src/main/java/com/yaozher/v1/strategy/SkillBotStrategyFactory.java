package com.yaozher.v1.strategy;

import com.yaozher.v1.entity.SysSkillBot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SkillBotStrategyFactory {

    private final List<SkillBotStrategy> strategies;

    public SkillBotStrategy getStrategy(SysSkillBot bot) {
        return strategies.stream()
                .filter(s -> s.support(bot))
                .findFirst()
                .orElseThrow();
    }
}
