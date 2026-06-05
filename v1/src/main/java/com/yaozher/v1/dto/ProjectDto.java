package com.yaozher.v1.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDto {

    private Long id;

    private String name;

    private String description;

    private String coverImage;

    private String downloadUrl;

    private String githubUrl;

    private String resourceType;

    private Integer sortOrder;
}
