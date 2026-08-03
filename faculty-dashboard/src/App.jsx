import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard, Users, CalendarDays, BriefcaseBusiness, Clock3,
  Search, Bell, LogOut, CheckCircle2, UserCheck, Play, XCircle,
  RefreshCw, Plus, Trash2, Edit3, Printer, Menu, ChevronRight,
  PauseCircle, UserRoundX
} from 'lucide-react';
import Modal from './components/Modal';
import { api } from './api';
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

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const facultyId = 'ARCH-FAC-001';
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
  const seenArrivals = useRef(new Set());


  const loadAll = async () => {
    try {
      const [a, s, c, h] = await Promise.all([api.appointments(facultyId), api.services(facultyId), api.classSchedule(facultyId), api.serviceHours(facultyId)]);
      setAppointments(a); setServices(s); setClassSchedule(c); setServiceHours(h); setConnectionError('');
      const pendingArrival = a.find(item => item.arrivalStatus === 'WAITING_FOR_FACULTY' && (item.checkedInAt || item.earlyArrivalAt) && !seenArrivals.current.has(item.id));
      if (pendingArrival) {
        setArrivalNotice(pendingArrival);
        seenArrivals.current.add(pendingArrival.id);
      }
    } catch (error) { setConnectionError(error.message); }
  };

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 3000);
    return () => clearInterval(timer);
  }, []);

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
        <div className="faculty-card"><div className="avatar">AF</div><div><strong>Architecture Faculty One</strong><span>Professor · NSU Architecture</span></div></div>
        <button className="logout"><LogOut size={19}/> Sign out</button>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(v => !v)}><Menu/></button>
          <div><h1>{navItems.find(x => x[0] === page)?.[1]}</h1><p>{new Date().toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p></div>
          <div className="top-actions"><button className="icon-button"><Bell size={20}/><span className="notification-dot"/></button><div className="top-profile"><div className="avatar small">AF</div><span>Architecture Faculty One</span></div></div>
        </header>

        <section className="content">

          {arrivalNotice && <div className="arrival-alert">
            <div className="arrival-icon"><Bell size={28}/></div>
            <div className="arrival-copy">
              <p className="eyebrow">STUDENT AT YOUR DOOR</p>
              <h2>{arrivalNotice.studentName}</h2>
              <p><strong>{arrivalNotice.studentId}</strong> · Token {arrivalNotice.token}</p>
              <p>{arrivalNotice.service}</p>
              {arrivalNotice.earlyArrivalAt && !arrivalNotice.checkedInAt && <p><strong>Early arrival:</strong> Student arrived before the 5-minute check-in window.</p>}
              <p><strong>Booking:</strong> {arrivalNotice.date} · {formatTime(arrivalNotice.startTime)}–{formatTime(arrivalNotice.endTime)}</p>
            </div>
            <div className="arrival-actions">
              <button className="secondary" onClick={() => respondToArrival(arrivalNotice, 'WAIT')}><PauseCircle size={18}/> Please Wait</button>
              <button className="success" onClick={() => respondToArrival(arrivalNotice, 'COME_IN')}><UserCheck size={18}/> Come In</button>
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
