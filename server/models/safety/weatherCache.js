const mongoose = require("mongoose");

/**
 * 날씨/기상 API 캐시 (App.js의 getWeatherData() 대응)
 */
const weatherCacheSchema = new mongoose.Schema({
  location: { type: String, index: true },
  response: Object,                 // API 결과 전체
  responseTime: Number,             // 요청 소요시간(ms)
  lastUpdated: { type: Date, default: Date.now },
  source: String,                   // ex) '기상청', 'OpenWeather'
}, { collection: 'weatherCache' });

const WeatherCache = mongoose.model("WeatherCache", weatherCacheSchema);
module.exports = WeatherCache;
