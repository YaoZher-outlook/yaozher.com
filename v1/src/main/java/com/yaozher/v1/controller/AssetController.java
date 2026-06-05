package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.vo.AssetOptionVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
@Slf4j
public class AssetController {

    private final AppProperties appProperties;

    @GetMapping("/background-presets")
    public Result<List<AssetOptionVo>> backgroundPresets() {
        String configuredDir = appProperties.getBackgroundPresetDir();
        String configuredPrefix = appProperties.getBackgroundPresetUrlPrefix();
        Path dir = Paths.get(StringUtils.hasText(configuredDir) ? configuredDir : "./storage/assets/background-presets")
                .toAbsolutePath()
                .normalize();
        String prefix = StringUtils.hasText(configuredPrefix) ? configuredPrefix : "/background-presets/";
        if (!prefix.endsWith("/")) {
            prefix += "/";
        }
        if (!Files.isDirectory(dir)) {
            return Result.ok(List.of());
        }

        String urlPrefix = prefix;
        try (var stream = Files.walk(dir)) {
            List<AssetOptionVo> options = stream
                    .filter(Files::isRegularFile)
                    .filter(this::isImage)
                    .sorted(Comparator.comparing(p -> dir.relativize(p).toString()))
                    .map(p -> {
                        Path relative = dir.relativize(p);
                        return AssetOptionVo.builder()
                                .name(toDisplayName(relative))
                                .url(urlPrefix + encodeRelativePath(relative))
                                .build();
                    })
                    .toList();
            return Result.ok(options);
        } catch (IOException e) {
            log.warn("failed to list background presets from {}", dir, e);
            return Result.ok(List.of());
        }
    }

    private boolean isImage(Path path) {
        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".gif") || name.endsWith(".webp");
    }

    private String toDisplayName(Path relativePath) {
        String filename = relativePath.toString().replace('\\', '/');
        int dot = filename.lastIndexOf('.');
        String base = dot > 0 ? filename.substring(0, dot) : filename;
        return base.replace("/", " / ").replace('-', ' ').replace('_', ' ');
    }

    private String encodeRelativePath(Path relativePath) {
        String[] segments = relativePath.toString().replace('\\', '/').split("/");
        return String.join("/", java.util.Arrays.stream(segments)
                .map(segment -> UriUtils.encodePathSegment(segment, StandardCharsets.UTF_8))
                .toList());
    }
}
