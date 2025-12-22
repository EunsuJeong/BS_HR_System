import api from './client';

export const SafetyAccidentAPI = {
  // 특정 날짜 안전사고 조회
  getByDate: async (date) => api.get(`/safety/accidents/${date}`),

  // 안전사고 등록
  create: async (accidentData) => api.post('/safety/accidents', accidentData),

  // 전체 안전사고 조회 (날짜 범위)
  list: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/safety/accidents?${params.toString()}`);
  },

  // 안전사고 수정
  update: async (accidentId, accidentData) =>
    api.put(`/safety/accidents/${accidentId}`, accidentData),

  // 안전사고 삭제
  delete: async (accidentId) => api.del(`/safety/accidents/${accidentId}`),
};

export const WeatherAPI = {
  // 날씨 캐시 조회
  get: async (location) =>
    api.get(`/safety/weather?location=${encodeURIComponent(location)}`),
};

export default { SafetyAccidentAPI, WeatherAPI };
