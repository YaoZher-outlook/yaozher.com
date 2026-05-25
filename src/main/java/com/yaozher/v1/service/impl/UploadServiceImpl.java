package com.yaozher.v1.service.impl;

import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
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
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UploadServiceImpl implements UploadService {

    private final AppProperties appProperties;

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

        // 返回可访问 URL（配合静态资源映射：/uploads/**）
        return "/uploads/" + filename;
    }
}
