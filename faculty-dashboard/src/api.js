const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'nsuArchitectureFacultyToken';
export const authStore = {
  get: () => localStorage.getItem(TOKEN_KEY) || '',
  set: token => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};
const request = async (path, options = {}) => {
  const token = authStore.get();
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(options.headers || {})}
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) authStore.clear();
  if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
};
export const api = {
  login: (login,password) => request('/api/auth/faculty/login',{method:'POST',body:JSON.stringify({login,password})}),
  me: () => request('/api/auth/faculty/me'),
  logout: () => request('/api/auth/faculty/logout',{method:'POST'}),
  changePassword: data => request('/api/auth/faculty/change-password',{method:'PUT',body:JSON.stringify(data)}),
  notifications: () => request('/api/faculty/notifications'),
  arrivalScreen: () => request('/api/faculty/arrival-screen'),
  readNotification: id => request(`/api/faculty/notifications/${id}/read`,{method:'PUT'}),
  readAllNotifications: () => request('/api/faculty/notifications/read-all',{method:'PUT'}),
  appointments: facultyId => request(`/api/appointments?facultyId=${encodeURIComponent(facultyId)}`),
  updateStatus: (id,status) => request(`/api/appointments/${id}/status`, {method:'PUT',body:JSON.stringify({status})}),
  arrivalResponse: (id,response) => request(`/api/appointments/${id}/arrival-response`, {method:'PUT',body:JSON.stringify({response})}),
  services: facultyId => request(`/api/services?facultyId=${encodeURIComponent(facultyId)}`),
  classSchedule: facultyId => request(`/api/class-schedule?facultyId=${encodeURIComponent(facultyId)}`),
  serviceHours: facultyId => request(`/api/service-hours?facultyId=${encodeURIComponent(facultyId)}`),
  save: (route,item) => request(`${route}${item.id ? `/${item.id}` : ''}`, {method:item.id?'PUT':'POST',body:JSON.stringify(item)}),
  remove: (route,id) => request(`${route}/${id}`, {method:'DELETE'})
};
