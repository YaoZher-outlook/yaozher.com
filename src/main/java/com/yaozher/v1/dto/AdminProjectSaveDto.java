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
public class AdminProjectSaveDto {

    @NotBlank(message = "name must not be blank")
    @Size(max = 128, message = "name length must be <= 128")
    private String name;

    @Size(max = 512, message = "description length must be <= 512")
    private String description;

    @Size(max = 512, message = "coverImage length must be <= 512")
    private String coverImage;

    @Size(max = 512, message = "downloadUrl length must be <= 512")
    private String downloadUrl;

    @Size(max = 512, message = "githubUrl length must be <= 512")
    private String githubUrl;

    private Integer sortOrder;
}

