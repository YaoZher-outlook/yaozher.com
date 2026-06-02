package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.vo.AssetOptionVo;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AppProperties appProperties;

    @GetMapping("/background-presets")
    public Result<List<AssetOptionVo>> backgroundPresets() throws IOException {
        String configuredDir = appProperties.getBackgroundPresetDir();
        String configuredPrefix = appProperties.getBackgroundPresetUrlPrefix();
        Path dir = Paths.get(StringUtils.hasText(configuredDir) ? configuredDir : "./storage/assets/background-presets")
                .toAbsolutePath()
                .normalize();
        String prefix = StringUtils.hasText(configuredPrefix) ? configuredPrefix : "/background-presets/";
        if (!prefix.endsWith("/")) {
            prefix += "/";
        }
        if (!Files.exists(dir)) {
            return Result.ok(List.of());
        }

        String urlPrefix = prefix;
        List<AssetOptionVo> options;
        try (var stream = Files.list(dir)) {
            options = stream
                    .filter(Files::isRegularFile)
                    .filter(this::isImage)
                    .sorted(Comparator.comparing(p -> p.getFileName().toString()))
                    .map(p -> {
                        String filename = p.getFileName().toString();
                        return AssetOptionVo.builder()
                                .name(toDisplayName(filename))
                                .url(urlPrefix + filename)
                                .build();
                    })
                    .toList();
        }
        return Result.ok(options);
    }

    private boolean isImage(Path path) {
        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".gif") || name.endsWith(".webp");
    }

    private String toDisplayName(String filename) {
        int dot = filename.lastIndexOf('.');
        String base = dot > 0 ? filename.substring(0, dot) : filename;
        return base.replace('-', ' ').replace('_', ' ');
    }
}
