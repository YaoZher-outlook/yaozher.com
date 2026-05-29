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

    @Size(max = 64, message = "nickname length must be <= 64")
    private String nickname;

    @Size(max = 512, message = "avatar length must be <= 512")
    private String avatar;

    @Email(message = "email format is invalid")
    @Size(max = 128, message = "email length must be <= 128")
    private String email;
}

