package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.dto.EmailCodeLoginRequestDto;
import com.yaozher.v1.dto.LoginRequestDto;
import com.yaozher.v1.dto.RegisterCodeRequestDto;
import com.yaozher.v1.dto.RegisterRequestDto;
import com.yaozher.v1.service.AuthService;
import com.yaozher.v1.vo.LoginResponseVo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public Result<LoginResponseVo> login(@Valid @RequestBody LoginRequestDto dto) {
        return Result.ok(authService.login(dto));
    }

    @PostMapping("/login/email/code")
    public Result<Void> sendLoginCode(@Valid @RequestBody RegisterCodeRequestDto dto,
                                      HttpServletRequest request) {
        authService.sendLoginCode(dto, resolveClientIp(request));
        return Result.ok();
    }

    @PostMapping("/login/email")
    public Result<LoginResponseVo> loginByEmailCode(@Valid @RequestBody EmailCodeLoginRequestDto dto) {
        return Result.ok(authService.loginByEmailCode(dto));
    }

    @PostMapping("/register/code")
    public Result<Void> sendRegisterCode(@Valid @RequestBody RegisterCodeRequestDto dto,
                                         HttpServletRequest request) {
        authService.sendRegisterCode(dto, resolveClientIp(request));
        return Result.ok();
    }

    @PostMapping("/register")
    public Result<Void> register(@Valid @RequestBody RegisterRequestDto dto) {
        authService.register(dto);
        return Result.ok();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
