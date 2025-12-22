import api from './client';

export const AttendanceAPI = {
  // GET /api/attendance?date=YYYY-MM-DD (compatible route on server)
  listByDate: async (dateISO) => {
    const q = dateISO ? `?date=${encodeURIComponent(dateISO)}` : '';
    return api.get(`/attendance${q}`);
  },
  // Shortcut to fetch all (server returns filtered by date if provided; without date it returns today's or all depending on impl)
  list: async () => api.get('/attendance'),

  // 월별 근태 데이터 조회
  getMonthlyData: async (year, month) => {
    try {
      const response = await api.get(`/attendance/monthly/${year}/${month}`);
      return response;
    } catch (error) {
      console.error('[AttendanceAPI.getMonthlyData] 오류:', error);
      return { success: false, message: error.message };
    }
  },

  // 근태 데이터 대량 저장
  bulkSave: async (records, year, month) => {
    try {
      const response = await api.post('/attendance/bulk', {
        records,
        year,
        month,
      });
      return response;
    } catch (error) {
      console.error('[AttendanceAPI.bulkSave] 오류:', error);
      return {
        success: false,
        message: error.message,
        stats: { inserted: 0, updated: 0, errors: records.length },
      };
    }
  },
};

// 월별 근태 통계 API (attendanceStats 컬렉션)
export const AttendanceStatsAPI = {
  // 월별 통계 조회
  getMonthlyStats: async (year, month) => {
    try {
      const response = await api.get(`/attendance/stats/${year}/${month}`);
      return response;
    } catch (error) {
      console.error('[AttendanceStatsAPI.getMonthlyStats] 오류:', error);
      return { success: false, data: [], message: error.message };
    }
  },
};

export const AttendanceSummaryAPI = {
  // 전체 근태 요약 조회
  list: async () => api.get('/attendance/summaries'),

  // 특정 직원의 근태 요약 조회
  getByEmployee: async (employeeId) =>
    api.get(`/attendance/summaries/employee/${employeeId}`),

  // 특정 직원의 특정 월 근태 요약 조회
  getByEmployeeAndMonth: async (employeeId, yearMonth) =>
    api.get(`/attendance/summaries/employee/${employeeId}/${yearMonth}`),

  // 근태 요약 생성 또는 업데이트
  upsert: async (summaryData) => api.post('/attendance/summaries', summaryData),

  // 근태 요약 수정
  update: async (summaryId, summaryData) =>
    api.put(`/attendance/summaries/${summaryId}`, summaryData),

  // 근태 요약 삭제
  delete: async (summaryId) => api.del(`/attendance/summaries/${summaryId}`),

  // 특정 월의 전체 직원 근태 요약 조회
  getByMonth: async (yearMonth) =>
    api.get(`/attendance/summaries/month/${yearMonth}`),
};

export default { AttendanceAPI, AttendanceStatsAPI, AttendanceSummaryAPI };
