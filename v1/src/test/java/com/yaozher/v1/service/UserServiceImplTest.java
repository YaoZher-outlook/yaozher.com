package com.yaozher.v1.service;

import com.yaozher.v1.dto.EmailUpdateRequestDto;
import com.yaozher.v1.dto.UserProfileUpdateDto;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.service.impl.UserServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private ApiKeyCryptoService apiKeyCryptoService;

    @Mock
    private VerificationCodeService verificationCodeService;

    @Mock
    private VerificationMailService verificationMailService;

    private UserServiceImpl userService;
    private SysUser currentUser;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("chen_ziyao", null)
        );
        userService = new UserServiceImpl(
                sysUserMapper,
                apiKeyCryptoService,
                verificationCodeService,
                verificationMailService
        );
        currentUser = SysUser.builder()
                .id(1L)
                .username("chen_ziyao")
                .nickname("Admin")
                .email("old@example.com")
                .role("ADMIN")
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void profileUpdateCannotChangeEmail() {
        when(sysUserMapper.selectOne(any())).thenReturn(currentUser);
        when(sysUserMapper.selectById(1L)).thenReturn(currentUser);

        userService.updateProfile(UserProfileUpdateDto.builder()
                .nickname("New nickname")
                .build());

        ArgumentCaptor<SysUser> updateCaptor = ArgumentCaptor.forClass(SysUser.class);
        verify(sysUserMapper).updateById(updateCaptor.capture());
        assertThat(updateCaptor.getValue().getNickname()).isEqualTo("New nickname");
        assertThat(updateCaptor.getValue().getEmail()).isNull();
    }

    @Test
    void emailUpdateRequiresScopedVerificationCode() {
        SysUser updatedUser = SysUser.builder()
                .id(1L)
                .username("chen_ziyao")
                .nickname("Admin")
                .email("new@example.com")
                .role("ADMIN")
                .build();
        when(sysUserMapper.selectOne(any())).thenReturn(currentUser).thenReturn(null);
        when(sysUserMapper.selectById(1L)).thenReturn(updatedUser);

        userService.updateEmail(EmailUpdateRequestDto.builder()
                .email("NEW@example.com")
                .code("123456")
                .build());

        verify(verificationCodeService).verify(
                "new@example.com",
                "123456",
                VerificationCodePurpose.CHANGE_EMAIL,
                "1"
        );
        ArgumentCaptor<SysUser> updateCaptor = ArgumentCaptor.forClass(SysUser.class);
        verify(sysUserMapper).updateById(updateCaptor.capture());
        assertThat(updateCaptor.getValue().getEmail()).isEqualTo("new@example.com");
    }
}
