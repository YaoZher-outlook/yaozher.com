package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.dto.EmailCodeLoginRequestDto;
import com.yaozher.v1.dto.LoginRequestDto;
import com.yaozher.v1.dto.RegisterCodeRequestDto;
import com.yaozher.v1.dto.RegisterRequestDto;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.service.AuthService;
import com.yaozher.v1.service.VerificationCodePurpose;
import com.yaozher.v1.service.VerificationCodeService;
import com.yaozher.v1.service.VerificationMailService;
import com.yaozher.v1.utils.JwtUtils;
import com.yaozher.v1.vo.LoginResponseVo;
import com.yaozher.v1.vo.LoginUserVo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[A-Za-z0-9_]{3,64}$");
    private static final String PUBLIC_SCOPE = "public";
    private static final String DEFAULT_LED_CONFIG = """
            {"theme":"dark","glow":true,"color":"#00e5ff","intensity":0.85,"glassOpacity":0.42,"glassTexture":"frosted","backgroundImageUrl":"","backgroundOpacity":0.16,"chatBubbleOpacity":0.5,"chatBubbleTexture":"frosted","musicBgEnabled":true,"musicBgIntensity":0.52,"musicBgBlur":4,"musicBgSize":1,"musicBgColor":"#00e5ff","lyricsPanelEnabled":false,"lyricsPanelOpacity":0.36,"lyricsFontSize":22,"lyricsFollow":true,"lyricsLineCount":5,"lyricsBlur":14}
            """;

    private final SysUserMapper sysUserMapper;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;
    private final VerificationCodeService verificationCodeService;
    private final VerificationMailService verificationMailService;
    private final ObjectMapper objectMapper;

    @Override
    public LoginResponseVo login(LoginRequestDto dto) {
        String account = dto.getUsername().trim();
        String normalizedAccount = account.toLowerCase(Locale.ROOT);
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .and(wrapper -> wrapper
                        .eq(SysUser::getUsername, account)
                        .or()
                        .eq(SysUser::getEmail, normalizedAccount))
                .last("limit 1"));

        if (user == null || !passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "账号或密码错误");
        }

        return createLoginResponse(user);
    }

    @Override
    public LoginResponseVo loginByEmailCode(EmailCodeLoginRequestDto dto) {
        String email = normalizeEmail(dto.getEmail());
        SysUser user = findUserByEmail(email);
        if (user == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "邮箱或验证码错误");
        }

        verificationCodeService.verify(
                email,
                dto.getCode() == null ? "" : dto.getCode().trim(),
                VerificationCodePurpose.LOGIN,
                PUBLIC_SCOPE
        );
        return createLoginResponse(user);
    }

    private LoginResponseVo createLoginResponse(SysUser user) {
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
                        .createTime(user.getCreateTime())
                        .build())
                .build();
    }

    @Override
    public void sendRegisterCode(RegisterCodeRequestDto dto, String clientIp) {
        String email = normalizeEmail(dto.getEmail());
        ensureEmailNotUsed(email);
        issueAndSendCode(email, VerificationCodePurpose.REGISTER, PUBLIC_SCOPE, clientIp);
    }

    @Override
    public void sendLoginCode(RegisterCodeRequestDto dto, String clientIp) {
        String email = normalizeEmail(dto.getEmail());
        verificationCodeService.guardEmailLookup(email, clientIp);
        if (findUserByEmail(email) == null) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "该邮箱尚未注册");
        }
        issueAndSendCode(email, VerificationCodePurpose.LOGIN, PUBLIC_SCOPE, clientIp);
    }

    @Override
    public void register(RegisterRequestDto dto) {
        String username = dto.getUsername() == null ? "" : dto.getUsername().trim();
        String nickname = dto.getNickname() == null ? "" : dto.getNickname().trim();
        String email = normalizeEmail(dto.getEmail());
        String code = dto.getCode() == null ? "" : dto.getCode().trim();

        if (!USERNAME_PATTERN.matcher(username).matches()) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "账号只能包含字母、数字和下划线，长度 3-64");
        }
        if (!StringUtils.hasText(nickname)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "请输入昵称");
        }
        if (dto.getPassword() == null || dto.getPassword().length() < 6 || dto.getPassword().length() > 72) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "密码长度需为 6-72 位");
        }
        ensureUsernameNotUsed(username);
        ensureEmailNotUsed(email);
        verificationCodeService.verify(email, code, VerificationCodePurpose.REGISTER, PUBLIC_SCOPE);

        SysUser user = SysUser.builder()
                .username(username)
                .password(passwordEncoder.encode(dto.getPassword()))
                .nickname(nickname)
                .email(email)
                .avatar(null)
                .ledConfig(resolveRegistrationConfig(dto.getLedConfig()))
                .role(Boolean.TRUE.equals(dto.getHr()) ? "HR" : "USER")
                .createTime(LocalDateTime.now().withSecond(0).withNano(0))
                .build();
        sysUserMapper.insert(user);
    }

    private void ensureUsernameNotUsed(String username) {
        Long count = sysUserMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username));
        if (count != null && count > 0) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "账号已存在");
        }
    }

    private void ensureEmailNotUsed(String email) {
        Long count = sysUserMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getEmail, email));
        if (count != null && count > 0) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "邮箱已被注册");
        }
    }

    private SysUser findUserByEmail(String email) {
        return sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getEmail, email)
                .last("limit 1"));
    }

    private String normalizeEmail(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "请输入邮箱");
        }
        return raw.trim().toLowerCase(Locale.ROOT);
    }

    private String resolveRegistrationConfig(String raw) {
        if (!StringUtils.hasText(raw)) {
            return DEFAULT_LED_CONFIG;
        }
        try {
            JsonNode config = objectMapper.readTree(raw);
            if (config != null && config.isObject()) {
                return objectMapper.writeValueAsString(config);
            }
        } catch (Exception ignored) {
            // Invalid client settings fall back to the maintained registration defaults.
        }
        return DEFAULT_LED_CONFIG;
    }

    private void issueAndSendCode(String email,
                                  VerificationCodePurpose purpose,
                                  String scope,
                                  String clientIp) {
        String code = verificationCodeService.issue(email, purpose, scope, clientIp);
        sendCodeOrInvalidate(email, code, purpose, scope);
    }

    private void sendCodeOrInvalidate(String email,
                                      String code,
                                      VerificationCodePurpose purpose,
                                      String scope) {
        try {
            verificationMailService.sendCode(email, code, purpose);
        } catch (RuntimeException e) {
            verificationCodeService.invalidate(email, purpose, scope);
            throw e;
        }
    }
}
