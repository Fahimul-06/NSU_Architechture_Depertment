const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const request = async (path, options = {}) => {
  const response = await fetch(`${API}${path}`, {headers:{'Content-Type':'application/json'}, ...options});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
};
export const api = {
  faculties: () => request('/api/faculties?department=ARCH'),
  appointments: facultyId => request(`/api/appointments?facultyId=${facultyId}`),
  updateStatus: (id,status) => request(`/api/appointments/${id}/status`, {method:'PUT',body:JSON.stringify({status})}),
  arrivalResponse: (id,response) => request(`/api/appointments/${id}/arrival-response`, {method:'PUT',body:JSON.stringify({response})}),
  services: facultyId => request(`/api/services?facultyId=${facultyId}`),
  classSchedule: facultyId => request(`/api/class-schedule?facultyId=${facultyId}`),
  serviceHours: facultyId => request(`/api/service-hours?facultyId=${facultyId}`),
  save: (route,item) => request(`${route}${item.id ? `/${item.id}` : ''}`, {method:item.id?'PUT':'POST',body:JSON.stringify(item)}),
  remove: (route,id) => request(`${route}/${id}`, {method:'DELETE'})
};
