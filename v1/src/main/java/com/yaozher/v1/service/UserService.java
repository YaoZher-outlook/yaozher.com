package com.yaozher.v1.service;

import com.yaozher.v1.dto.UserProfileUpdateDto;
import com.yaozher.v1.dto.ApiKeyUpdateDto;
import com.yaozher.v1.dto.EmailUpdateRequestDto;
import com.yaozher.v1.dto.RegisterCodeRequestDto;
import com.yaozher.v1.dto.UserLocationUpdateDto;
import com.yaozher.v1.vo.ApiKeyStatusVo;
import com.yaozher.v1.vo.UserProfileVo;

public interface UserService {

    UserProfileVo getCurrentUserProfile();

    UserProfileVo updateProfile(UserProfileUpdateDto dto);

    void sendEmailChangeCode(RegisterCodeRequestDto dto, String clientIp);

    UserProfileVo updateEmail(EmailUpdateRequestDto dto);

    UserProfileVo updateLocation(UserLocationUpdateDto dto);

    void updateLedConfig(String ledConfig);

    String getAdminLedConfig();

    ApiKeyStatusVo getApiKeyStatus();

    void updateApiKeys(ApiKeyUpdateDto dto);
}
