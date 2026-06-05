package com.yaozher.v1.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedConfigUpdateDto {

    /**
     * LED 配置 JSON 字符串
     */
    @NotBlank(message = "ledConfig不能为空")
    private String ledConfig;
}
