package com.yaozher.v1.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("biz_project")
public class BizProject {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String description;

    private String coverImage;

    private String downloadUrl;

    private String githubUrl;

    private Integer sortOrder;
}
