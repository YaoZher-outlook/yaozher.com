package com.yaozher.v1.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKeyStatusVo {

    private Boolean hasApiKey;

    private Boolean hasAdminApiKey;

    private Boolean hasChatbotApiKey;
}
