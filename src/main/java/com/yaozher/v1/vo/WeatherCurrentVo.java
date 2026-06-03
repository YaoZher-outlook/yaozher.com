package com.yaozher.v1.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherCurrentVo {

    private Double temperature;

    private Double windSpeed;

    private Integer weatherCode;

    private String description;

    private String time;

    private String weatherComUrl;
}
