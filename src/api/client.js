// Lightweight API client for frontend
const BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const init = { ...options, headers };
  const res = await fetch(url, init);

  // try json, fallback to text
  const ct = res.headers.get('content-type') || '';
  let data;
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    // 에러 응답을 더 자세히 처리
    const error = new Error(
      data?.error || data?.message || `API ${res.status} ${res.statusText}`
    );
    error.response = { data, status: res.status };
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
  base: BASE,
  baseURL: BASE,
};

export default api;
