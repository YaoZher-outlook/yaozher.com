package com.yaozher.v1.service;

import com.yaozher.v1.dto.EmailCodeLoginRequestDto;
import com.yaozher.v1.dto.LoginRequestDto;
import com.yaozher.v1.dto.RegisterCodeRequestDto;
import com.yaozher.v1.dto.RegisterRequestDto;
import com.yaozher.v1.vo.LoginResponseVo;

public interface AuthService {

    LoginResponseVo login(LoginRequestDto dto);

    LoginResponseVo loginByEmailCode(EmailCodeLoginRequestDto dto);

    void sendRegisterCode(RegisterCodeRequestDto dto, String clientIp);

    void sendLoginCode(RegisterCodeRequestDto dto, String clientIp);

    void register(RegisterRequestDto dto);
}
