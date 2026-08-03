import { seedData } from './scripts/seed-data.mjs';
import { Student, Faculty, Department, Service, ClassSchedule, ServiceHour } from './models/index.mjs';

export async function seedIfEmpty(force = false) {
  const mappings = [
    [Department, seedData.departments], [Student, seedData.students], [Faculty, seedData.faculties],
    [Service, seedData.services], [ClassSchedule, seedData.classSchedule], [ServiceHour, seedData.serviceHours]
  ];
  for (const [Model, data] of mappings) {
    const count = await Model.countDocuments();
    if (force || count === 0) {
      if (force) await Model.deleteMany({});
      await Model.insertMany(data, { ordered: false });
      console.log(`Seeded ${Model.modelName}: ${data.length}`);
    }
  }
}
