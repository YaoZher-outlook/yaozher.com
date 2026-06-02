package com.yaozher.v1.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.common.Result;
import com.yaozher.v1.config.AppProperties;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.List;
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminContentController {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif");

    private final BizNewsMapper newsMapper;
    private final BizProjectMapper projectMapper;
    private final AppProperties appProperties;

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

    @PostMapping(value = "/project/publish", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<BizProject> publishProject(
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) String downloadUrl,
            @RequestParam(required = false) String githubUrl,
            @RequestParam(required = false) Integer sortOrder,
            @RequestParam(required = false) MultipartFile cover,
            @RequestParam(required = false) MultipartFile file
    ) {
        if (!StringUtils.hasText(name)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "name must not be blank");
        }

        BizProject project = BizProject.builder()
                .name(name.trim())
                .description(trimToNull(description))
                .downloadUrl(trimToNull(downloadUrl))
                .githubUrl(trimToNull(githubUrl))
                .resourceType(normalizeProjectType(resourceType))
                .sortOrder(sortOrder == null ? 0 : sortOrder)
                .build();
        projectMapper.insert(project);

        String coverUrl = saveProjectCover(cover, project.getId());
        String fileUrl = saveProjectFile(file, project.getId(), project.getName());
        if (coverUrl != null || fileUrl != null) {
            BizProject update = BizProject.builder()
                    .id(project.getId())
                    .coverImage(coverUrl)
                    .downloadUrl(fileUrl == null ? project.getDownloadUrl() : fileUrl)
                    .build();
            projectMapper.updateById(update);
        }

        return Result.ok(projectMapper.selectById(project.getId()));
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
                .resourceType(normalizeProjectType(dto.getResourceType()))
                .sortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder())
                .build();
    }

    private String normalizeProjectType(String raw) {
        if (raw == null || raw.isBlank()) {
            return "OPEN_SOURCE";
        }
        return switch (raw.trim().toUpperCase()) {
            case "WEB_LINK", "MC_RESOURCE_PACK", "MC_MAP" -> raw.trim().toUpperCase();
            default -> "OPEN_SOURCE";
        };
    }

    private String saveProjectCover(MultipartFile file, Long projectId) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        if (!isSupportedImage(file)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "cover only supports jpg, png, or gif");
        }
        String filename = projectId + ".png";
        Path dir = Paths.get(StringUtils.hasText(appProperties.getProjectCoverDir())
                        ? appProperties.getProjectCoverDir()
                        : "./storage/assets/cover-images")
                .toAbsolutePath()
                .normalize();
        Path target = dir.resolve(filename).normalize();
        if (!target.startsWith(dir)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "invalid cover filename");
        }
        try {
            BufferedImage source = ImageIO.read(file.getInputStream());
            if (source == null) {
                throw BusinessException.of(ErrorCode.PARAM_ERROR, "invalid cover image");
            }
            BufferedImage png = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_ARGB);
            Graphics2D graphics = png.createGraphics();
            graphics.drawImage(source, 0, 0, null);
            graphics.dispose();
            Files.createDirectories(dir);
            ImageIO.write(png, "png", target.toFile());
            return urlPrefix(appProperties.getProjectCoverUrlPrefix(), "/cover-images/") + filename;
        } catch (BusinessException e) {
            throw e;
        } catch (IOException e) {
            log.error("project cover upload failed", e);
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "cover upload failed");
        }
    }

    private String saveProjectFile(MultipartFile file, Long projectId, String projectName) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        String ext = extension(file.getOriginalFilename());
        String filename = projectId + "-" + slug(projectName) + ext;
        Path dir = Paths.get(StringUtils.hasText(appProperties.getProjectFileDir())
                        ? appProperties.getProjectFileDir()
                        : "./storage/assets/project-files")
                .toAbsolutePath()
                .normalize();
        Path target = dir.resolve(filename).normalize();
        if (!target.startsWith(dir)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "invalid project file name");
        }
        try {
            Files.createDirectories(dir);
            file.transferTo(target);
            return urlPrefix(appProperties.getProjectFileUrlPrefix(), "/project-files/") + filename;
        } catch (IOException e) {
            log.error("project file upload failed", e);
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "project file upload failed");
        }
    }

    private boolean isSupportedImage(MultipartFile file) {
        String ext = extension(file.getOriginalFilename());
        String contentType = file.getContentType();
        return IMAGE_EXTENSIONS.contains(ext)
                || "image/jpeg".equalsIgnoreCase(contentType)
                || "image/png".equalsIgnoreCase(contentType)
                || "image/gif".equalsIgnoreCase(contentType);
    }

    private String extension(String filename) {
        if (!StringUtils.hasText(filename) || !filename.contains(".")) {
            return "";
        }
        String ext = filename.substring(filename.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        return ext.length() > 16 ? "" : ext;
    }

    private String slug(String value) {
        String raw = StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : "project";
        String slug = raw.replaceAll("[^a-z0-9\\u4e00-\\u9fa5]+", "-").replaceAll("(^-|-$)", "");
        return StringUtils.hasText(slug) ? slug : "project";
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String urlPrefix(String configured, String fallback) {
        String prefix = StringUtils.hasText(configured) ? configured : fallback;
        return prefix.endsWith("/") ? prefix : prefix + "/";
    }
}
