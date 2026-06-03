package com.yaozher.v1.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileUpdateDto {

    @Size(max = 64, message = "昵称长度不能超过 64 位")
    private String nickname;

    @Size(max = 512, message = "头像地址长度不能超过 512 位")
    private String avatar;

    @Email(message = "邮箱格式不正确")
    @Size(max = 128, message = "邮箱长度不能超过 128 位")
    private String email;
}
