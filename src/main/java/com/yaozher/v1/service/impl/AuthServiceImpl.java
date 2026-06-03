package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.dto.LoginRequestDto;
import com.yaozher.v1.dto.RegisterCodeRequestDto;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[A-Za-z0-9_]{3,64}$");
    private static final Duration CODE_TTL = Duration.ofMinutes(10);
    private static final Duration SEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_VERIFY_ATTEMPTS = 5;
    private static final String DEFAULT_LED_CONFIG = """
            {"theme":"dark","glow":true,"color":"#00e5ff","intensity":0.85,"glassOpacity":0.42,"glassTexture":"frosted","backgroundImageUrl":"","backgroundOpacity":0.16,"chatBubbleOpacity":0.5,"chatBubbleTexture":"frosted","musicBgEnabled":true,"musicBgIntensity":0.52,"musicBgBlur":4,"musicBgSize":1,"musicBgColor":"#00e5ff","lyricsPanelEnabled":false,"lyricsPanelOpacity":0.36,"lyricsFontSize":22,"lyricsFollow":true,"lyricsLineCount":5,"lyricsBlur":14}
            """;

    private final SysUserMapper sysUserMapper;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final Environment environment;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, CodeRecord> codeStore = new ConcurrentHashMap<>();

    @Override
    public LoginResponseVo login(LoginRequestDto dto) {
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, dto.getUsername())
                .last("limit 1"));

        if (user == null || !passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "账号或密码错误");
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
                        .createTime(user.getCreateTime())
                        .build())
                .build();
    }

    @Override
    public void sendRegisterCode(RegisterCodeRequestDto dto, String clientIp) {
        String email = normalizeEmail(dto.getEmail());
        ensureEmailNotUsed(email);

        CodeRecord old = codeStore.get(email);
        Instant now = Instant.now();
        if (old != null && Duration.between(old.lastSentAt(), now).compareTo(SEND_COOLDOWN) < 0) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码发送太频繁，请稍后再试");
        }

        String code = String.format("%06d", secureRandom.nextInt(1_000_000));
        CodeRecord next = new CodeRecord(code, now.plus(CODE_TTL), now, 0, clientIp);
        codeStore.put(email, next);
        sendCodeEmail(email, code);
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
        verifyCode(email, code);

        SysUser user = SysUser.builder()
                .username(username)
                .password(passwordEncoder.encode(dto.getPassword()))
                .nickname(nickname)
                .email(email)
                .avatar(null)
                .ledConfig(DEFAULT_LED_CONFIG)
                .role(Boolean.TRUE.equals(dto.getHr()) ? "HR" : "USER")
                .createTime(LocalDateTime.now().withSecond(0).withNano(0))
                .build();
        sysUserMapper.insert(user);
        codeStore.remove(email);
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

    private void verifyCode(String email, String code) {
        CodeRecord record = codeStore.get(email);
        if (record == null || record.expiresAt().isBefore(Instant.now())) {
            codeStore.remove(email);
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码已过期，请重新获取");
        }
        if (record.attempts() >= MAX_VERIFY_ATTEMPTS) {
            codeStore.remove(email);
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码尝试次数过多，请重新获取");
        }
        if (!record.code().equals(code)) {
            codeStore.put(email, record.withAttempts(record.attempts() + 1));
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码不正确");
        }
    }

    private String normalizeEmail(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "请输入邮箱");
        }
        return raw.trim().toLowerCase();
    }

    private void sendCodeEmail(String email, String code) {
        String host = environment.getProperty("spring.mail.host");
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null || !StringUtils.hasText(host)) {
            log.warn("mail is not configured; register verification code for {} is {}", email, code);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        String from = environment.getProperty("spring.mail.username");
        if (StringUtils.hasText(from)) {
            message.setFrom(from);
        }
        message.setTo(email);
        message.setSubject("yaozher.com registration verification code");
        message.setText("Your verification code is: " + code + "\nIt expires in 10 minutes.");
        sender.send(message);
    }

    private record CodeRecord(String code, Instant expiresAt, Instant lastSentAt, int attempts, String clientIp) {
        private CodeRecord withAttempts(int nextAttempts) {
            return new CodeRecord(code, expiresAt, lastSentAt, nextAttempts, clientIp);
        }
    }
}
