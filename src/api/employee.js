import api from './client';

export const EmployeeAPI = {
  // 로그인 (직원 인증)
  login: async (credentials) => api.post('/hr/login', credentials),

  // 전체 직원 목록 조회
  list: async () => api.get('/hr/employees'),

  // 특정 직원 조회
  getById: async (employeeId) => api.get(`/hr/employees/${employeeId}`),

  // 직원 등록
  create: async (employeeData) => api.post('/hr/employees', employeeData),

  // 직원 정보 수정
  update: async (employeeId, employeeData) =>
    api.put(`/hr/employees/${employeeId}`, employeeData),

  // 직원 삭제 (상태 변경)
  delete: async (employeeId) => api.del(`/hr/employees/${employeeId}`),

  // 부서별 통계
  getStats: async () => api.get('/hr/employees/stats/summary'),
};

export default EmployeeAPI;
