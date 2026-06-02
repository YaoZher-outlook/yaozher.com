package com.yaozher.v1.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final AppProperties appProperties;

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // uploads
        String uploadDir = appProperties.getUploadDir();
        if (!StringUtils.hasText(uploadDir)) {
            uploadDir = "./uploads";
        }
        String uploadLocation = Paths.get(uploadDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadLocation);

        // avatars
        String avatarDir = appProperties.getAvatarDir();
        if (!StringUtils.hasText(avatarDir)) {
            avatarDir = "./avatars";
        }
        String avatarLocation = Paths.get(avatarDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/avatars/**")
                .addResourceLocations(avatarLocation, "classpath:/static/avatars/");

        // backgrounds
        String backgroundDir = appProperties.getBackgroundDir();
        if (!StringUtils.hasText(backgroundDir)) {
            backgroundDir = "./background";
        }
        String backgroundLocation = Paths.get(backgroundDir).toAbsolutePath().normalize().toUri().toString();
        String legacyBackgroundLocation = Paths.get("./background").toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/backgrounds/**")
                .addResourceLocations(backgroundLocation, legacyBackgroundLocation);

        String backgroundPresetDir = appProperties.getBackgroundPresetDir();
        if (!StringUtils.hasText(backgroundPresetDir)) {
            backgroundPresetDir = "./storage/assets/background-presets";
        }
        String backgroundPresetLocation = Paths.get(backgroundPresetDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/background-presets/**")
                .addResourceLocations(backgroundPresetLocation);

        // news images
        String newsImageDir = appProperties.getNewsImageDir();
        if (!StringUtils.hasText(newsImageDir)) {
            newsImageDir = "./news-images";
        }
        String newsImageLocation = Paths.get(newsImageDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/news-images/**")
                .addResourceLocations(newsImageLocation, "classpath:/static/news-images/");

        String projectCoverDir = appProperties.getProjectCoverDir();
        if (!StringUtils.hasText(projectCoverDir)) {
            projectCoverDir = "./storage/assets/cover-images";
        }
        String projectCoverLocation = Paths.get(projectCoverDir).toAbsolutePath().normalize().toUri().toString();
        String legacyProjectCoverLocation = Paths.get("./storage/assets/project-covers").toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/cover-images/**")
                .addResourceLocations(projectCoverLocation, "classpath:/static/cover-images/");
        registry.addResourceHandler("/project-covers/**")
                .addResourceLocations(legacyProjectCoverLocation, projectCoverLocation, "classpath:/static/cover-images/");

        String projectFileDir = appProperties.getProjectFileDir();
        if (!StringUtils.hasText(projectFileDir)) {
            projectFileDir = "./storage/assets/project-files";
        }
        String projectFileLocation = Paths.get(projectFileDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/project-files/**")
                .addResourceLocations(projectFileLocation);

        String musicDir = appProperties.getMusicDir();
        if (!StringUtils.hasText(musicDir)) {
            musicDir = "./music-library";
        }
        String musicLocation = Paths.get(musicDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/music/**")
                .addResourceLocations(musicLocation);
    }
}
