// Lightweight API client for frontend
// Railway 백엔드 URL (프로덕션)
const PRODUCTION_API_URL = 'https://bshrsystem-production.up.railway.app/api';
const BASE = process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_API_URL : 'http://localhost:5000/api');

// Retry + timeout wrapper
async function fetchWithRetry(url, init, retries = 3, timeout = 30000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // exponential backoff
    }
  }
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const init = { ...options, headers };

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
  patch: (path, body) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  base: BASE,
  baseURL: BASE,
};

export default api;
