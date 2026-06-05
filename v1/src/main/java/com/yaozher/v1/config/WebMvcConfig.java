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
        String uploadLocation = fileLocation(uploadDir);
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadLocation);

        // avatars
        String avatarDir = appProperties.getAvatarDir();
        if (!StringUtils.hasText(avatarDir)) {
            avatarDir = "./avatars";
        }
        String avatarLocation = fileLocation(avatarDir);
        registry.addResourceHandler("/avatars/**")
                .addResourceLocations(avatarLocation, "classpath:/static/avatars/");

        // backgrounds
        String backgroundDir = appProperties.getBackgroundDir();
        if (!StringUtils.hasText(backgroundDir)) {
            backgroundDir = "./background";
        }
        String backgroundLocation = fileLocation(backgroundDir);
        String legacyBackgroundLocation = fileLocation("./background");
        registry.addResourceHandler("/backgrounds/**")
                .addResourceLocations(backgroundLocation, legacyBackgroundLocation);

        String backgroundPresetDir = appProperties.getBackgroundPresetDir();
        if (!StringUtils.hasText(backgroundPresetDir)) {
            backgroundPresetDir = "./storage/assets/background-presets";
        }
        String backgroundPresetLocation = fileLocation(backgroundPresetDir);
        registry.addResourceHandler("/background-presets/**")
                .addResourceLocations(backgroundPresetLocation);

        // news images
        String newsImageDir = appProperties.getNewsImageDir();
        if (!StringUtils.hasText(newsImageDir)) {
            newsImageDir = "./news-images";
        }
        String newsImageLocation = fileLocation(newsImageDir);
        registry.addResourceHandler("/news-images/**")
                .addResourceLocations(newsImageLocation, "classpath:/static/news-images/");

        String projectCoverDir = appProperties.getProjectCoverDir();
        if (!StringUtils.hasText(projectCoverDir)) {
            projectCoverDir = "./storage/assets/cover-images";
        }
        String projectCoverLocation = fileLocation(projectCoverDir);
        String legacyProjectCoverLocation = fileLocation("./storage/assets/project-covers");
        registry.addResourceHandler("/cover-images/**")
                .addResourceLocations(projectCoverLocation, "classpath:/static/cover-images/");
        registry.addResourceHandler("/project-covers/**")
                .addResourceLocations(legacyProjectCoverLocation, projectCoverLocation, "classpath:/static/cover-images/");

        String projectFileDir = appProperties.getProjectFileDir();
        if (!StringUtils.hasText(projectFileDir)) {
            projectFileDir = "./storage/assets/resources";
        }
        String projectFileLocation = fileLocation(projectFileDir);
        String legacyProjectFileLocation = fileLocation("./storage/assets/project-files");
        registry.addResourceHandler("/resources/**")
                .addResourceLocations(projectFileLocation);
        registry.addResourceHandler("/project-files/**")
                .addResourceLocations(legacyProjectFileLocation, projectFileLocation);

        String musicDir = appProperties.getMusicDir();
        if (!StringUtils.hasText(musicDir)) {
            musicDir = "./music-library";
        }
        String musicLocation = fileLocation(musicDir);
        registry.addResourceHandler("/music/**")
                .addResourceLocations(musicLocation);
    }

    private String fileLocation(String dir) {
        String location = Paths.get(dir).toAbsolutePath().normalize().toUri().toString();
        return location.endsWith("/") ? location : location + "/";
    }
}
