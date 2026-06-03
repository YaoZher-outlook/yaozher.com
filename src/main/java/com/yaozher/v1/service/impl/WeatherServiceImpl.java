package com.yaozher.v1.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.service.WeatherService;
import com.yaozher.v1.vo.WeatherCurrentVo;
import com.yaozher.v1.vo.WeatherDailyVo;
import com.yaozher.v1.vo.WeatherForecastVo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WeatherServiceImpl implements WeatherService {

    private static final String WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    @Override
    public WeatherCurrentVo current(double latitude, double longitude) {
        URI uri = UriComponentsBuilder.fromUriString(WEATHER_ENDPOINT)
                .queryParam("latitude", latitude)
                .queryParam("longitude", longitude)
                .queryParam("current_weather", true)
                .queryParam("timezone", "auto")
                .build(true)
                .toUri();

        JsonNode current = fetch(uri).path("current_weather");
        int code = current.path("weathercode").asInt(-1);
        return WeatherCurrentVo.builder()
                .temperature(current.path("temperature").isNumber() ? current.path("temperature").asDouble() : null)
                .windSpeed(current.path("windspeed").isNumber() ? current.path("windspeed").asDouble() : null)
                .weatherCode(code)
                .description(describe(code))
                .time(current.path("time").asText(null))
                .weatherComUrl(weatherComUrl(latitude, longitude))
                .build();
    }

    @Override
    public WeatherForecastVo forecast(double latitude, double longitude, int days) {
        int forecastDays = Math.max(1, Math.min(7, days));
        URI uri = UriComponentsBuilder.fromUriString(WEATHER_ENDPOINT)
                .queryParam("latitude", latitude)
                .queryParam("longitude", longitude)
                .queryParam("daily", "temperature_2m_max,temperature_2m_min,weathercode")
                .queryParam("timezone", "auto")
                .queryParam("forecast_days", forecastDays)
                .build(true)
                .toUri();

        JsonNode daily = fetch(uri).path("daily");
        JsonNode dates = daily.path("time");
        JsonNode max = daily.path("temperature_2m_max");
        JsonNode min = daily.path("temperature_2m_min");
        JsonNode codes = daily.path("weathercode");

        List<WeatherDailyVo> items = new ArrayList<>();
        for (int i = 0; i < dates.size(); i += 1) {
            int code = codes.path(i).asInt(-1);
            items.add(WeatherDailyVo.builder()
                    .date(dates.path(i).asText())
                    .temperatureMax(max.path(i).isNumber() ? max.path(i).asDouble() : null)
                    .temperatureMin(min.path(i).isNumber() ? min.path(i).asDouble() : null)
                    .weatherCode(code)
                    .description(describe(code))
                    .build());
        }

        return WeatherForecastVo.builder()
                .daily(items)
                .weatherComUrl(weatherComUrl(latitude, longitude))
                .build();
    }

    private JsonNode fetch(URI uri) {
        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "天气服务暂时不可用");
            }
            return objectMapper.readTree(response.body());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "天气服务暂时不可用");
        }
    }

    private String describe(int code) {
        return switch (code) {
            case 0 -> "晴";
            case 1 -> "大部晴朗";
            case 2 -> "局部多云";
            case 3 -> "阴";
            case 45, 48 -> "有雾";
            case 51, 53, 55, 56, 57 -> "毛毛雨";
            case 61, 63, 65, 66, 67 -> "降雨";
            case 71, 73, 75, 77 -> "降雪";
            case 80, 81, 82 -> "阵雨";
            case 85, 86 -> "阵雪";
            case 95, 96, 99 -> "雷暴";
            default -> "天气未知";
        };
    }

    private String weatherComUrl(double latitude, double longitude) {
        return "https://weather.com/weather/today/l/" + latitude + "," + longitude;
    }
}
