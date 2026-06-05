package com.yaozher.v1.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherDailyVo {

    private String date;

    private Double temperatureMax;

    private Double temperatureMin;

    private Integer weatherCode;

    private String description;
}
