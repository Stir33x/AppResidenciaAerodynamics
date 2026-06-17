const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function fetchApi(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

export async function login(email, password) {
  const data = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('token', data.token);
  return data.user;
}

export async function register(body) {
  const data = await fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  localStorage.setItem('token', data.token);
  return data.user;
}

export async function getMe() {
  return fetchApi('/auth/me');
}

export function logout() {
  localStorage.removeItem('token');
}
