export type WeatherCurrentVo = {
  temperature?: number | null
  windSpeed?: number | null
  weatherCode?: number | null
  description: string
  time?: string | null
  weatherComUrl: string
}

export type WeatherDailyVo = {
  date: string
  temperatureMax?: number | null
  temperatureMin?: number | null
  weatherCode?: number | null
  description: string
}

export type WeatherForecastVo = {
  daily: WeatherDailyVo[]
  weatherComUrl: string
}
