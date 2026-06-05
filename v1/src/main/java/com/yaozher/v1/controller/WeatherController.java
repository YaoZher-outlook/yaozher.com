package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.service.WeatherService;
import com.yaozher.v1.vo.WeatherCurrentVo;
import com.yaozher.v1.vo.WeatherForecastVo;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/current")
    public Result<WeatherCurrentVo> current(
            @RequestParam double latitude,
            @RequestParam double longitude
    ) {
        return Result.ok(weatherService.current(latitude, longitude));
    }

    @GetMapping("/forecast")
    public Result<WeatherForecastVo> forecast(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "5") int days
    ) {
        return Result.ok(weatherService.forecast(latitude, longitude, days));
    }
}
