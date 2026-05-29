package com.yaozher.v1.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.common.Result;
import com.yaozher.v1.dto.AdminNewsSaveDto;
import com.yaozher.v1.dto.AdminProjectSaveDto;
import com.yaozher.v1.entity.BizNews;
import com.yaozher.v1.entity.BizProject;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.mapper.BizNewsMapper;
import com.yaozher.v1.mapper.BizProjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminContentController {

    private final BizNewsMapper newsMapper;
    private final BizProjectMapper projectMapper;

    @GetMapping("/news")
    public Result<List<BizNews>> listNews() {
        return Result.ok(newsMapper.selectList(new LambdaQueryWrapper<BizNews>()
                .orderByDesc(BizNews::getCreateTime)));
    }

    @PostMapping("/news")
    public Result<BizNews> createNews(@Valid @RequestBody AdminNewsSaveDto dto) {
        BizNews news = BizNews.builder()
                .title(dto.getTitle())
                .content(dto.getContent())
                .coverImage(dto.getCoverImage())
                .type(dto.getType())
                .createTime(LocalDateTime.now())
                .viewCount(0L)
                .build();
        newsMapper.insert(news);
        return Result.ok(news);
    }

    @PutMapping("/news/{id}")
    public Result<BizNews> updateNews(@PathVariable Long id, @Valid @RequestBody AdminNewsSaveDto dto) {
        BizNews news = newsMapper.selectById(id);
        if (news == null) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "News not found");
        }
        news.setTitle(dto.getTitle());
        news.setContent(dto.getContent());
        news.setCoverImage(dto.getCoverImage());
        news.setType(dto.getType());
        newsMapper.updateById(news);
        return Result.ok(newsMapper.selectById(id));
    }

    @DeleteMapping("/news/{id}")
    public Result<Void> deleteNews(@PathVariable Long id) {
        newsMapper.deleteById(id);
        return Result.ok();
    }

    @GetMapping("/project")
    public Result<List<BizProject>> listProjects() {
        return Result.ok(projectMapper.selectList(new LambdaQueryWrapper<BizProject>()
                .orderByAsc(BizProject::getSortOrder)));
    }

    @PostMapping("/project")
    public Result<BizProject> createProject(@Valid @RequestBody AdminProjectSaveDto dto) {
        BizProject project = toProject(dto);
        projectMapper.insert(project);
        return Result.ok(project);
    }

    @PutMapping("/project/{id}")
    public Result<BizProject> updateProject(@PathVariable Long id, @Valid @RequestBody AdminProjectSaveDto dto) {
        if (projectMapper.selectById(id) == null) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "Project not found");
        }
        BizProject project = toProject(dto);
        project.setId(id);
        projectMapper.updateById(project);
        return Result.ok(projectMapper.selectById(id));
    }

    @DeleteMapping("/project/{id}")
    public Result<Void> deleteProject(@PathVariable Long id) {
        projectMapper.deleteById(id);
        return Result.ok();
    }

    private BizProject toProject(AdminProjectSaveDto dto) {
        return BizProject.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .coverImage(dto.getCoverImage())
                .downloadUrl(dto.getDownloadUrl())
                .githubUrl(dto.getGithubUrl())
                .sortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder())
                .build();
    }
}

