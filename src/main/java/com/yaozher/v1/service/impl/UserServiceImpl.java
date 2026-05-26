package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.security.SecurityUtils;
import com.yaozher.v1.service.UserService;
import com.yaozher.v1.vo.UserProfileVo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final SysUserMapper sysUserMapper;

    @Override
    public UserProfileVo getCurrentUserProfile() {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "未登录");
        }
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .last("limit 1"));
        if (user == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "未登录");
        }
        return UserProfileVo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .role(user.getRole())
                .ledConfig(user.getLedConfig())
                .build();
    }

    @Override
    public void updateLedConfig(String ledConfig) {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "未登录");
        }
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .last("limit 1"));
        if (user == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "未登录");
        }
        SysUser update = SysUser.builder()
                .id(user.getId())
                .ledConfig(ledConfig)
                .build();
        sysUserMapper.updateById(update);
    }
}
