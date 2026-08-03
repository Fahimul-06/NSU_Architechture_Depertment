import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard, Users, CalendarDays, BriefcaseBusiness, Clock3,
  Search, Bell, LogOut, CheckCircle2, UserCheck, Play, XCircle,
  RefreshCw, Plus, Trash2, Edit3, Printer, Menu, ChevronRight,
  PauseCircle, UserRoundX
} from 'lucide-react';
import Modal from './components/Modal';
import { api, authStore } from './api';
import { formatTime } from './utils/time';

const navItems = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['queue', 'Today’s Queue', Users],
  ['services', 'Services', BriefcaseBusiness],
  ['classSchedule', 'Class Schedule', CalendarDays],
  ['serviceHours', 'Service Hours', Clock3]
];

const statusLabel = {
  BOOKED: 'Booked', CHECKED_IN: 'At Door', WAITING: 'Waiting', CALLED: 'Called', IN_SERVICE: 'In Service',
  COMPLETED: 'Completed', ABSENT: 'Absent', CANCELLED: 'Cancelled'
};

function StatCard({ label, value, hint }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

function EmptyState({ text }) {
  return <div className="empty-state"><Users size={34}/><p>{text}</p></div>;
}

function Dashboard({ faculty, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const faculties = [faculty];
  const facultyId = faculty.id;
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [classSchedule, setClassSchedule] = useState([]);
  const [serviceHours, setServiceHours] = useState([]);
  const [connectionError, setConnectionError] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [queuePaused, setQueuePaused] = useState(false);
  const [selected, setSelected] = useState(null);
  const [arrivalNotice, setArrivalNotice] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const selectedFaculty = useMemo(() => faculties.find(f => f.id === facultyId) || null, [faculties, facultyId]);

  const loadAll = async () => {
    if (!facultyId) return;
    try {
      const [a, s, c, h, n] = await Promise.all([api.appointments(facultyId), api.services(facultyId), api.classSchedule(facultyId), api.serviceHours(facultyId), api.notifications()]);
      setAppointments(a); setServices(s); setClassSchedule(c); setServiceHours(h); setNotifications(n.items || []); setUnreadCount(n.unreadCount || 0); setConnectionError('');
      const pendingArrival = a.find(item => item.status === 'CHECKED_IN' && item.arrivalStatus === 'WAITING_FOR_FACULTY');
      setArrivalNotice(pendingArrival || null);
    } catch (error) { setConnectionError(error.message); }
  };

  useEffect(() => {
    if (!facultyId) return;
    setArrivalNotice(null);
    loadAll();
    const timer = setInterval(loadAll, 750);
    return () => clearInterval(timer);
  }, [facultyId]);

  const filteredAppointments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter(a => [a.studentName, a.studentId, a.token, a.service, a.status].some(v => String(v).toLowerCase().includes(q)));
  }, [appointments, query]);

  const metrics = useMemo(() => ({
    total: appointments.length,
    waiting: appointments.filter(a => ['CHECKED_IN', 'WAITING', 'CALLED'].includes(a.status)).length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    upcoming: appointments.filter(a => a.status === 'BOOKED').length
  }), [appointments]);

  const updateStatus = async (id, status) => {
    try { const updated = await api.updateStatus(id, status); setAppointments(items => items.map(item => item.id === id ? updated : item)); setSelected(x => x?.id === id ? updated : x); }
    catch (error) { alert(error.message); }
  };

  const respondToArrival = async (appointment, response) => {
    try {
      const updated = await api.arrivalResponse(appointment.id, response);
      setAppointments(items => items.map(item => item.id === updated.id ? updated : item));
      setArrivalNotice(null);
    } catch (error) { alert(error.message); }
  };

  const saveService = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const item = { ...(modal.item || {}), facultyId, name: form.get('name').trim(), duration: Number(form.get('duration')), maxPerDay: Number(form.get('maxPerDay')), active: form.get('active') === 'on' };
    try { await api.save('/api/services', item); await loadAll(); setModal(null); } catch(error){ alert(error.message); }
  };

  const saveClass = async (event) => {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    const item = { ...(modal.item || {}), facultyId, day:f.get('day'), course:f.get('course'), section:f.get('section'), start:f.get('start'), end:f.get('end'), room:f.get('room') };
    try { await api.save('/api/class-schedule', item); await loadAll(); setModal(null); } catch(error){ alert(error.message); }
  };

  const saveServiceHour = async (event) => {
    event.preventDefault(); const f = new FormData(event.currentTarget); const svc = services.find(x => x.name === f.get('service'));
    const item = { ...(modal.item || {}), facultyId, serviceId:svc?.id, day:f.get('day'), service:f.get('service'), start:f.get('start'), end:f.get('end'), duration:Number(f.get('duration')) };
    try { await api.save('/api/service-hours', item); await loadAll(); setModal(null); } catch(error){ alert(error.message); }
  };

  const removeItem = async (route, id) => {
    try { await api.remove(route,id); await loadAll(); } catch(error){ alert(error.message); }
  };

  const openNotification = async (item) => {
    if (!item.readAt) { try { await api.readNotification(item.id); } catch {} }
    setNotificationsOpen(false); setUnreadCount(v => Math.max(0, v - (item.readAt ? 0 : 1)));
    if (item.appointmentId) { const appt = appointments.find(a => a.id === item.appointmentId); if (appt) { setPage('queue'); setSelected(appt); setModal({type:'appointment'}); } }
  };
  const markAllRead = async () => { try { await api.readAllNotifications(); setUnreadCount(0); setNotifications(items => items.map(x => ({...x, readAt:x.readAt || new Date().toISOString()}))); } catch(error){ alert(error.message); } };
  const logout = async () => { try { await api.logout(); } catch {} authStore.clear(); onLogout(); };

  const printQueue = () => window.print();

  const renderQueueTable = (compact = false) => (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Booking Time</th><th>Token</th><th>Student</th><th>Service</th><th>Status</th>{!compact && <th>Actions</th>}</tr></thead>
        <tbody>
          {filteredAppointments.map(a => (
            <tr key={a.id}>
              <td>{formatTime(a.startTime)}–{formatTime(a.endTime)}</td>
              <td><button className="token-button" onClick={() => { setSelected(a); setModal({type:'appointment'}); }}>{a.token}</button></td>
              <td><strong>{a.studentName}</strong><span className="subtext">{a.studentId}</span></td>
              <td>{a.service}</td>
              <td><span className={`status status-${a.status.toLowerCase()}`}>{statusLabel[a.status]}</span></td>
              {!compact && <td>
                <div className="row-actions">
                  {a.status === 'CHECKED_IN' && <button title="Tell student to wait" onClick={() => respondToArrival(a, 'WAIT')}><PauseCircle size={17}/></button>}
                  <button title="Come in / Call" onClick={() => a.status === 'CHECKED_IN' ? respondToArrival(a, 'COME_IN') : updateStatus(a.id, 'CALLED')}><UserCheck size={17}/></button>
                  <button title="Start service" onClick={() => updateStatus(a.id, 'IN_SERVICE')}><Play size={17}/></button>
                  <button title="Complete" onClick={() => updateStatus(a.id, 'COMPLETED')}><CheckCircle2 size={17}/></button>
                  <button title="Absent" onClick={() => updateStatus(a.id, 'ABSENT')}><UserRoundX size={17}/></button>
                </div>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredAppointments.length && <EmptyState text="No appointments match this search."/>}
    </div>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">UQ</div><div><strong>UniQueue</strong><span>Faculty Portal</span></div></div>
        <nav>
          {navItems.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => {setPage(id); setSidebarOpen(false)}}><Icon size={20}/><span>{label}</span></button>)}
        </nav>
        <div className="faculty-card"><div className="avatar">{selectedFaculty?.name?.split(/\s+/).map(x => x[0]).join('').slice(0,2).toUpperCase() || 'AF'}</div><div><strong>{selectedFaculty?.name || 'Select faculty'}</strong><span>{selectedFaculty?.designation || 'NSU Architecture'}</span></div></div>
        <button className="logout" onClick={logout}><LogOut size={19}/> Sign out</button>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(v => !v)}><Menu/></button>
          <div><h1>{navItems.find(x => x[0] === page)?.[1]}</h1><p>{new Date().toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p></div>
          <div className="top-actions"><div className="notification-wrap"><button className="icon-button" onClick={() => setNotificationsOpen(v => !v)} aria-label="Notifications"><Bell size={20}/>{unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>{notificationsOpen && <div className="notification-panel"><div className="notification-header"><div><strong>Notifications</strong><span>{unreadCount} unread</span></div><button onClick={markAllRead}>Mark all read</button></div><div className="notification-list">{notifications.length ? notifications.map(item => <button key={item.id} className={`notification-item ${item.readAt ? "" : "unread"}`} onClick={() => openNotification(item)}><span className="notification-type">{item.title}</span><strong>{item.token || "Queue update"}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></button>) : <div className="notification-empty">No notifications yet.</div>}</div></div>}</div><div className="top-profile"><div className="avatar small">{selectedFaculty?.name?.split(/\s+/).map(x => x[0]).join('').slice(0,2).toUpperCase() || 'AF'}</div><span>{selectedFaculty?.name || 'Select faculty'}</span></div></div>
        </header>

        <section className="content">

          {arrivalNotice && <div className="arrival-overlay" role="alertdialog" aria-live="assertive">
            <div className="arrival-screen">
              <div className="arrival-icon"><Bell size={42}/></div>
              <p className="eyebrow">LIVE ARRIVAL ALERT</p>
              <h1>STUDENT AT YOUR DOOR</h1>
              <div className="arrival-ticket">
                <div><span>Token</span><strong>{arrivalNotice.token}</strong></div>
                <div><span>Student Name</span><strong>{arrivalNotice.studentName}</strong></div>
                <div><span>Student ID</span><strong>{arrivalNotice.studentId}</strong></div>
                <div><span>Service</span><strong>{arrivalNotice.service}</strong></div>
                <div><span>Booking</span><strong>{arrivalNotice.date} · {formatTime(arrivalNotice.startTime)}–{formatTime(arrivalNotice.endTime)}</strong></div>
              </div>
              <div className="arrival-actions large">
                <button className="secondary" onClick={() => respondToArrival(arrivalNotice, 'WAIT')}><PauseCircle size={24}/> WAIT</button>
                <button className="success" onClick={() => respondToArrival(arrivalNotice, 'COME_IN')}><UserCheck size={24}/> COME IN</button>
              </div>
            </div>
          </div>}
          {connectionError && <div className="welcome-card"><div><p className="eyebrow">SERVER OFFLINE</p><h2>Dashboard cannot reach the shared API</h2><p>Start the backend on port 8080. {connectionError}</p></div><button className="primary" onClick={loadAll}>Retry</button></div>}
          {page === 'dashboard' && <>
            <div className="welcome-card"><div><p className="eyebrow">GOOD MORNING</p><h2>Manage today’s student service queue</h2><p>New POS tickets appear here automatically within three seconds.</p></div><button className={queuePaused ? 'primary' : 'secondary'} onClick={() => setQueuePaused(v => !v)}>{queuePaused ? <RefreshCw size={18}/> : <PauseCircle size={18}/>} {queuePaused ? 'Resume Queue' : 'Pause Queue'}</button></div>
            <div className="stats-grid"><StatCard label="Today’s appointments" value={metrics.total} hint="All scheduled students"/><StatCard label="Waiting" value={metrics.waiting} hint="Checked in or called"/><StatCard label="Completed" value={metrics.completed} hint="Finished services"/><StatCard label="Upcoming" value={metrics.upcoming} hint="Not checked in yet"/></div>
            <div className="panel">
              <div className="panel-header"><div><h3>Today’s queue</h3><p>Live appointment overview</p></div><button className="text-button" onClick={() => setPage('queue')}>View all <ChevronRight size={17}/></button></div>
              {renderQueueTable(true)}
            </div>
          </>}

          {page === 'queue' && <>
            <div className="toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, ID, token or service"/></div><div className="toolbar-actions"><button className="secondary" onClick={printQueue}><Printer size={18}/> Print Queue</button><button className={queuePaused ? 'primary' : 'danger-outline'} onClick={() => setQueuePaused(v => !v)}>{queuePaused ? <RefreshCw size={18}/> : <PauseCircle size={18}/>} {queuePaused ? 'Resume Queue' : 'Pause Queue'}</button></div></div>
            <div className="panel">{renderQueueTable(false)}</div>
          </>}

          {page === 'services' && <div className="panel">
            <div className="panel-header"><div><h3>Service Types</h3><p>Set duration and daily capacity for every service</p></div><button className="primary" onClick={() => setModal({type:'service'})}><Plus size={18}/> Add Service</button></div>
            <div className="cards-grid">{services.map(s => <article className="service-card" key={s.id}><div><span className={`pill ${s.active ? 'pill-green' : 'pill-gray'}`}>{s.active ? 'Active' : 'Inactive'}</span><h4>{s.name}</h4><p>{s.duration} minutes per student</p><small>Maximum {s.maxPerDay} students per day</small></div><div className="card-actions"><button onClick={() => setModal({type:'service', item:s})}><Edit3 size={17}/></button><button onClick={() => removeItem('/api/services', s.id)}><Trash2 size={17}/></button></div></article>)}</div>
          </div>}

          {page === 'classSchedule' && <div className="panel">
            <div className="panel-header"><div><h3>Class Schedule</h3><p>Appointment slots will not be generated during class time</p></div><button className="primary" onClick={() => setModal({type:'class'})}><Plus size={18}/> Add Class</button></div>
            <div className="table-wrap"><table><thead><tr><th>Day</th><th>Course</th><th>Section</th><th>Time</th><th>Room</th><th>Actions</th></tr></thead><tbody>{classSchedule.map(c => <tr key={c.id}><td>{c.day}</td><td><strong>{c.course}</strong></td><td>{c.section}</td><td>{formatTime(c.start)}–{formatTime(c.end)}</td><td>{c.room}</td><td><div className="row-actions"><button onClick={() => setModal({type:'class', item:c})}><Edit3 size={17}/></button><button onClick={() => removeItem('/api/class-schedule', c.id)}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div>
          </div>}

          {page === 'serviceHours' && <div className="panel">
            <div className="panel-header"><div><h3>Service Hours</h3><p>Configure when each service is available</p></div><button className="primary" onClick={() => setModal({type:'serviceHour'})}><Plus size={18}/> Add Service Hour</button></div>
            <div className="table-wrap"><table><thead><tr><th>Day</th><th>Service</th><th>Available Time</th><th>Per Student</th><th>Actions</th></tr></thead><tbody>{serviceHours.map(s => <tr key={s.id}><td>{s.day}</td><td><strong>{s.service}</strong></td><td>{formatTime(s.start)}–{formatTime(s.end)}</td><td>{s.duration} minutes</td><td><div className="row-actions"><button onClick={() => setModal({type:'serviceHour', item:s})}><Edit3 size={17}/></button><button onClick={() => removeItem('/api/service-hours', s.id)}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div>
          </div>}
        </section>
      </main>

      {modal?.type === 'appointment' && selected && <Modal title={`Appointment ${selected.token}`} onClose={() => setModal(null)}><div className="detail-grid"><div><span>Student</span><strong>{selected.studentName}</strong></div><div><span>Student ID</span><strong>{selected.studentId}</strong></div><div><span>Service</span><strong>{selected.service}</strong></div><div><span>Time</span><strong>{formatTime(selected.startTime)}–{formatTime(selected.endTime)}</strong></div></div><div className="modal-actions wrap"><button onClick={() => updateStatus(selected.id, 'CALLED')} className="secondary">Call Student</button><button onClick={() => updateStatus(selected.id, 'IN_SERVICE')} className="primary">Start Service</button><button onClick={() => updateStatus(selected.id, 'COMPLETED')} className="success">Complete</button><button onClick={() => updateStatus(selected.id, 'ABSENT')} className="danger-outline">Mark Absent</button><button onClick={() => updateStatus(selected.id, 'CANCELLED')} className="danger">Cancel</button></div></Modal>}

      {modal?.type === 'service' && <Modal title={modal.item ? 'Edit Service' : 'Add Service'} onClose={() => setModal(null)}><form onSubmit={saveService} className="form-grid"><label>Service name<input name="name" required defaultValue={modal.item?.name}/></label><label>Duration per student<input name="duration" type="number" min="5" required defaultValue={modal.item?.duration || 15}/></label><label>Maximum students per day<input name="maxPerDay" type="number" min="1" required defaultValue={modal.item?.maxPerDay || 10}/></label><label className="checkbox-label"><input type="checkbox" name="active" defaultChecked={modal.item ? modal.item.active : true}/> Active service</label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setModal(null)}>Cancel</button><button className="primary">Save Service</button></div></form></Modal>}

      {modal?.type === 'class' && <Modal title={modal.item ? 'Edit Class' : 'Add Class'} onClose={() => setModal(null)}><form onSubmit={saveClass} className="form-grid two"><label>Day<select name="day" defaultValue={modal.item?.day || 'Sunday'}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}</select></label><label>Course code<input name="course" required defaultValue={modal.item?.course}/></label><label>Section<input name="section" required defaultValue={modal.item?.section}/></label><label>Room<input name="room" required defaultValue={modal.item?.room}/></label><label>Start time<input name="start" type="time" required defaultValue={modal.item?.start || '09:00'}/></label><label>End time<input name="end" type="time" required defaultValue={modal.item?.end || '10:30'}/></label><div className="modal-actions full"><button type="button" className="secondary" onClick={() => setModal(null)}>Cancel</button><button className="primary">Save Class</button></div></form></Modal>}

      {modal?.type === 'serviceHour' && <Modal title={modal.item ? 'Edit Service Hour' : 'Add Service Hour'} onClose={() => setModal(null)}><form onSubmit={saveServiceHour} className="form-grid two"><label>Day<select name="day" defaultValue={modal.item?.day || 'Sunday'}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}</select></label><label>Service<select name="service" defaultValue={modal.item?.service || services[0]?.name}>{services.map(s => <option key={s.id}>{s.name}</option>)}</select></label><label>Start time<input name="start" type="time" required defaultValue={modal.item?.start || '15:00'}/></label><label>End time<input name="end" type="time" required defaultValue={modal.item?.end || '17:00'}/></label><label>Minutes per student<input name="duration" type="number" min="5" required defaultValue={modal.item?.duration || 15}/></label><div className="modal-actions full"><button type="button" className="secondary" onClick={() => setModal(null)}>Cancel</button><button className="primary">Save Schedule</button></div></form></Modal>}
    </div>
  );
}


function Login({ onAuthenticated }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async event => {
    event.preventDefault(); setLoading(true); setError('');
    try { const result = await api.login(login.trim(), password); authStore.set(result.token); onAuthenticated(result.faculty); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <div className="login-page"><div className="login-card"><div className="login-brand"><div className="brand-mark">NSU</div><div><h1>Architecture Faculty Portal</h1><p>North South University</p></div></div><form onSubmit={submit}><label>Employee ID or university email<input value={login} onChange={e=>setLogin(e.target.value)} autoComplete="username" required placeholder="ARCH-FAC-001"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>{error && <div className="login-error">{error}</div>}<button className="primary login-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button></form><small>Initial test password: <strong>ChangeMe123!</strong>. Change it before production.</small></div></div>;
}

export default function App() {
  const [faculty, setFaculty] = useState(null);
  const [checking, setChecking] = useState(Boolean(authStore.get()));
  useEffect(() => { if (!authStore.get()) { setChecking(false); return; } api.me().then(r => setFaculty(r.faculty)).catch(() => authStore.clear()).finally(() => setChecking(false)); }, []);
  if (checking) return <div className="auth-loading">Checking faculty session…</div>;
  if (!faculty) return <Login onAuthenticated={setFaculty}/>;
  return <Dashboard faculty={faculty} onLogout={() => setFaculty(null)}/>;
}
