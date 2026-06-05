package com.yaozher.v1.service;

import com.yaozher.v1.vo.WeatherCurrentVo;
import com.yaozher.v1.vo.WeatherForecastVo;

public interface WeatherService {

    WeatherCurrentVo current(double latitude, double longitude);

    WeatherForecastVo forecast(double latitude, double longitude, int days);
}
