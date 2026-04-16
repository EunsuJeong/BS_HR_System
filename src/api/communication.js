import api from './client';

export const NoticeAPI = {
  // 전체 공지사항 조회
  // lite=true: content 제외 (일반직원 목록용, 응답 경량화)
  list: async (includeScheduled = false, lite = false) => {
    const url = '/communication/notices?includeScheduled=' + includeScheduled + (lite ? '&lite=true' : '');
    try {
      return await api.getQuick(url);
    } catch (e) {
      return await api.getQuick(url);
    }
  },

  // 공지사항 단건 조회 (상세 내용 포함)
  get: async (noticeId) => api.get('/communication/notices/' + noticeId),

  // 공지사항 등록
  create: async (noticeData) => api.post('/communication/notices', noticeData),

  // 공지사항 수정
  update: async (noticeId, noticeData) =>
    api.put('/communication/notices/' + noticeId, noticeData),

  // 공지사항 삭제
  delete: async (noticeId) => api.del('/communication/notices/' + noticeId),

  // 조회수 증가 (일반직원만 카운트)
  incrementViewCount: async (noticeId, employeeId, isAdmin = false) =>
    api.post('/communication/notices/' + noticeId + '/view', {
      employeeId,
      isAdmin,
    }),

  // 파일 업로드 (단일)
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(api.baseURL + '/communication/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('파일 업로드 실패');
    }

    return response.json();
  },

  // 파일 업로드 (다중)
  uploadFiles: async (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(
      api.baseURL + '/communication/upload-multiple',
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('파일 업로드 실패');
    }

    return response.json();
  },
};

export const SuggestionAPI = {
  // 건의사항 조회 (관리자: 전체, 일반직원: 본인 것만)
  list: async (employeeId = null, role = null) => {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', employeeId);
    if (role) params.append('role', role);
    const queryString = params.toString();
    const url =
      '/communication/suggestions' + (queryString ? '?' + queryString : '');

    try {
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error(`❌ [SuggestionAPI] 에러:`, error);
      throw error;
    }
  },

  // 건의사항 등록
  create: async (suggestionData) =>
    api.post('/communication/suggestions', suggestionData),

  // 건의사항 수정 (상태 변경)
  update: async (suggestionId, suggestionData) =>
    api.put('/communication/suggestions/' + suggestionId, suggestionData),

  // 건의사항 삭제
  delete: async (suggestionId) =>
    api.del('/communication/suggestions/' + suggestionId),
};

export const NotificationAPI = {
  // 알림 조회 (전체 또는 유형별, 직원별)
  list: async (notificationType = null, recipientName = null, department = null, position = null, role = null) => {
    const params = new URLSearchParams();
    if (notificationType) params.append('notificationType', notificationType);
    if (recipientName) params.append('recipientName', recipientName);
    if (department) params.append('department', department);
    if (position) params.append('position', position);
    if (role) params.append('role', role);
    const queryString = params.toString();
    const url = '/communication/notifications' + (queryString ? '?' + queryString : '');
    try {
      return await api.getQuick(url);
    } catch (e) {
      return await api.getQuick(url);
    }
  },

  // 알림 등록 (정기/실시간)
  create: async (notificationData) =>
    api.post('/communication/notifications', notificationData),

  // 알림 수정
  update: async (notificationId, notificationData) =>
    api.put('/communication/notifications/' + notificationId, notificationData),

  // 알림 삭제
  delete: async (notificationId) =>
    api.del('/communication/notifications/' + notificationId),

  // 알림 상태 변경 (진행중/완료/중지)
  updateStatus: async (notificationId, status) =>
    api.put('/communication/notifications/' + notificationId + '/status', {
      status,
    }),

  // 알림 읽음 처리 (일반직원용)
  markAsRead: async (notificationId, employeeId) =>
    api.post('/communication/notifications/' + notificationId + '/read', {
      employeeId,
    }),
};

export default { NoticeAPI, SuggestionAPI, NotificationAPI };
