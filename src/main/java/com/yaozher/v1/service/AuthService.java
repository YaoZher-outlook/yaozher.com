package com.yaozher.v1.service;

import com.yaozher.v1.dto.LoginRequestDto;
import com.yaozher.v1.vo.LoginResponseVo;

public interface AuthService {

    LoginResponseVo login(LoginRequestDto dto);
}
