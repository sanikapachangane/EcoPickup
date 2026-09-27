const BASE_API_URL = typeof window !== 'undefined' && window.ECOPICKUP_API_URL
  ? window.ECOPICKUP_API_URL
  : 'http://localhost:3000';

function requestApi(path, options = {}) {
  return fetch(`${BASE_API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
    ...options,
  });
}

async function loadAdminSession() {
  try {
    const response = await requestApi('/api/admin/session');
    const data = await response.json();
    return response.ok && Boolean(data.authenticated);
  } catch (_error) {
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.EcoPickupAPI = {
    apiFetch: requestApi,
    loadAdminSession,
    BASE_API_URL,
  };
}

if (typeof module !== 'undefined') {
  module.exports = { apiFetch: requestApi, loadAdminSession, BASE_API_URL };
}
