import api from './client';

export const ScheduleAPI = {
  // 전체 일정 조회
  list: async () => api.get('/system/schedules'),

  // 일정 등록
  create: async (scheduleData) => api.post('/system/schedules', scheduleData),

  // 일정 수정
  update: async (scheduleId, scheduleData) =>
    api.put(`/system/schedules/${scheduleId}`, scheduleData),

  // 일정 삭제
  delete: async (scheduleId) => api.del(`/system/schedules/${scheduleId}`),
};

export const SystemLogAPI = {
  // 시스템 로그 기록
  create: async (logData) => api.post('/system/logs', logData),
};

export const SystemAPI = {
  // 헬스체크
  health: async () => api.get('/system/health'),
};

export default { ScheduleAPI, SystemLogAPI, SystemAPI };
