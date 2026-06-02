package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.security.SecurityUtils;
import com.yaozher.v1.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UploadServiceImpl implements UploadService {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

    private final AppProperties appProperties;
    private final SysUserMapper sysUserMapper;

    @Override
    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "文件不能为空");
        }

        String uploadDir = appProperties.getUploadDir();
        if (!StringUtils.hasText(uploadDir)) {
            uploadDir = "./uploads";
        }

        String origin = file.getOriginalFilename();
        String ext = "";
        if (origin != null && origin.contains(".")) {
            ext = origin.substring(origin.lastIndexOf('.'));
        }

        String filename = UUID.randomUUID() + ext;
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path target = dir.resolve(filename);

        try {
            Files.createDirectories(dir);
            var targetFile = Objects.requireNonNull(target.toFile());
            file.transferTo(targetFile);
        } catch (IOException e) {
            log.error("upload failed", e);
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "文件上传失败");
        }

        return "/uploads/" + filename;
    }

    @Override
    public String uploadAvatar(MultipartFile file) {
        SysUser user = getCurrentUser();
        String filename = user.getId() + resolveImageExtension(file, "头像文件不能为空");
        String avatarUrl = saveImage(file, appProperties.getAvatarDir(), "./avatar", filename,
                appProperties.getAvatarUrlPrefix(), "/avatars/");
        SysUser update = SysUser.builder()
                .id(user.getId())
                .avatar(avatarUrl)
                .build();
        sysUserMapper.updateById(update);
        return avatarUrl;
    }

    @Override
    public String uploadBackground(MultipartFile file) {
        SysUser user = getCurrentUser();
        String filename = "background-" + user.getId() + resolveImageExtension(file, "背景图片不能为空");
        return saveImage(file, appProperties.getBackgroundDir(), "./background", filename,
                appProperties.getBackgroundUrlPrefix(), "/backgrounds/");
    }

    private String saveImage(
            MultipartFile file,
            String configuredDir,
            String fallbackDir,
            String filename,
            String configuredPrefix,
            String fallbackPrefix
    ) {
        String dirName = StringUtils.hasText(configuredDir) ? configuredDir : fallbackDir;
        Path dir = Paths.get(dirName).toAbsolutePath().normalize();
        Path target = dir.resolve(filename).normalize();
        if (!target.startsWith(dir)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "非法文件名");
        }

        try {
            Files.createDirectories(dir);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("image upload failed", e);
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "图片上传失败");
        }

        String prefix = StringUtils.hasText(configuredPrefix) ? configuredPrefix : fallbackPrefix;
        if (!prefix.endsWith("/")) {
            prefix += "/";
        }
        return prefix + filename;
    }

    private SysUser getCurrentUser() {
        String username = SecurityUtils.getCurrentUsername();
        if (!StringUtils.hasText(username)) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "Unauthorized");
        }
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .last("limit 1"));
        if (user == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "Unauthorized");
        }
        return user;
    }

    private String resolveImageExtension(MultipartFile file, String emptyMessage) {
        if (file == null || file.isEmpty()) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, emptyMessage);
        }

        String origin = file.getOriginalFilename();
        String ext = "";
        if (origin != null && origin.contains(".")) {
            ext = origin.substring(origin.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        }

        if (!StringUtils.hasText(ext)) {
            String contentType = file.getContentType();
            if ("image/jpeg".equalsIgnoreCase(contentType)) ext = ".jpg";
            if ("image/png".equalsIgnoreCase(contentType)) ext = ".png";
            if ("image/gif".equalsIgnoreCase(contentType)) ext = ".gif";
            if ("image/webp".equalsIgnoreCase(contentType)) ext = ".webp";
        }

        if (!IMAGE_EXTENSIONS.contains(ext)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "仅支持 jpg、png、gif、webp 图片");
        }
        return ext;
    }
}
