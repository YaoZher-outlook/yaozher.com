package com.yaozher.v1.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserLocationUpdateDto {

    @NotNull(message = "缺少纬度")
    @DecimalMin(value = "-90.0", message = "纬度不正确")
    @DecimalMax(value = "90.0", message = "纬度不正确")
    private BigDecimal latitude;

    @NotNull(message = "缺少经度")
    @DecimalMin(value = "-180.0", message = "经度不正确")
    @DecimalMax(value = "180.0", message = "经度不正确")
    private BigDecimal longitude;

    private Double accuracy;
}
