import 'dotenv/config';
import http from 'node:http';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { connectDatabase, closeDatabase } from './db.mjs';
import { seedIfEmpty } from './seed.mjs';
import { Student, Faculty, Department, Service, ClassSchedule, ServiceHour, Appointment, ScanLog, PosSession } from './models/index.mjs';

const PORT = Number(process.env.PORT || 8080);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const ARCH_DEPARTMENT_CODE = 'ARCH';
const json=(res,code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Access-Control-Allow-Origin':CORS_ORIGIN,'Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'}); if(code===204)return res.end(); res.end(JSON.stringify(body));};
const readBody=req=>new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>1_000_000){reject(new Error('Request body too large.'));req.destroy();}});req.on('end',()=>{try{resolve(b?JSON.parse(b):{});}catch(e){reject(e);}});req.on('error',reject);});
const normalizeUid=s=>String(s||'').replace(/[^a-fA-F0-9]/g,'').toUpperCase();
const dayName=d=>['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
const minutes=t=>{const[h,m]=String(t).split(':').map(Number);return h*60+m;};
const hhmm=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const dateIso=d=>d.toISOString().slice(0,10);
const plain=doc=>doc?.toObject?doc.toObject():doc;
const parseQrPayload=raw=>{const text=String(raw||'').trim();try{if(text.startsWith('{')){const o=JSON.parse(text);return{appointmentId:o.appointmentId||o.id,token:o.token};}const params=new URLSearchParams(text.includes('?')?text.slice(text.indexOf('?')+1):text);return{appointmentId:params.get('appointmentId')||params.get('id'),token:params.get('token')};}catch{return{};}};
const duplicateMessage=e=>e?.code===11000?`Duplicate value for ${Object.keys(e.keyPattern||{}).join(', ')||'unique field'}.`:null;
const dhakaParts=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return{date:`${o.year}-${o.month}-${o.day}`,minutes:Number(o.hour)*60+Number(o.minute)};};
const appointmentDetails=a=>plain(a);
async function validateArrival(a,{deviceName='Faculty Office Scanner',method='QR'}={}){
  const nowInfo=dhakaParts();
  const reject=(reason,message)=>({accepted:false,reason,message,appointment:appointmentDetails(a),scannedAt:new Date().toISOString()});
  if(['CANCELLED','ABSENT','COMPLETED','EXPIRED'].includes(a.status))return reject('INVALID_STATUS',`This appointment is ${a.status.toLowerCase()}.`);
  if(['CHECKED_IN','IN_SERVICE','CALLED'].includes(a.status)||a.checkedInAt)return reject('ALREADY_USED','This appointment has already been checked in.');
  if(a.date>nowInfo.date)return reject('TOO_EARLY',`Your appointment is on ${a.date} at ${a.startTime}. Please arrive 5 minutes before your scheduled time.`);
  if(a.date<nowInfo.date)return reject('EXPIRED',`This appointment expired on ${a.date}.`);
  const start=minutes(a.startTime),end=minutes(a.endTime),openAt=start-5;
  if(nowInfo.minutes>end)return reject('MISSED_TIME',`The appointment window ended at ${a.endTime}. Please contact the department office.`);
  const earlyArrival=nowInfo.minutes<openAt;
  const now=new Date();
  Object.assign(a,{status:'CHECKED_IN',checkedInAt:now,scannerDevice:deviceName,checkInMethod:method,arrivalStatus:'WAITING_FOR_FACULTY',arrivalTiming:earlyArrival?'EARLY':'ON_TIME',facultyResponse:null,facultyResponseMessage:'Waiting for faculty response.',facultyRespondedAt:null});
  await a.save();
  const reason=earlyArrival?'EARLY_ARRIVAL':'VALID';
  const message=earlyArrival
    ?`You arrived before your scheduled time (${a.startTime}-${a.endTime}). Your arrival was sent to the faculty. Please wait for WAIT or COME IN.`
    :'Appointment accepted. Your arrival was sent to the faculty. Please wait for WAIT or COME IN.';
  await ScanLog.create({id:crypto.randomUUID(),appointmentId:a.id,token:a.token,result:'ACCEPTED',reason,deviceName,scannedAt:now,method});
  return{accepted:true,reason,message,earlyArrival,appointment:appointmentDetails(a),scannedAt:now.toISOString()};
}

async function assertNfcAvailable(uid,{studentId=null,facultyId=null}={}){
  if(!uid)return;
  const [s,f]=await Promise.all([
    Student.findOne({nfcUid:uid,...(studentId?{id:{$ne:studentId}}:{})}).lean(),
    Faculty.findOne({nfcUid:uid,...(facultyId?{id:{$ne:facultyId}}:{})}).lean()
  ]);
  if(s||f)throw Object.assign(new Error('This NFC card is already assigned.'),{statusCode:409});
}

async function allocateSlot(facultyId,service){
  const [hours,classes,appointments]=await Promise.all([
    ServiceHour.find({facultyId,$or:[{serviceId:service.id},{service:service.name}]}).lean(),
    ClassSchedule.find({facultyId}).lean(),
    Appointment.find({facultyId,status:{$nin:['CANCELLED','ABSENT']}}).lean()
  ]);
  const now=new Date();
  for(let offset=0;offset<21;offset++){
    const date=new Date(now);date.setDate(now.getDate()+offset);
    const iso=dateIso(date),day=dayName(date);
    for(const h of hours.filter(x=>x.day===day)){
      let cursor=minutes(h.start),end=minutes(h.end),duration=Number(service.duration||h.duration);
      if(offset===0)cursor=Math.max(cursor,now.getHours()*60+now.getMinutes()+5);
      cursor=Math.ceil(cursor/5)*5;
      while(cursor+duration<=end){
        const blocked=classes.some(c=>c.day===day&&cursor<minutes(c.end)&&cursor+duration>minutes(c.start));
        const booked=appointments.some(a=>a.date===iso&&cursor<minutes(a.endTime)&&cursor+duration>minutes(a.startTime));
        if(!blocked&&!booked)return{date:iso,startTime:hhmm(cursor),endTime:hhmm(cursor+duration)};
        cursor+=5;
      }
    }
  }
  throw Object.assign(new Error('No available service slot found in the next 21 days.'),{statusCode:409});
}

async function handle(req,res){
  if(req.method==='OPTIONS')return json(res,204);
  const url=new URL(req.url,`http://${req.headers.host}`),p=url.pathname;
  if(p==='/api/health')return json(res,200,{ok:true,database:mongoose.connection.readyState===1?'connected':'disconnected',time:new Date().toISOString()});

  if(p==='/api/students/by-nfc'&&req.method==='GET'){
    const rawUid=url.searchParams.get('uid'),uid=normalizeUid(rawUid);
    if(!uid)return json(res,400,{message:'No NFC UID was received.'});
    const student=await Student.findOne({nfcUid:uid}).lean();
    if(!student)return json(res,404,{message:`NFC card ${uid} is not registered in this database.`});
    if(String(student.status||'ACTIVE').toUpperCase()!=='ACTIVE')return json(res,403,{message:`Student ${student.id} is ${student.status}.`});
    if(String(student.department||'').toUpperCase()!==ARCH_DEPARTMENT_CODE)return json(res,403,{message:'This student is not registered under the NSU Architecture Department.'});
    return json(res,200,student);
  }
  if(p==='/api/pos-sessions/nfc-tap'&&req.method==='POST'){
    const b=await readBody(req),terminalId=String(b.terminalId||'').trim().toUpperCase(),uid=normalizeUid(b.nfcUid);
    if(!terminalId||!uid)return json(res,400,{message:'terminalId and nfcUid are required.'});
    const student=await Student.findOne({nfcUid:uid}).lean();
    if(!student)return json(res,404,{message:'NFC card is not registered.'});
    if(String(student.status||'ACTIVE').toUpperCase()!=='ACTIVE')return json(res,403,{message:`Student status is ${student.status}.`});
    await PosSession.updateMany({terminalId,consumedAt:null},{$set:{status:'REPLACED',consumedAt:new Date()}});
    const session=await PosSession.create({id:crypto.randomUUID(),terminalId,nfcUid:uid,studentId:student.id,studentName:student.name,department:student.department,status:'READY',expiresAt:new Date(Date.now()+120000),consumedAt:null});
    return json(res,201,{accepted:true,message:`${student.name} sent to ${terminalId}.`,session:plain(session),student});
  }
  if(p==='/api/pos-sessions/pending'&&req.method==='GET'){
    const terminalId=String(url.searchParams.get('terminalId')||'').trim().toUpperCase();
    if(!terminalId)return json(res,400,{message:'terminalId is required.'});
    const session=await PosSession.findOneAndUpdate({terminalId,consumedAt:null,expiresAt:{$gt:new Date()}},{$set:{consumedAt:new Date(),status:'CONSUMED'}},{sort:{createdAt:-1},new:true}).lean();
    if(!session)return json(res,204);
    const student=await Student.findOne({id:session.studentId}).lean();
    if(!student)return json(res,404,{message:'Student record no longer exists.'});
    return json(res,200,{session,student});
  }
  if(p==='/api/admin/stats'&&req.method==='GET'){
    const [students,activeStudents,faculties,professors,departments,studentCards,facultyCards]=await Promise.all([
      Student.countDocuments(),Student.countDocuments({status:'ACTIVE'}),Faculty.countDocuments(),Faculty.countDocuments({designation:/professor/i}),Department.countDocuments(),Student.countDocuments({nfcUid:{$exists:true,$ne:''}}),Faculty.countDocuments({nfcUid:{$exists:true,$ne:''}})
    ]);
    return json(res,200,{students,activeStudents,faculties,professors,departments,registeredCards:studentCards+facultyCards});
  }

  if(p==='/api/departments'&&req.method==='GET')return json(res,200,await Department.find({code:ARCH_DEPARTMENT_CODE}).sort({code:1}).lean());
  if(p==='/api/departments'&&req.method==='POST'){
    const b=await readBody(req),code=String(b.code||'').trim().toUpperCase();
    if(!code||!b.name)return json(res,400,{message:'Department code and name are required.'});
    if(code!==ARCH_DEPARTMENT_CODE)return json(res,403,{message:'This deployment is restricted to the NSU Department of Architecture.'});
    return json(res,201,plain(await Department.create({code,name:String(b.name).trim()})));
  }
  const departmentMatch=p.match(/^\/api\/departments\/([^/]+)$/);
  if(departmentMatch&&req.method==='PUT'){
    const item=await Department.findOneAndUpdate({code:departmentMatch[1].toUpperCase()},{$set:{name:(await readBody(req)).name}},{new:true,runValidators:true}).lean();
    return item?json(res,200,item):json(res,404,{message:'Department not found.'});
  }

  if(p==='/api/students'&&req.method==='GET')return json(res,200,await Student.find().sort({name:1}).lean());
  if(p==='/api/students'&&req.method==='POST'){
    const b=await readBody(req),id=String(b.id||b.studentId||'').trim(),uid=normalizeUid(b.nfcUid),department=String(b.department||'').toUpperCase();
    if(!id||!b.name||!department||!uid)return json(res,400,{message:'Student ID, name, department, and NFC UID are required.'});
    if(department!==ARCH_DEPARTMENT_CODE)return json(res,403,{message:'Only NSU Architecture students can be registered in this deployment.'});
    if(!await Department.exists({code:department}))return json(res,400,{message:'Invalid department.'});
    await assertNfcAvailable(uid);
    const item=await Student.create({id,name:String(b.name).trim(),email:String(b.email||'').trim(),program:String(b.program||'').trim(),department,nfcUid:uid,status:b.status||'ACTIVE'});
    return json(res,201,plain(item));
  }
  const studentMatch=p.match(/^\/api\/students\/([^/]+)$/);
  if(studentMatch&&req.method==='PUT'){
    const existing=await Student.findOne({id:studentMatch[1]});if(!existing)return json(res,404,{message:'Student not found.'});
    const b=await readBody(req),uid=normalizeUid(b.nfcUid??existing.nfcUid);
    await assertNfcAvailable(uid,{studentId:existing.id});
    Object.assign(existing,b,{id:existing.id,nfcUid:uid});await existing.save();return json(res,200,plain(existing));
  }
  if(studentMatch&&req.method==='DELETE'){
    const item=await Student.findOneAndDelete({id:studentMatch[1]});return item?json(res,200,{ok:true}):json(res,404,{message:'Student not found.'});
  }

  if(p==='/api/faculties'&&req.method==='GET'){
    const q=url.searchParams.get('department')?{departmentCode:url.searchParams.get('department').toUpperCase()}:{};
    return json(res,200,await Faculty.find(q).sort({name:1}).lean());
  }
  if(p==='/api/faculties'&&req.method==='POST'){
    const b=await readBody(req),id=String(b.id||b.employeeId||'').trim(),uid=normalizeUid(b.nfcUid),departmentCode=String(b.departmentCode||'').toUpperCase();
    if(!id||!b.name||!b.designation||!departmentCode||!uid)return json(res,400,{message:'Employee ID, name, designation, department, and NFC UID are required.'});
    if(departmentCode!==ARCH_DEPARTMENT_CODE)return json(res,403,{message:'Only NSU Architecture faculty can be registered in this deployment.'});
    if(!await Department.exists({code:departmentCode}))return json(res,400,{message:'Invalid department.'});
    await assertNfcAvailable(uid);
    const item=await Faculty.create({id,name:String(b.name).trim(),email:String(b.email||'').trim(),designation:b.designation,departmentCode,officeRoom:String(b.officeRoom||'').trim(),nfcUid:uid,status:b.status||'ACTIVE'});
    return json(res,201,plain(item));
  }
  const facultyMatch=p.match(/^\/api\/faculties\/([^/]+)$/);
  if(facultyMatch&&req.method==='PUT'){
    const existing=await Faculty.findOne({id:facultyMatch[1]});if(!existing)return json(res,404,{message:'Faculty record not found.'});
    const b=await readBody(req),uid=normalizeUid(b.nfcUid??existing.nfcUid);
    await assertNfcAvailable(uid,{facultyId:existing.id});Object.assign(existing,b,{id:existing.id,nfcUid:uid});await existing.save();return json(res,200,plain(existing));
  }
  if(facultyMatch&&req.method==='DELETE'){
    if(await Appointment.exists({facultyId:facultyMatch[1]}))return json(res,409,{message:'Faculty has appointment history and cannot be deleted. Set status to INACTIVE instead.'});
    const item=await Faculty.findOneAndDelete({id:facultyMatch[1]});return item?json(res,200,{ok:true}):json(res,404,{message:'Faculty record not found.'});
  }

  if(p==='/api/services'&&req.method==='GET'){
    const q={active:true};if(url.searchParams.get('facultyId'))q.facultyId=url.searchParams.get('facultyId');
    return json(res,200,await Service.find(q).lean());
  }
  if(p==='/api/appointments'&&req.method==='GET'){
    const q={};if(url.searchParams.get('facultyId'))q.facultyId=url.searchParams.get('facultyId');
    return json(res,200,await Appointment.find(q).sort({date:1,startTime:1}).lean());
  }
  if(p==='/api/appointments'&&req.method==='POST'){
    const b=await readBody(req);
    const [student,faculty,service,department]=await Promise.all([Student.findOne({id:b.studentId}).lean(),Faculty.findOne({id:b.facultyId}).lean(),Service.findOne({id:b.serviceId,active:true}).lean(),Department.findOne({code:String(b.departmentCode||'').toUpperCase()}).lean()]);
    if(!student||!faculty||!service||!department)return json(res,400,{message:'Invalid student, faculty, department, or service.'});
    const slot=await allocateSlot(faculty.id,service),seq=await Appointment.countDocuments({facultyId:faculty.id,date:slot.date})+1,initials=faculty.name.replace(/^Dr\.\s*/,'').split(/\s+/).map(x=>x[0]).join('').toUpperCase().slice(0,3);
    const id=`APT-${slot.date.replaceAll('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`,token=`${department.code}-${initials}-${String(seq).padStart(3,'0')}`;
    const a=await Appointment.create({id,appointmentId:id,token,studentId:student.id,studentName:student.name,departmentCode:department.code,facultyId:faculty.id,facultyName:faculty.name,officeRoom:faculty.officeRoom,serviceId:service.id,service:service.name,date:slot.date,startTime:slot.startTime,endTime:slot.endTime,duration:service.duration,status:'BOOKED',qrPayload:`appointmentId=${id}&token=${token}`});
    return json(res,201,plain(a));
  }

  if(p==='/api/tickets/scan'&&req.method==='POST'){
    const b=await readBody(req),parsed=parseQrPayload(b.qrPayload||b.code||b.raw),appointmentId=parsed.appointmentId||b.appointmentId,suppliedToken=parsed.token||b.token;
    if(!appointmentId)return json(res,200,{accepted:false,reason:'INVALID_QR',message:'The QR code does not contain an appointment ID.',appointment:null,scannedAt:new Date().toISOString()});
    const a=await Appointment.findOne({$or:[{id:appointmentId},{appointmentId}]});
    if(!a)return json(res,200,{accepted:false,reason:'NOT_FOUND',message:'No appointment was found for this ticket.',appointment:null,scannedAt:new Date().toISOString()});
    if(!suppliedToken||suppliedToken!==a.token)return json(res,200,{accepted:false,reason:'TOKEN_MISMATCH',message:'The ticket token does not match the appointment.',appointment:appointmentDetails(a),scannedAt:new Date().toISOString()});
    return json(res,200,await validateArrival(a,{deviceName:b.deviceName||'Faculty Office Scanner',method:'QR'}));
  }
  if(p==='/api/tickets/scan-by-nfc'&&req.method==='POST'){
    const b=await readBody(req),uid=normalizeUid(b.nfcUid);
    if(!uid)return json(res,200,{accepted:false,reason:'EMPTY_NFC',message:'No NFC card UID was received.',appointment:null,scannedAt:new Date().toISOString()});
    const student=await Student.findOne({nfcUid:uid}).lean();
    if(!student)return json(res,200,{accepted:false,reason:'CARD_NOT_REGISTERED',message:'This NFC card is not registered.',appointment:null,scannedAt:new Date().toISOString()});
    if(student.status!=='ACTIVE')return json(res,200,{accepted:false,reason:'STUDENT_INACTIVE',message:`Student status is ${student.status}.`,student,appointment:null,scannedAt:new Date().toISOString()});
    const today=dhakaParts().date;
    const candidates=await Appointment.find({studentId:student.id,status:{$in:['BOOKED','CHECKED_IN','CALLED','IN_SERVICE']},date:{$gte:today}}).sort({date:1,startTime:1});
    if(!candidates.length)return json(res,200,{accepted:false,reason:'NO_APPOINTMENT',message:'No active appointment was found for this student.',student,appointment:null,scannedAt:new Date().toISOString()});
    const a=candidates[0];
    const result=await validateArrival(a,{deviceName:b.deviceName||'Faculty Office NFC Scanner',method:'NFC'});
    return json(res,200,{...result,student});
  }
  const arrivalResponseMatch=p.match(/^\/api\/appointments\/([^/]+)\/arrival-response$/);
  if(arrivalResponseMatch&&req.method==='PUT'){
    const b=await readBody(req),response=String(b.response||'').toUpperCase();if(!['COME_IN','WAIT'].includes(response))return json(res,400,{message:'Response must be COME_IN or WAIT.'});
    const a=await Appointment.findOne({id:arrivalResponseMatch[1]});if(!a)return json(res,404,{message:'Appointment not found.'});if(!a.checkedInAt)return json(res,409,{message:'Student has not checked in yet.'});
    Object.assign(a,{facultyResponse:response,arrivalStatus:response==='COME_IN'?'COME_IN':'WAIT',facultyResponseMessage:response==='COME_IN'?'Please come in now.':'Please wait outside. The faculty will call you shortly.',facultyRespondedAt:new Date()});if(response==='COME_IN')a.status='CALLED';await a.save();return json(res,200,plain(a));
  }
  const studentMessageMatch=p.match(/^\/api\/appointments\/([^/]+)\/student-message$/);
  if(studentMessageMatch&&req.method==='GET'){
    const a=await Appointment.findOne({id:studentMessageMatch[1]}).lean();if(!a)return json(res,404,{message:'Appointment not found.'});return json(res,200,{appointmentId:a.id,token:a.token,arrivalStatus:a.arrivalStatus||null,facultyResponse:a.facultyResponse||null,message:a.facultyResponseMessage||'Waiting for faculty response.',facultyRespondedAt:a.facultyRespondedAt||null,status:a.status});
  }
  if(p==='/api/tickets/scan-logs'&&req.method==='GET')return json(res,200,await ScanLog.find().sort({scannedAt:-1}).limit(1000).lean());
  const appointmentMatch=p.match(/^\/api\/appointments\/([^/]+)\/status$/);
  if(appointmentMatch&&req.method==='PUT'){
    const b=await readBody(req),a=await Appointment.findOneAndUpdate({id:appointmentMatch[1]},{$set:{status:b.status}},{new:true}).lean();return a?json(res,200,a):json(res,404,{message:'Appointment not found.'});
  }

  const crud=[['/api/services',Service],['/api/class-schedule',ClassSchedule],['/api/service-hours',ServiceHour]];
  for(const[route,Model]of crud){
    if(p===route&&req.method==='GET'){const q=url.searchParams.get('facultyId')?{facultyId:url.searchParams.get('facultyId')}:{};return json(res,200,await Model.find(q).lean());}
    if(p===route&&req.method==='POST'){const b=await readBody(req),item=await Model.create({...b,id:b.id||crypto.randomUUID(),facultyId:b.facultyId||'FAC-001'});return json(res,201,plain(item));}
    const m=p.match(new RegExp(`^${route}/([^/]+)$`));
    if(m&&req.method==='PUT'){const b=await readBody(req),item=await Model.findOneAndUpdate({id:m[1]},{$set:b},{new:true,runValidators:true}).lean();return item?json(res,200,item):json(res,404,{message:'Record not found.'});}
    if(m&&req.method==='DELETE'){const item=await Model.findOneAndDelete({id:m[1]});return item?json(res,200,{ok:true}):json(res,404,{message:'Record not found.'});}
  }
  return json(res,404,{message:'Route not found.'});
}

const server=http.createServer(async(req,res)=>{try{await handle(req,res);}catch(e){console.error(e);const duplicate=duplicateMessage(e);json(res,e.statusCode||e.status|| (duplicate?409:500),{message:duplicate||e.message||'Server error'});}});

await connectDatabase();
if(String(process.env.AUTO_SEED||'true').toLowerCase()==='true')await seedIfEmpty(false);
server.listen(PORT,'0.0.0.0',()=>console.log(`NSU Architecture Queue API running at http://localhost:${PORT}`));

async function shutdown(){console.log('Shutting down...');server.close(async()=>{await closeDatabase();process.exit(0);});}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
