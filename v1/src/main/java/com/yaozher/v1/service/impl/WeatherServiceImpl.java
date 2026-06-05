package com.yaozher.v1.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.service.WeatherService;
import com.yaozher.v1.vo.WeatherCurrentVo;
import com.yaozher.v1.vo.WeatherDailyVo;
import com.yaozher.v1.vo.WeatherForecastVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherServiceImpl implements WeatherService {

    private static final String OPEN_METEO = "Open-Meteo";
    private static final String WTTR = "wttr.in";
    private static final long PRIMARY_RETRY_DELAY_MILLIS = Duration.ofMinutes(10).toMillis();

    private final ObjectMapper objectMapper;
    private final AppProperties properties;
    private volatile HttpClient httpClient;
    private volatile long primaryRetryAfter;

    @Override
    public WeatherCurrentVo current(double latitude, double longitude) {
        if (canTryPrimary()) {
            try {
                return currentFromOpenMeteo(latitude, longitude);
            } catch (BusinessException e) {
                markPrimaryUnavailable();
                log.warn("{} current weather unavailable; falling back to {}", OPEN_METEO, WTTR);
            }
        }
        return currentFromWttr(latitude, longitude);
    }

    @Override
    public WeatherForecastVo forecast(double latitude, double longitude, int days) {
        int forecastDays = Math.max(1, Math.min(7, days));
        if (canTryPrimary()) {
            try {
                return forecastFromOpenMeteo(latitude, longitude, forecastDays);
            } catch (BusinessException e) {
                markPrimaryUnavailable();
                log.warn("{} forecast unavailable; falling back to {}", OPEN_METEO, WTTR);
            }
        }
        return forecastFromWttr(latitude, longitude, forecastDays);
    }

    private WeatherCurrentVo currentFromOpenMeteo(double latitude, double longitude) {
        URI uri = UriComponentsBuilder.fromUriString(properties.getWeather().getPrimaryUrl())
                .queryParam("latitude", latitude)
                .queryParam("longitude", longitude)
                .queryParam("current_weather", true)
                .queryParam("timezone", "auto")
                .build()
                .encode()
                .toUri();

        JsonNode current = requiredObject(fetch(uri, OPEN_METEO).path("current_weather"), OPEN_METEO);
        int code = current.path("weathercode").asInt(-1);
        return WeatherCurrentVo.builder()
                .temperature(decimal(current.path("temperature")))
                .windSpeed(decimal(current.path("windspeed")))
                .weatherCode(code)
                .description(describeOpenMeteo(code))
                .time(current.path("time").asText(null))
                .weatherComUrl(weatherComUrl(latitude, longitude))
                .build();
    }

    private WeatherForecastVo forecastFromOpenMeteo(double latitude, double longitude, int forecastDays) {
        URI uri = UriComponentsBuilder.fromUriString(properties.getWeather().getPrimaryUrl())
                .queryParam("latitude", latitude)
                .queryParam("longitude", longitude)
                .queryParam("daily", "temperature_2m_max,temperature_2m_min,weathercode")
                .queryParam("timezone", "auto")
                .queryParam("forecast_days", forecastDays)
                .build()
                .encode()
                .toUri();

        JsonNode daily = requiredObject(fetch(uri, OPEN_METEO).path("daily"), OPEN_METEO);
        JsonNode dates = requiredArray(daily.path("time"), OPEN_METEO);
        JsonNode max = requiredArray(daily.path("temperature_2m_max"), OPEN_METEO);
        JsonNode min = requiredArray(daily.path("temperature_2m_min"), OPEN_METEO);
        JsonNode codes = requiredArray(daily.path("weathercode"), OPEN_METEO);

        List<WeatherDailyVo> items = new ArrayList<>();
        for (int i = 0; i < dates.size(); i += 1) {
            int code = codes.path(i).asInt(-1);
            items.add(WeatherDailyVo.builder()
                    .date(dates.path(i).asText())
                    .temperatureMax(decimal(max.path(i)))
                    .temperatureMin(decimal(min.path(i)))
                    .weatherCode(code)
                    .description(describeOpenMeteo(code))
                    .build());
        }

        return forecast(items, latitude, longitude);
    }

    private WeatherCurrentVo currentFromWttr(double latitude, double longitude) {
        JsonNode root = fetch(wttrUri(latitude, longitude), WTTR);
        JsonNode conditions = requiredArray(root.path("current_condition"), WTTR);
        JsonNode current = requiredObject(conditions.path(0), WTTR);
        int code = current.path("weatherCode").asInt(-1);
        String time = current.path("localObsDateTime").asText(null);
        if (time == null || time.isBlank()) {
            time = current.path("observation_time").asText(null);
        }

        return WeatherCurrentVo.builder()
                .temperature(decimal(current.path("temp_C")))
                .windSpeed(decimal(current.path("windspeedKmph")))
                .weatherCode(code)
                .description(describeWttr(code))
                .time(time)
                .weatherComUrl(weatherComUrl(latitude, longitude))
                .build();
    }

    private WeatherForecastVo forecastFromWttr(double latitude, double longitude, int forecastDays) {
        JsonNode weather = requiredArray(fetch(wttrUri(latitude, longitude), WTTR).path("weather"), WTTR);
        int count = Math.min(forecastDays, weather.size());
        List<WeatherDailyVo> items = new ArrayList<>();

        for (int i = 0; i < count; i += 1) {
            JsonNode day = requiredObject(weather.path(i), WTTR);
            JsonNode hourly = requiredArray(day.path("hourly"), WTTR);
            JsonNode representative = hourly.path(Math.min(4, hourly.size() - 1));
            int code = representative.path("weatherCode").asInt(-1);
            items.add(WeatherDailyVo.builder()
                    .date(day.path("date").asText())
                    .temperatureMax(decimal(day.path("maxtempC")))
                    .temperatureMin(decimal(day.path("mintempC")))
                    .weatherCode(code)
                    .description(describeWttr(code))
                    .build());
        }

        return forecast(items, latitude, longitude);
    }

    private WeatherForecastVo forecast(List<WeatherDailyVo> items, double latitude, double longitude) {
        return WeatherForecastVo.builder()
                .daily(items)
                .weatherComUrl(weatherComUrl(latitude, longitude))
                .build();
    }

    private URI wttrUri(double latitude, double longitude) {
        return UriComponentsBuilder.fromUriString(properties.getWeather().getFallbackUrl())
                .pathSegment(latitude + "," + longitude)
                .queryParam("format", "j1")
                .build()
                .encode()
                .toUri();
    }

    private JsonNode fetch(URI uri, String provider) {
        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(requestTimeout())
                    .header("Accept", "application/json")
                    .header("User-Agent", "yaozher.com-weather/1.0")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient().send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("{} weather request returned HTTP {}", provider, response.statusCode());
                throw unavailable();
            }
            return objectMapper.readTree(response.body());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("{} weather request failed: {}: {}", provider, e.getClass().getSimpleName(), e.getMessage());
            throw unavailable();
        }
    }

    private JsonNode requiredObject(JsonNode node, String provider) {
        if (node.isObject()) {
            return node;
        }
        log.warn("{} weather response did not contain the expected object", provider);
        throw unavailable();
    }

    private JsonNode requiredArray(JsonNode node, String provider) {
        if (node.isArray() && !node.isEmpty()) {
            return node;
        }
        log.warn("{} weather response did not contain the expected array", provider);
        throw unavailable();
    }

    private boolean canTryPrimary() {
        return System.currentTimeMillis() >= primaryRetryAfter;
    }

    private void markPrimaryUnavailable() {
        primaryRetryAfter = System.currentTimeMillis() + PRIMARY_RETRY_DELAY_MILLIS;
    }

    private HttpClient httpClient() {
        HttpClient current = httpClient;
        if (current != null) {
            return current;
        }
        synchronized (this) {
            if (httpClient == null) {
                httpClient = HttpClient.newBuilder()
                        .connectTimeout(connectTimeout())
                        .build();
            }
            return httpClient;
        }
    }

    private Duration connectTimeout() {
        return Duration.ofSeconds(Math.max(1, properties.getWeather().getConnectTimeoutSeconds()));
    }

    private Duration requestTimeout() {
        return Duration.ofSeconds(Math.max(1, properties.getWeather().getRequestTimeoutSeconds()));
    }

    private Double decimal(JsonNode node) {
        if (node.isNumber()) {
            return node.asDouble();
        }
        if (node.isTextual()) {
            try {
                return Double.parseDouble(node.asText());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String describeOpenMeteo(int code) {
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

    private String describeWttr(int code) {
        return switch (code) {
            case 113 -> "晴";
            case 116 -> "局部多云";
            case 119 -> "多云";
            case 122 -> "阴";
            case 143, 248, 260 -> "有雾";
            case 176, 263, 266, 281, 284 -> "小雨";
            case 179, 182, 185, 311, 314, 317, 320, 362, 365 -> "雨夹雪";
            case 200, 386, 389, 392, 395 -> "雷暴";
            case 227, 230, 323, 326, 329, 332, 335, 338, 368, 371 -> "降雪";
            case 293, 296, 299, 302, 305, 308 -> "降雨";
            case 350, 374, 377 -> "冰粒";
            case 353, 356, 359 -> "阵雨";
            default -> "天气未知";
        };
    }

    private BusinessException unavailable() {
        return BusinessException.of(ErrorCode.SYSTEM_ERROR, "天气服务暂时不可用");
    }

    private String weatherComUrl(double latitude, double longitude) {
        return "https://weather.com/weather/today/l/" + latitude + "," + longitude;
    }
}
