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
public class RegisterCodeRequestDto {

    @NotBlank(message = "email must not be blank")
    @Email(message = "email format is invalid")
    @Size(max = 128, message = "email length must be <= 128")
    private String email;
}

