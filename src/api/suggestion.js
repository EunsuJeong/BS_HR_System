import api from './client';

export const SuggestionAPI = {
  // 전체 건의사항 조회
  list: async () => api.get('/communication/suggestions'),

  // 특정 직원의 건의사항 조회
  getByEmployeeId: async (employeeId) =>
    api.get(`/communication/suggestions/employee/${employeeId}`),

  // 건의사항 등록
  create: async (suggestionData) =>
    api.post('/communication/suggestions', suggestionData),

  // 건의사항 수정
  update: async (suggestionId, suggestionData) =>
    api.put(`/communication/suggestions/${suggestionId}`, suggestionData),

  // 건의사항 삭제
  delete: async (suggestionId) =>
    api.del(`/communication/suggestions/${suggestionId}`),
};

export default SuggestionAPI;
