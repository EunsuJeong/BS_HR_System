import api from './client';

export const AdminAPI = {
  // 관리자 로그인
  login: async (credentials) => api.post('/admin/admins/login', credentials),

  // 전체 관리자 목록 조회
  list: async () => api.get('/admin/admins'),

  // 특정 관리자 조회
  getById: async (adminId) => api.get(`/admin/admins/${adminId}`),

  // 관리자 등록
  create: async (adminData) => api.post('/admin/admins', adminData),

  // 관리자 정보 수정
  update: async (adminId, adminData) =>
    api.put(`/admin/admins/${adminId}`, adminData),

  // 관리자 삭제 (상태 변경)
  delete: async (adminId) => api.del(`/admin/admins/${adminId}`),
};

export default AdminAPI;
