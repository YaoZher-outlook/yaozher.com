package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.service.ApiKeyCryptoService;
import com.yaozher.v1.service.ApiKeyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class ApiKeyServiceImpl implements ApiKeyService {

    private final SysUserMapper sysUserMapper;
    private final ApiKeyCryptoService cryptoService;

    @Override
    public String resolveChatbotApiKey(Long userId) {
        SysUser user = userId == null ? null : sysUserMapper.selectById(userId);
        if (user != null && StringUtils.hasText(user.getApiKeyEncrypted())) {
            return cryptoService.decrypt(user.getApiKeyEncrypted());
        }

        SysUser admin = findAdmin();
        if (admin == null) {
            return null;
        }

        if ("ADMIN".equalsIgnoreCase(admin.getRole()) && user != null && "ADMIN".equalsIgnoreCase(user.getRole())) {
            if (StringUtils.hasText(admin.getAdminApiKeyEncrypted())) {
                return cryptoService.decrypt(admin.getAdminApiKeyEncrypted());
            }
        }

        if (StringUtils.hasText(admin.getChatbotApiKeyEncrypted())) {
            return cryptoService.decrypt(admin.getChatbotApiKeyEncrypted());
        }
        return null;
    }

    private SysUser findAdmin() {
        return sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getRole, "ADMIN")
                .orderByAsc(SysUser::getId)
                .last("limit 1"));
    }
}
