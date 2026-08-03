import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase, closeDatabase } from '../db.mjs';
import { models } from '../models/index.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const store=JSON.parse(await readFile(path.join(here,'../data/store.json'),'utf8'));
const map={students:'Student',faculties:'Faculty',departments:'Department',services:'Service',classSchedule:'ClassSchedule',serviceHours:'ServiceHour',appointments:'Appointment',scanLogs:'ScanLog',posSessions:'PosSession'};
try {
  await connectDatabase();
  for(const [key,name] of Object.entries(map)) {
    const docs=store[key]||[]; if(!docs.length) continue;
    const Model=models[name];
    for(const doc of docs) {
      const filter=doc.id?{id:doc.id}:(doc.code?{code:doc.code}:doc.appointmentId?{appointmentId:doc.appointmentId}:null);
      if(filter) await Model.updateOne(filter,{$set:doc},{upsert:true});
    }
    console.log(`Migrated ${key}: ${docs.length}`);
  }
} finally { await closeDatabase(); }
