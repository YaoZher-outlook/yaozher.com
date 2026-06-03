package com.yaozher.v1.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequestDto {

    @NotBlank(message = "请输入账号")
    @Size(max = 64, message = "账号长度不能超过 64 位")
    private String username;

    @NotBlank(message = "请输入密码")
    private String password;

    @NotBlank(message = "请输入昵称")
    @Size(max = 64, message = "昵称长度不能超过 64 位")
    private String nickname;

    @Email(message = "邮箱格式不正确")
    @NotBlank(message = "请输入邮箱")
    @Size(max = 128, message = "邮箱长度不能超过 128 位")
    private String email;

    @NotBlank(message = "请输入验证码")
    @Size(min = 6, max = 6, message = "验证码应为 6 位")
    private String code;

    private Boolean hr;
}
