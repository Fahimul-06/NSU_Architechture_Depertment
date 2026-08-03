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

export function openFacultyEventStream(onEvent, onState = () => {}) {
  const controller = new AbortController();
  let stopped = false;
  const run = async () => {
    let retryMs = 1000;
    while (!stopped) {
      try {
        const token = authStore.get();
        if (!token) throw new Error('Faculty login required.');
        onState('connecting');
        const response = await fetch(`${API}/api/realtime/faculty`, {
          headers: {Authorization: `Bearer ${token}`, Accept: 'text/event-stream'},
          cache: 'no-store', signal: controller.signal
        });
        if (!response.ok || !response.body) throw new Error(`Live connection failed: HTTP ${response.status}`);
        onState('connected'); retryMs = 1000;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!stopped) {
          const {value, done} = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, {stream:true});
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, boundary).replace(/\r/g, '');
            buffer = buffer.slice(boundary + 2);
            if (!block || block.startsWith(':')) continue;
            let event = 'message'; let data = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            if (data) { try { onEvent({type:event, data:JSON.parse(data)}); } catch {} }
          }
        }
      } catch (error) {
        if (stopped || error.name === 'AbortError') break;
        onState('disconnected', error);
        await new Promise(resolve => setTimeout(resolve, retryMs));
        retryMs = Math.min(retryMs * 2, 10000);
      }
    }
  };
  run();
  return () => { stopped = true; controller.abort(); };
}
