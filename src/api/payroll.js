import api from './client';

export const PayrollAPI = {
  // 급여 데이터 대량 저장 (업로드)
  bulkSave: async (records, year, month) => {
    try {
      const response = await api.post('/payroll/bulk', {
        records,
        year,
        month,
      });
      return response;
    } catch (error) {
      console.error(`❌ [PayrollAPI] bulkSave 에러:`, error);
      throw error;
    }
  },

  // 월별 급여 데이터 조회
  getMonthlyData: async (year, month) => {
    const url = `/payroll/monthly/${year}/${month}`;

    try {
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error(`❌ [PayrollAPI] getMonthlyData 에러:`, error);
      throw error;
    }
  },

  // 특정 직원의 급여 내역 조회
  getEmployeePayroll: async (employeeId, year = null, limit = 12) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (limit) params.append('limit', limit);
    const queryString = params.toString();
    const url = `/payroll/employee/${employeeId}${
      queryString ? '?' + queryString : ''
    }`;

    try {
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error(`❌ [PayrollAPI] getEmployeePayroll 에러:`, error);
      throw error;
    }
  },
};

export default PayrollAPI;
