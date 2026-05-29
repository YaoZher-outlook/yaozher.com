package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.dto.UserProfileUpdateDto;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.security.SecurityUtils;
import com.yaozher.v1.service.UserService;
import com.yaozher.v1.vo.UserProfileVo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final SysUserMapper sysUserMapper;

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
            update.setAvatar(dto.getAvatar().trim());
        }
        if (dto.getEmail() != null) {
            update.setEmail(dto.getEmail().trim());
        }
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

    private SysUser getCurrentUser() {
        String username = SecurityUtils.getCurrentUsername();
        if (!StringUtils.hasText(username)) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "Unauthorized");
        }
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .last("limit 1"));
        if (user == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "Unauthorized");
        }
        return user;
    }

    private UserProfileVo toProfileVo(SysUser user) {
        return UserProfileVo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .email(user.getEmail())
                .role(user.getRole())
                .ledConfig(user.getLedConfig())
                .build();
    }
}
