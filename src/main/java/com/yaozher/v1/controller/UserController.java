package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.dto.ApiKeyUpdateDto;
import com.yaozher.v1.dto.LedConfigUpdateDto;
import com.yaozher.v1.dto.UserProfileUpdateDto;
import com.yaozher.v1.service.UserService;
import com.yaozher.v1.vo.ApiKeyStatusVo;
import com.yaozher.v1.vo.UserProfileVo;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public Result<UserProfileVo> profile() {
        return Result.ok(userService.getCurrentUserProfile());
    }

    @GetMapping("/admin-config")
    public Result<String> adminConfig() {
        return Result.ok(userService.getAdminLedConfig());
    }

    @PutMapping("/profile")
    public Result<UserProfileVo> updateProfile(@Valid @RequestBody UserProfileUpdateDto dto) {
        return Result.ok(userService.updateProfile(dto));
    }

    @PostMapping("/config")
    public Result<Void> updateConfig(@Valid @RequestBody LedConfigUpdateDto dto) {
        userService.updateLedConfig(dto.getLedConfig());
        return Result.ok();
    }

    @GetMapping("/api-key")
    public Result<ApiKeyStatusVo> apiKeyStatus() {
        return Result.ok(userService.getApiKeyStatus());
    }

    @PostMapping("/api-key")
    public Result<Void> updateApiKeys(@Valid @RequestBody ApiKeyUpdateDto dto) {
        userService.updateApiKeys(dto);
        return Result.ok();
    }
}
