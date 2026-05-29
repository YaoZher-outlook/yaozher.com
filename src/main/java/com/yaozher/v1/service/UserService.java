package com.yaozher.v1.service;

import com.yaozher.v1.dto.UserProfileUpdateDto;
import com.yaozher.v1.vo.UserProfileVo;

public interface UserService {

    UserProfileVo getCurrentUserProfile();

    UserProfileVo updateProfile(UserProfileUpdateDto dto);

    void updateLedConfig(String ledConfig);
}
