import api from './client';

/**
 * 평가 관리 API
 */
export const EvaluationAPI = {
  // 전체 평가 조회
  list: async () => {
    const response = await api.get('/hr/evaluations');
    return response;
  },

  // 평가 생성
  create: async (evaluationData) => {
    const response = await api.post('/hr/evaluations', evaluationData);
    return response;
  },

  // 평가 수정
  update: async (id, evaluationData) => {
    const response = await api.put(`/hr/evaluations/${id}`, evaluationData);
    return response;
  },

  // 평가 삭제
  delete: async (id) => {
    const response = await api.del(`/hr/evaluations/${id}`);
    return response;
  },
};

export default EvaluationAPI;
