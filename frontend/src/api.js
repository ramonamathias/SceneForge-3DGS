const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export function getToken() {
  return localStorage.getItem('sceneforge_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('sceneforge_token', token);
  } else {
    localStorage.removeItem('sceneforge_token');
  }
}

export function getUser() {
  try {
    const raw = localStorage.getItem('sceneforge_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem('sceneforge_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('sceneforge_user');
  }
}

export function clearAuth() {
  localStorage.removeItem('sceneforge_token');
  localStorage.removeItem('sceneforge_user');
}

export async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, set Content-Type to application/json
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const msg = (data && data.detail) || (data && data.message) || response.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  baseUrl: API_BASE,

  async checkHealth() {
    return request('/api/health');
  },

  async signup({ name, email, password }) {
    const res = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (res.token) {
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  },

  async login({ email, password }) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Backend logout warning:', e.message);
    } finally {
      clearAuth();
    }
  },

  async getMe() {
    return request('/api/auth/me');
  },

  async getProfile() {
    return request('/api/auth/profile');
  },

  async reconstruct(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/reconstruct', {
      method: 'POST',
      body: formData,
    });
  },

  async getJob(jobId) {
    return request(`/api/jobs/${jobId}`);
  },

  getJobEventsUrl(jobId) {
    return `${API_BASE}/api/jobs/${jobId}/events`;
  },

  async viewJob(jobId) {
    return request(`/api/jobs/${jobId}/view`, { method: 'POST' });
  },

  async getProjects() {
    return request('/api/projects');
  },

  async getShowcaseProjects() {
    return request('/api/projects/showcase');
  },

  async viewProject(projectId) {
    return request(`/api/projects/${projectId}/view`, { method: 'POST' });
  },

  async deleteProject(projectId) {
    return request(`/api/projects/${projectId}`, { method: 'DELETE' });
  },

  getDownloadUrl(projectId, fileType = 'ply') {
    const token = getToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE}/api/projects/${projectId}/download/${fileType}${query}`;
  },

  async submitContact({ name, email, subject, message }) {
    return request('/api/contact', {
      method: 'POST',
      body: JSON.stringify({ name, email, subject, message }),
    });
  },
};
