package com.yaozher.v1.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ApiKeyUpdateDto {

    @Size(max = 4096)
    private String apiKey;

    @Size(max = 4096)
    private String adminApiKey;

    @Size(max = 4096)
    private String chatbotApiKey;
}
