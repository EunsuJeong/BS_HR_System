import api from './client';

export const LeaveAPI = {
  // 전체 연차 내역 조회
  list: async () => api.get('/hr/leaves'),

  // 특정 직원의 연차 조회
  getByEmployeeId: async (employeeId) =>
    api.get(`/hr/leaves/employee/${employeeId}`),

  // 연차 신청
  create: async (leaveData) => api.post('/hr/leaves', leaveData),

  // 연차 승인/거절
  updateStatus: async (leaveId, statusData) =>
    api.put(`/hr/leaves/${leaveId}/status`, statusData),

  // 연차 내용 수정 (직원용)
  update: async (leaveId, leaveData) =>
    api.put(`/hr/leaves/${leaveId}`, leaveData),

  // 연차 삭제
  delete: async (leaveId) => api.del(`/hr/leaves/${leaveId}`),
};

export default LeaveAPI;
