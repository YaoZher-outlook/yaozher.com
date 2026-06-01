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

    @NotBlank(message = "username must not be blank")
    @Size(max = 64, message = "username length must be <= 64")
    private String username;

    @NotBlank(message = "password must not be blank")
    private String password;

    @NotBlank(message = "nickname must not be blank")
    @Size(max = 64, message = "nickname length must be <= 64")
    private String nickname;

    @Email(message = "email format is invalid")
    @NotBlank(message = "email must not be blank")
    @Size(max = 128, message = "email length must be <= 128")
    private String email;

    @NotBlank(message = "verification code must not be blank")
    @Size(min = 6, max = 6, message = "verification code length must be 6")
    private String code;
}
