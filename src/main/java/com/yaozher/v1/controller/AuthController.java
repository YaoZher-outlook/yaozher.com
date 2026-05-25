package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.dto.LoginRequestDto;
import com.yaozher.v1.service.AuthService;
import com.yaozher.v1.vo.LoginResponseVo;
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
}
