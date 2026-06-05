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

    @NotBlank(message = "请输入项目名称")
    @Size(max = 128, message = "项目名称不能超过 128 位")
    private String name;

    @Size(max = 512, message = "项目描述不能超过 512 位")
    private String description;

    @Size(max = 512, message = "封面地址不能超过 512 位")
    private String coverImage;

    @Size(max = 512, message = "下载地址不能超过 512 位")
    private String downloadUrl;

    @Size(max = 512, message = "仓库地址不能超过 512 位")
    private String githubUrl;

    @Size(max = 32, message = "资源类型不能超过 32 位")
    private String resourceType;

    private Integer sortOrder;
}
