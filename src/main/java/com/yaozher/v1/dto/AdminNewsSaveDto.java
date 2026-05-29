package com.yaozher.v1.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminNewsSaveDto {

    @NotBlank(message = "title must not be blank")
    @Size(max = 200, message = "title length must be <= 200")
    private String title;

    @NotBlank(message = "content must not be blank")
    private String content;

    @Size(max = 512, message = "coverImage length must be <= 512")
    private String coverImage;

    @NotBlank(message = "type must not be blank")
    @Size(max = 16, message = "type length must be <= 16")
    private String type;
}

