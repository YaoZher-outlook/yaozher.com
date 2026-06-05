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

    @NotBlank(message = "请输入新闻标题")
    @Size(max = 200, message = "新闻标题不能超过 200 位")
    private String title;

    @NotBlank(message = "请输入新闻内容")
    private String content;

    @Size(max = 512, message = "封面地址不能超过 512 位")
    private String coverImage;

    @NotBlank(message = "请选择新闻类型")
    @Size(max = 16, message = "新闻类型不能超过 16 位")
    private String type;
}
