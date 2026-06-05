package com.yaozher.v1.service;

import com.yaozher.v1.config.AppProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaozher.v1.dto.EmailCodeLoginRequestDto;
import com.yaozher.v1.dto.LoginRequestDto;
import com.yaozher.v1.dto.RegisterCodeRequestDto;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.service.impl.AuthServiceImpl;
import com.yaozher.v1.vo.LoginResponseVo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.InOrder;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private VerificationCodeService verificationCodeService;

    @Mock
    private VerificationMailService verificationMailService;

    private AuthServiceImpl authService;
    private SysUser user;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
                sysUserMapper,
                passwordEncoder,
                new AppProperties(),
                verificationCodeService,
                verificationMailService,
                new ObjectMapper()
        );
        user = SysUser.builder()
                .id(1L)
                .username("chen_ziyao")
                .password("encoded")
                .nickname("陈子尧")
                .email("yaozher@outlook.com")
                .role("ADMIN")
                .createTime(LocalDateTime.of(2007, 4, 10, 0, 0))
                .build();
    }

    @Test
    void passwordLoginAcceptsBoundEmail() {
        when(sysUserMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches("123456", "encoded")).thenReturn(true);

        LoginResponseVo response = authService.login(LoginRequestDto.builder()
                .username("YAOZHER@OUTLOOK.COM")
                .password("123456")
                .build());

        assertThat(response.getUser().getUsername()).isEqualTo("chen_ziyao");
        assertThat(response.getToken()).isNotBlank();
    }

    @Test
    void wrongPasswordReturnsUserFacingMessage() {
        when(sysUserMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches("wrong", "encoded")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(LoginRequestDto.builder()
                .username("chen_ziyao")
                .password("wrong")
                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("账号或密码错误");
    }

    @Test
    void emailCodeLoginUsesRedisVerificationService() {
        when(sysUserMapper.selectOne(any())).thenReturn(user);
        when(verificationCodeService.issue(
                "yaozher@outlook.com",
                VerificationCodePurpose.LOGIN,
                "public",
                "127.0.0.1"
        )).thenReturn("123456");

        authService.sendLoginCode(RegisterCodeRequestDto.builder()
                .email("yaozher@outlook.com")
                .build(), "127.0.0.1");

        InOrder lookupOrder = inOrder(verificationCodeService, sysUserMapper);
        lookupOrder.verify(verificationCodeService).guardEmailLookup("yaozher@outlook.com", "127.0.0.1");
        lookupOrder.verify(sysUserMapper).selectOne(any());
        verify(verificationMailService).sendCode(
                "yaozher@outlook.com",
                "123456",
                VerificationCodePurpose.LOGIN
        );

        LoginResponseVo response = authService.loginByEmailCode(EmailCodeLoginRequestDto.builder()
                .email("yaozher@outlook.com")
                .code("123456")
                .build());

        verify(verificationCodeService).verify(
                "yaozher@outlook.com",
                "123456",
                VerificationCodePurpose.LOGIN,
                "public"
        );
        assertThat(response.getUser().getUsername()).isEqualTo("chen_ziyao");
    }

    @Test
    void unregisteredEmailIsRejectedBeforeIssuingCode() {
        when(sysUserMapper.selectOne(any())).thenReturn(null);

        assertThatThrownBy(() -> authService.sendLoginCode(RegisterCodeRequestDto.builder()
                .email("missing@example.com")
                .build(), "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("该邮箱尚未注册");

        InOrder lookupOrder = inOrder(verificationCodeService, sysUserMapper);
        lookupOrder.verify(verificationCodeService).guardEmailLookup("missing@example.com", "127.0.0.1");
        lookupOrder.verify(sysUserMapper).selectOne(any());
        verify(verificationCodeService, never()).issue(
                "missing@example.com",
                VerificationCodePurpose.LOGIN,
                "public",
                "127.0.0.1"
        );
        verify(verificationMailService, never()).sendCode(any(), any(), any());
    }
}
