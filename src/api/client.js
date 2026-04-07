// Lightweight API client for frontend
// 로컬 서버 배포용 (FBD_One 브랜치)
// 프로덕션 환경: bssystem.iptime.org:5000 (로컬 PC 서버)
// 개발 환경: localhost:5000 (로컬 개발)
const PRODUCTION_API_URL = 'http://bssystem.iptime.org:5000/api';
const BASE = process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_API_URL : 'http://localhost:5000/api');

// 동일 GET 요청 중복 방지 (진행 중인 요청 재사용)
const pendingRequests = new Map();

// 진행 중인 요청의 AbortController 집합 (abortAll 용)
const activeControllers = new Set();

// Retry + timeout wrapper
async function fetchWithRetry(url, init, retries = 3, timeout = 30000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      activeControllers.add(controller);
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      activeControllers.delete(controller);
      return res;
    } catch (err) {
      activeControllers.delete(controller);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // exponential backoff
    }
  }
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const init = { ...options, headers };

  // GET 요청 중복 방지: 동일 URL이 진행 중이면 기존 Promise 재사용
  if (method === 'GET') {
    if (pendingRequests.has(url)) {
      return pendingRequests.get(url);
    }
    const promise = fetchWithRetry(url, init)
      .then(async (res) => {
        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json() : await res.text();
        if (!res.ok) {
          const error = new Error(data?.error || data?.message || `API ${res.status} ${res.statusText}`);
          error.response = { data, status: res.status };
          error.isServerError = res.status >= 500;
          throw error;
        }
        return data;
      })
      .finally(() => pendingRequests.delete(url));
    pendingRequests.set(url, promise);
    return promise;
  }

  let res;
  try {
    res = await fetchWithRetry(url, init);
  } catch (err) {
    // Network error
    const error = new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
    error.isNetworkError = true;
    throw error;
  }

  // try json, fallback to text
  const ct = res.headers.get('content-type') || '';
  let data;
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    // DB/서버 오류와 일반 오류 구분
    const error = new Error(
      data?.error || data?.message || `API ${res.status} ${res.statusText}`
    );
    error.response = { data, status: res.status };
    error.isServerError = res.status >= 500;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) =>
    request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  // 진행 중인 모든 요청 abort (새로고침 직전 정리용)
  abortAll: () => {
    activeControllers.forEach((c) => c.abort());
    activeControllers.clear();
    pendingRequests.clear();
  },
  base: BASE,
  baseURL: BASE,
};

export default api;
