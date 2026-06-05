package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.dto.ProjectDto;
import com.yaozher.v1.entity.BizProject;
import com.yaozher.v1.mapper.BizProjectMapper;
import com.yaozher.v1.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final BizProjectMapper projectMapper;

    @Override
    public List<ProjectDto> list() {
        return projectMapper.selectList(new LambdaQueryWrapper<BizProject>()
                        .orderByAsc(BizProject::getSortOrder))
                .stream()
                .map(p -> ProjectDto.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .description(p.getDescription())
                        .coverImage(p.getCoverImage())
                        .downloadUrl(p.getDownloadUrl())
                        .githubUrl(p.getGithubUrl())
                        .resourceType(p.getResourceType())
                        .sortOrder(p.getSortOrder())
                        .build())
                .toList();
    }
}
