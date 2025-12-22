import api from './client';

export const HolidayAPI = {
  // 연도별 공휴일 조회
  getYearHolidays: async (year) => {
    try {
      const response = await api.get(`/holiday/year/${year}`);
      return response;
    } catch (error) {
      console.error(`❌ [HolidayAPI] 조회 에러:`, error);
      throw error;
    }
  },

  // 다년도 공휴일 조회 (범위)
  getYearsHolidays: async (startYear, endYear) => {
    try {
      const response = await api.get(`/holiday/years/${startYear}/${endYear}`);
      return response;
    } catch (error) {
      console.error(`❌ [HolidayAPI] 범위 조회 에러:`, error);
      throw error;
    }
  },

  // 공휴일 통계
  getStats: async () => {
    try {
      const response = await api.get('/holiday/stats');
      return response;
    } catch (error) {
      console.error(`❌ [HolidayAPI] 통계 조회 에러:`, error);
      throw error;
    }
  },

  // 커스텀 공휴일 생성
  create: async (holidayData) => {
    try {
      const response = await api.post('/holiday', holidayData);
      return response;
    } catch (error) {
      console.error(`❌ [HolidayAPI] 생성 에러:`, error);
      throw error;
    }
  },

  // 공휴일 수정
  update: async (date, holidayData) => {
    try {
      const response = await api.put(`/holiday/${date}`, holidayData);
      return response;
    } catch (error) {
      console.error(`❌ [HolidayAPI] 수정 에러:`, error);
      throw error;
    }
  },

  // 공휴일 삭제
  delete: async (date) => {
    try {
      const response = await api.del(`/holiday/${date}`);
      return response;
    } catch (error) {
      console.error(`❌ [HolidayAPI] 삭제 에러:`, error);
      throw error;
    }
  },
};

export default HolidayAPI;
