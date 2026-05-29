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

        // news images
        String newsImageDir = appProperties.getNewsImageDir();
        if (!StringUtils.hasText(newsImageDir)) {
            newsImageDir = "./news-images";
        }
        String newsImageLocation = Paths.get(newsImageDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/news-images/**")
                .addResourceLocations(newsImageLocation, "classpath:/static/news-images/");
    }
}
