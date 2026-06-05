import { getResult } from '@/api/http'
import type { Result } from '@/types/api'
import type { WeatherCurrentVo, WeatherForecastVo } from '@/types/weather'

function weatherQuery(latitude: number, longitude: number, extra?: Record<string, string | number>) {
  const query = new URLSearchParams()
  query.set('latitude', String(latitude))
  query.set('longitude', String(longitude))
  Object.entries(extra ?? {}).forEach(([key, value]) => query.set(key, String(value)))
  return query.toString()
}

export function getCurrentWeather(latitude: number, longitude: number): Promise<Result<WeatherCurrentVo>> {
  return getResult<WeatherCurrentVo>(`/api/weather/current?${weatherQuery(latitude, longitude)}`, { auth: true })
}

export function getWeatherForecast(latitude: number, longitude: number, days = 5): Promise<Result<WeatherForecastVo>> {
  return getResult<WeatherForecastVo>(`/api/weather/forecast?${weatherQuery(latitude, longitude, { days })}`, { auth: true })
}
