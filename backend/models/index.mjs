import mongoose from 'mongoose';

const baseOptions = {
  versionKey: false,
  timestamps: true,
  strict: false,
  toJSON: { transform: (_doc, ret) => { delete ret._id; return ret; } },
  toObject: { transform: (_doc, ret) => { delete ret._id; return ret; } }
};
const make = (name, definition, indexes = []) => {
  const schema = new mongoose.Schema(definition, baseOptions);
  for (const [fields, options] of indexes) schema.index(fields, options);
  return mongoose.models[name] || mongoose.model(name, schema);
};

export const Student = make('Student', {
  id: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true },
  program: { type: String, default: '', trim: true },
  department: { type: String, required: true, trim: true, uppercase: true },
  nfcUid: { type: String, required: true, unique: true, trim: true, uppercase: true },
  status: { type: String, default: 'ACTIVE', uppercase: true }
}, [[{ department: 1, status: 1 }, {}]]);

export const Faculty = make('Faculty', {
  id: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true },
  designation: { type: String, required: true, trim: true },
  departmentCode: { type: String, required: true, trim: true, uppercase: true },
  officeRoom: { type: String, default: '', trim: true },
  nfcUid: { type: String, default: undefined, unique: true, sparse: true, trim: true, uppercase: true },
  status: { type: String, default: 'ACTIVE', uppercase: true },
  passwordHash: { type: String, default: '' },
  passwordChangedAt: Date,
  lastLoginAt: Date
}, [[{ departmentCode: 1, status: 1 }, {}], [{ email: 1 }, { sparse: true }]]);

export const Department = make('Department', {
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true }
});

export const Service = make('Service', {
  id: { type: String, required: true, unique: true },
  facultyId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  duration: { type: Number, required: true, min: 1 },
  maxPerDay: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
});

export const ClassSchedule = make('ClassSchedule', {
  id: { type: String, required: true, unique: true }, facultyId: { type: String, required: true, index: true },
  day: String, course: String, section: String, start: String, end: String, room: String
});
export const ServiceHour = make('ServiceHour', {
  id: { type: String, required: true, unique: true }, facultyId: { type: String, required: true, index: true },
  serviceId: String, day: String, service: String, start: String, end: String, duration: Number
});

export const Appointment = make('Appointment', {
  id: { type: String, required: true, unique: true }, appointmentId: { type: String, required: true, unique: true },
  token: { type: String, required: true, index: true }, studentId: { type: String, required: true, index: true },
  facultyId: { type: String, required: true, index: true }, serviceId: { type: String, required: true },
  date: { type: String, required: true, index: true }, startTime: String, endTime: String,
  status: { type: String, default: 'BOOKED', index: true }, checkedInAt: Date, facultyRespondedAt: Date
}, [[{ facultyId: 1, date: 1, startTime: 1 }, {}], [{ studentId: 1, date: 1 }, {}]]);

export const ScanLog = make('ScanLog', {
  id: { type: String, required: true, unique: true }, appointmentId: { type: String, index: true },
  token: String, result: String, reason: String, deviceName: String, scannedAt: { type: Date, default: Date.now }
}, [[{ scannedAt: -1 }, {}]]);

export const PosSession = make('PosSession', {
  id: { type: String, required: true, unique: true }, terminalId: { type: String, required: true, index: true },
  nfcUid: String, studentId: { type: String, required: true }, studentName: String, department: String,
  status: { type: String, default: 'READY' }, expiresAt: { type: Date, required: true, index: true }, consumedAt: Date
}, [[{ expiresAt: 1 }, { expireAfterSeconds: 300 }], [{ terminalId: 1, consumedAt: 1, createdAt: -1 }, {}]]);


export const AuthSession = make('AuthSession', {
  id: { type: String, required: true, unique: true },
  tokenHash: { type: String, required: true, unique: true },
  facultyId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  lastUsedAt: Date,
  revokedAt: Date
}, [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]]);

export const AdminSession = make('AdminSession', {
  id: { type: String, required: true, unique: true }, tokenHash: { type: String, required: true, unique: true },
  email: { type: String, required: true, index: true }, expiresAt: { type: Date, required: true, index: true }, revokedAt: Date, lastUsedAt: Date
}, [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]]);

export const AuditLog = make('AuditLog', {
  id: { type: String, required: true, unique: true }, actorType: String, actorId: String, action: String, targetType: String, targetId: String,
  ip: String, userAgent: String, metadata: Object, createdAt: { type: Date, default: Date.now, index: true }
}, [[{ createdAt: 1 }, { expireAfterSeconds: 31536000 }], [{ actorType: 1, actorId: 1, createdAt: -1 }, {}]]);

export const Notification = make('Notification', {
  id: { type: String, required: true, unique: true },
  facultyId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  appointmentId: String,
  token: String,
  studentId: String,
  studentName: String,
  readAt: Date,
  createdAt: { type: Date, default: Date.now, index: true }
}, [[{ facultyId: 1, readAt: 1, createdAt: -1 }, {}]]);

export const models = { Student, Faculty, Department, Service, ClassSchedule, ServiceHour, Appointment, ScanLog, PosSession, AuthSession, AdminSession, AuditLog, Notification };
