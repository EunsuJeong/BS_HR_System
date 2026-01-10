import api from './client';

/**
 * 워라밸 지표 API 클라이언트
 */
export const WorkLifeBalanceAPI = {
  /**
   * 특정 월의 워라밸 지표 조회
   * @param {number} year - 연도
   * @param {number} month - 월 (1-12)
   * @returns {Promise<Object>} 워라밸 지표 데이터
   */
  getStats: async (year, month) => {
    try {
      console.log(
        `[WorkLifeBalanceAPI.getStats] 조회 시작: ${year}년 ${month}월`
      );
      const response = await api.get(`/worklife/stats/${year}/${month}`);
      console.log(`[WorkLifeBalanceAPI.getStats] 조회 성공:`, response);
      return response;
    } catch (error) {
      console.error('[WorkLifeBalanceAPI.getStats] 조회 실패:', error);
      return {
        success: false,
        message: error.message || '워라밸 지표 조회 실패',
      };
    }
  },

  /**
   * 연도별 워라밸 지표 조회 (월별 데이터)
   * @param {number} year - 연도
   * @returns {Promise<Object>} 월별 워라밸 지표 데이터 배열
   */
  getStatsByYear: async (year) => {
    try {
      console.log(`[WorkLifeBalanceAPI.getStatsByYear] 조회 시작: ${year}년`);
      const response = await api.get(`/worklife/stats/${year}`);
      console.log(`[WorkLifeBalanceAPI.getStatsByYear] 조회 성공:`, response);
      return response;
    } catch (error) {
      console.error('[WorkLifeBalanceAPI.getStatsByYear] 조회 실패:', error);
      return {
        success: false,
        message: error.message || '연도별 워라밸 지표 조회 실패',
      };
    }
  },

  /**
   * 현재 월의 워라밸 지표 조회 (캐시된 데이터 우선)
   * @returns {Promise<Object>} 현재 월 워라밸 지표
   */
  getCurrentStats: async () => {
    try {
      console.log(`[WorkLifeBalanceAPI.getCurrentStats] 현재 월 조회 시작`);
      const response = await api.get(`/worklife/stats/current`);
      console.log(
        `[WorkLifeBalanceAPI.getCurrentStats] 조회 성공 (캐시: ${response.cached}):`,
        response
      );
      return response;
    } catch (error) {
      console.error('[WorkLifeBalanceAPI.getCurrentStats] 조회 실패:', error);
      return {
        success: false,
        message: error.message || '현재 월 워라밸 지표 조회 실패',
      };
    }
  },

  /**
   * 워라밸 지표 수동 계산 및 저장
   * @param {number} year - 연도
   * @param {number} month - 월 (1-12)
   * @returns {Promise<Object>} 계산 결과
   */
  calculate: async (year, month) => {
    try {
      console.log(
        `[WorkLifeBalanceAPI.calculate] 계산 시작: ${year}년 ${month}월`
      );
      const response = await api.post(`/worklife/calculate`, {
        year,
        month,
      });
      console.log(`[WorkLifeBalanceAPI.calculate] 계산 성공:`, response);
      return response;
    } catch (error) {
      console.error('[WorkLifeBalanceAPI.calculate] 계산 실패:', error);
      return {
        success: false,
        message: error.message || '워라밸 지표 계산 실패',
      };
    }
  },

  /**
   * 현재 월의 워라밸 지표 계산 및 저장
   * @returns {Promise<Object>} 계산 결과
   */
  calculateCurrent: async () => {
    try {
      console.log(
        `[WorkLifeBalanceAPI.calculateCurrent] 현재 월 계산 시작`
      );
      const response = await api.post(`/worklife/calculate/current`);
      console.log(
        `[WorkLifeBalanceAPI.calculateCurrent] 계산 성공:`,
        response
      );
      return response;
    } catch (error) {
      console.error('[WorkLifeBalanceAPI.calculateCurrent] 계산 실패:', error);
      return {
        success: false,
        message: error.message || '현재 월 워라밸 지표 계산 실패',
      };
    }
  },
};

export default WorkLifeBalanceAPI;
