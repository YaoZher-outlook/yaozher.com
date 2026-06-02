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

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UploadServiceImpl implements UploadService {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif");

    private final AppProperties appProperties;
    private final SysUserMapper sysUserMapper;

    @Override
    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "文件不能为空");
        }

        SysUser user = getCurrentUserOrNull();
        if (user != null && isSupportedImage(file)) {
            return savePngImage(file, appProperties.getUploadDir(), "./uploads", user.getId() + ".png", "/uploads/");
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
        String avatarUrl = savePngImage(file, appProperties.getAvatarDir(), "./avatars", user.getId() + ".png",
                appProperties.getAvatarUrlPrefix());
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
        return savePngImage(file, appProperties.getBackgroundDir(), "./backgrounds", user.getId() + ".png",
                appProperties.getBackgroundUrlPrefix());
    }

    private String savePngImage(
            MultipartFile file,
            String configuredDir,
            String fallbackDir,
            String filename,
            String configuredPrefix
    ) {
        if (file == null || file.isEmpty()) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "图片不能为空");
        }
        if (!isSupportedImage(file)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "仅支持 jpg、png、gif 图片");
        }

        String dirName = StringUtils.hasText(configuredDir) ? configuredDir : fallbackDir;
        Path dir = Paths.get(dirName).toAbsolutePath().normalize();
        Path target = dir.resolve(filename).normalize();
        if (!target.startsWith(dir)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "非法文件名");
        }

        try {
            BufferedImage source = ImageIO.read(file.getInputStream());
            if (source == null) {
                throw BusinessException.of(ErrorCode.PARAM_ERROR, "无法读取图片内容");
            }
            BufferedImage png = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_ARGB);
            Graphics2D graphics = png.createGraphics();
            graphics.drawImage(source, 0, 0, null);
            graphics.dispose();

            Files.createDirectories(dir);
            ImageIO.write(png, "png", target.toFile());
        } catch (BusinessException e) {
            throw e;
        } catch (IOException e) {
            log.error("image upload failed", e);
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "图片上传失败");
        }

        String prefix = StringUtils.hasText(configuredPrefix) ? configuredPrefix : "/uploads/";
        if (!prefix.endsWith("/")) {
            prefix += "/";
        }
        return prefix + filename;
    }

    private SysUser getCurrentUser() {
        SysUser user = getCurrentUserOrNull();
        if (user == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "Unauthorized");
        }
        return user;
    }

    private SysUser getCurrentUserOrNull() {
        String username = SecurityUtils.getCurrentUsername();
        if (!StringUtils.hasText(username)) {
            return null;
        }
        return sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .last("limit 1"));
    }

    private boolean isSupportedImage(MultipartFile file) {
        String origin = file.getOriginalFilename();
        String ext = "";
        if (origin != null && origin.contains(".")) {
            ext = origin.substring(origin.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        }
        String contentType = file.getContentType();
        return IMAGE_EXTENSIONS.contains(ext)
                || "image/jpeg".equalsIgnoreCase(contentType)
                || "image/png".equalsIgnoreCase(contentType)
                || "image/gif".equalsIgnoreCase(contentType);
    }
}
