package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.yaozher.v1.dto.ApiKeyUpdateDto;
import com.yaozher.v1.dto.EmailUpdateRequestDto;
import com.yaozher.v1.dto.RegisterCodeRequestDto;
import com.yaozher.v1.dto.UserLocationUpdateDto;
import com.yaozher.v1.dto.UserProfileUpdateDto;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.security.SecurityUtils;
import com.yaozher.v1.service.ApiKeyCryptoService;
import com.yaozher.v1.service.UserService;
import com.yaozher.v1.service.VerificationCodePurpose;
import com.yaozher.v1.service.VerificationCodeService;
import com.yaozher.v1.service.VerificationMailService;
import com.yaozher.v1.vo.ApiKeyStatusVo;
import com.yaozher.v1.vo.UserProfileVo;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final SysUserMapper sysUserMapper;
    private final ApiKeyCryptoService apiKeyCryptoService;
    private final VerificationCodeService verificationCodeService;
    private final VerificationMailService verificationMailService;

    @Override
    public UserProfileVo getCurrentUserProfile() {
        return toProfileVo(getCurrentUser());
    }

    @Override
    public UserProfileVo updateProfile(UserProfileUpdateDto dto) {
        SysUser user = getCurrentUser();
        SysUser update = SysUser.builder()
                .id(user.getId())
                .build();
        if (StringUtils.hasText(dto.getNickname())) {
            update.setNickname(dto.getNickname().trim());
        }
        if (dto.getAvatar() != null) {
            String avatar = dto.getAvatar().trim();
            if (StringUtils.hasText(avatar)) {
                update.setAvatar(avatar);
            }
        }
        sysUserMapper.updateById(update);
        return toProfileVo(sysUserMapper.selectById(user.getId()));
    }

    @Override
    public void sendEmailChangeCode(RegisterCodeRequestDto dto, String clientIp) {
        SysUser user = getCurrentUser();
        String email = normalizeEmail(dto.getEmail());
        ensureEmailCanBeBound(email, user);

        String scope = String.valueOf(user.getId());
        String code = verificationCodeService.issue(
                email,
                VerificationCodePurpose.CHANGE_EMAIL,
                scope,
                clientIp
        );
        try {
            verificationMailService.sendCode(email, code, VerificationCodePurpose.CHANGE_EMAIL);
        } catch (RuntimeException e) {
            verificationCodeService.invalidate(email, VerificationCodePurpose.CHANGE_EMAIL, scope);
            throw e;
        }
    }

    @Override
    public UserProfileVo updateEmail(EmailUpdateRequestDto dto) {
        SysUser user = getCurrentUser();
        String email = normalizeEmail(dto.getEmail());
        ensureEmailCanBeBound(email, user);
        verificationCodeService.verify(
                email,
                dto.getCode() == null ? "" : dto.getCode().trim(),
                VerificationCodePurpose.CHANGE_EMAIL,
                String.valueOf(user.getId())
        );

        try {
            SysUser update = SysUser.builder()
                    .id(user.getId())
                    .email(email)
                    .build();
            sysUserMapper.updateById(update);
        } catch (DuplicateKeyException e) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "邮箱已被注册");
        }
        return toProfileVo(sysUserMapper.selectById(user.getId()));
    }

    @Override
    public UserProfileVo updateLocation(UserLocationUpdateDto dto) {
        SysUser user = getCurrentUser();
        SysUser update = SysUser.builder()
                .id(user.getId())
                .locationLatitude(dto.getLatitude())
                .locationLongitude(dto.getLongitude())
                .locationAccuracy(dto.getAccuracy())
                .locationUpdatedAt(LocalDateTime.now().withSecond(0).withNano(0))
                .build();
        sysUserMapper.updateById(update);
        return toProfileVo(sysUserMapper.selectById(user.getId()));
    }

    @Override
    public void updateLedConfig(String ledConfig) {
        SysUser user = getCurrentUser();
        SysUser update = SysUser.builder()
                .id(user.getId())
                .ledConfig(ledConfig)
                .build();
        sysUserMapper.updateById(update);
    }

    @Override
    public String getAdminLedConfig() {
        SysUser admin = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getRole, "ADMIN")
                .orderByAsc(SysUser::getId)
                .last("limit 1"));
        return admin == null ? null : admin.getLedConfig();
    }

    @Override
    public ApiKeyStatusVo getApiKeyStatus() {
        SysUser user = getCurrentUser();
        return ApiKeyStatusVo.builder()
                .hasApiKey(StringUtils.hasText(user.getApiKeyEncrypted()))
                .hasAdminApiKey(StringUtils.hasText(user.getAdminApiKeyEncrypted()))
                .hasChatbotApiKey(StringUtils.hasText(user.getChatbotApiKeyEncrypted()))
                .build();
    }

    @Override
    public void updateApiKeys(ApiKeyUpdateDto dto) {
        SysUser user = getCurrentUser();
        boolean admin = "ADMIN".equalsIgnoreCase(user.getRole());
        if (!admin && (dto.getAdminApiKey() != null || dto.getChatbotApiKey() != null)) {
            throw BusinessException.of(ErrorCode.FORBIDDEN, "只有管理员可以更新全站 API Key");
        }

        LambdaUpdateWrapper<SysUser> update = new LambdaUpdateWrapper<SysUser>()
                .eq(SysUser::getId, user.getId());
        boolean changed = false;

        if (dto.getApiKey() != null) {
            update.set(SysUser::getApiKeyEncrypted, encryptOrNull(dto.getApiKey()));
            changed = true;
        }
        if (admin && dto.getAdminApiKey() != null) {
            update.set(SysUser::getAdminApiKeyEncrypted, encryptOrNull(dto.getAdminApiKey()));
            changed = true;
        }
        if (admin && dto.getChatbotApiKey() != null) {
            update.set(SysUser::getChatbotApiKeyEncrypted, encryptOrNull(dto.getChatbotApiKey()));
            changed = true;
        }

        if (changed) {
            sysUserMapper.update(null, update);
        }
    }

    private SysUser getCurrentUser() {
        String username = SecurityUtils.getCurrentUsername();
        if (!StringUtils.hasText(username)) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "请先登录");
        }
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .last("limit 1"));
        if (user == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "请先登录");
        }
        return user;
    }

    private String encryptOrNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return apiKeyCryptoService.encrypt(value.trim());
    }

    private String normalizeEmail(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "请输入邮箱");
        }
        return raw.trim().toLowerCase(Locale.ROOT);
    }

    private void ensureEmailCanBeBound(String email, SysUser currentUser) {
        if (email.equalsIgnoreCase(currentUser.getEmail())) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "新邮箱不能与当前邮箱相同");
        }
        SysUser existing = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getEmail, email)
                .last("limit 1"));
        if (existing != null && !existing.getId().equals(currentUser.getId())) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "邮箱已被注册");
        }
    }

    private UserProfileVo toProfileVo(SysUser user) {
        return UserProfileVo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .email(user.getEmail())
                .role(user.getRole())
                .createTime(user.getCreateTime())
                .ledConfig(user.getLedConfig())
                .locationLatitude(user.getLocationLatitude())
                .locationLongitude(user.getLocationLongitude())
                .locationAccuracy(user.getLocationAccuracy())
                .locationUpdatedAt(user.getLocationUpdatedAt())
                .build();
    }
}
