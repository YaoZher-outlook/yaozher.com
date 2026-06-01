package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.dto.LoginRequestDto;
import com.yaozher.v1.dto.RegisterRequestDto;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.service.AuthService;
import com.yaozher.v1.utils.JwtUtils;
import com.yaozher.v1.vo.LoginResponseVo;
import com.yaozher.v1.vo.LoginUserVo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserMapper sysUserMapper;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    @Override
    public LoginResponseVo login(LoginRequestDto dto) {
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, dto.getUsername())
                .last("limit 1"));

        if (user == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "用户名或密码错误");
        }
        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "用户名或密码错误");
        }

        String secret = appProperties.getJwt() == null || appProperties.getJwt().getSecret() == null
                ? JwtUtils.DEFAULT_SECRET
                : appProperties.getJwt().getSecret();
        long expireMillis = appProperties.getJwt() == null || appProperties.getJwt().getExpireMillis() == null
                ? 7 * 24 * 60 * 60 * 1000L
                : appProperties.getJwt().getExpireMillis();

        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", user.getId());
        claims.put("role", user.getRole());

        String token = JwtUtils.generateToken(user.getUsername(), claims, expireMillis, secret);

        return LoginResponseVo.builder()
                .token(token)
                .user(LoginUserVo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .nickname(user.getNickname())
                        .avatar(user.getAvatar())
                        .email(user.getEmail())
                        .role(user.getRole())
                        .build())
                .build();
    }

    @Override
    public void register(RegisterRequestDto dto) {
        throw BusinessException.of(ErrorCode.BIZ_ERROR, "Register API is reserved and not implemented yet");
    }
}
