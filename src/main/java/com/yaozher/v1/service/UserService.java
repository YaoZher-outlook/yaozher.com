package com.yaozher.v1.service;

import com.yaozher.v1.vo.UserProfileVo;

public interface UserService {

    UserProfileVo getCurrentUserProfile();

    void updateLedConfig(String ledConfig);
}
