const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

const TOKEN_STORAGE_KEY = 'dicebank.session';

const isBrowser = () => typeof window !== 'undefined';

export const getSessionToken = () => (isBrowser() ? localStorage.getItem(TOKEN_STORAGE_KEY) : null);

export const saveSessionToken = (token) => {
  if (isBrowser()) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
};

export const clearSessionToken = () => {
  if (isBrowser()) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

async function apiFetch(path, options = {}) {
  const token = getSessionToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(options.headers || {}),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message = payload?.detail || response.statusText || 'Request failed';
    const error = new Error(message);
    error.detail = payload?.detail ?? payload;
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const login = (credentials) =>
  apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

export const register = (payload) =>
  apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const logout = () =>
  apiFetch('/api/auth/logout', {
    method: 'POST',
  }).catch((err) => {
    
    console.warn('Logout request failed', err);
  });

export const me = () => apiFetch('/api/auth/me');

export const myAccount = () => apiFetch('/api/accounts/me');

export const myTransactions = (limit = 20, direction) => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (direction) params.set('direction', direction);
  const query = params.toString();
  return apiFetch(`/api/transactions${query ? `?${query}` : ''}`);
};

export const listContacts = () => apiFetch('/api/contacts');

export const listCards = () => apiFetch('/api/cards');

export const orderCard = (payload) =>
  apiFetch('/api/cards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateCardStatus = (cardId, status) =>
  apiFetch(`/api/cards/${cardId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const searchUsers = (query) =>
  apiFetch(`/api/users/search?query=${encodeURIComponent(query)}`);

export const sendTransfer = (payload) =>
  apiFetch('/api/transactions/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateProfile = (payload) =>
  apiFetch('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/api/users/me/avatar', {
    method: 'POST',
    body: formData,
  });
};
