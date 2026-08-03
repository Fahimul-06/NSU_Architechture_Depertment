export const seedData = {
  departments:[
    {code:'ARCH',name:'Department of Architecture, North South University'}
  ],
  students:[
    {id:'ARCH-DEMO-001',name:'Architecture Student One',email:'student.one@northsouth.edu',program:'Bachelor of Architecture',department:'ARCH',nfcUid:'04A37C92B180',status:'ACTIVE'},
    {id:'ARCH-DEMO-002',name:'Architecture Student Two',email:'student.two@northsouth.edu',program:'Bachelor of Architecture',department:'ARCH',nfcUid:'04CC55AA1020',status:'ACTIVE'}
  ],
  faculties:[
    {id:'ARCH-FAC-001',name:'Architecture Faculty One',designation:'Professor',departmentCode:'ARCH',officeRoom:'Architecture Faculty Office 1',nfcUid:'04BB219AB771',status:'ACTIVE'},
    {id:'ARCH-FAC-002',name:'Architecture Faculty Two',designation:'Associate Professor',departmentCode:'ARCH',officeRoom:'Architecture Faculty Office 2',nfcUid:'04DD219AB772',status:'ACTIVE'},
    {id:'ARCH-FAC-003',name:'Architecture Faculty Three',designation:'Assistant Professor',departmentCode:'ARCH',officeRoom:'Architecture Faculty Office 3',nfcUid:'04EE219AB773',status:'ACTIVE'}
  ],
  services:[
    {id:'ARCH-SVC-001',facultyId:'ARCH-FAC-001',name:'Design Studio Consultation',duration:30,maxPerDay:10,active:true},
    {id:'ARCH-SVC-002',facultyId:'ARCH-FAC-001',name:'Thesis and Final Project Review',duration:40,maxPerDay:6,active:true},
    {id:'ARCH-SVC-003',facultyId:'ARCH-FAC-002',name:'Academic Advising',duration:15,maxPerDay:12,active:true},
    {id:'ARCH-SVC-004',facultyId:'ARCH-FAC-002',name:'Portfolio Review',duration:25,maxPerDay:8,active:true},
    {id:'ARCH-SVC-005',facultyId:'ARCH-FAC-003',name:'Course Registration and Prerequisite Review',duration:15,maxPerDay:12,active:true},
    {id:'ARCH-SVC-006',facultyId:'ARCH-FAC-003',name:'Jury and Critique Discussion',duration:20,maxPerDay:10,active:true},
    {id:'ARCH-SVC-007',facultyId:'ARCH-FAC-003',name:'Internship and Professional Practice Guidance',duration:20,maxPerDay:8,active:true}
  ],
  classSchedule:[
    {id:'ARCH-CLS-1',facultyId:'ARCH-FAC-001',day:'Sunday',course:'ARC 400 Design Studio',section:'1',start:'09:00',end:'12:00',room:'Architecture Studio 1'},
    {id:'ARCH-CLS-2',facultyId:'ARCH-FAC-001',day:'Tuesday',course:'ARC 499 Thesis Studio',section:'1',start:'13:00',end:'16:00',room:'Architecture Studio 2'},
    {id:'ARCH-CLS-3',facultyId:'ARCH-FAC-002',day:'Monday',course:'ARC 250 Building Technology',section:'1',start:'10:00',end:'12:00',room:'Architecture Classroom 1'}
  ],
  serviceHours:[
    {id:'ARCH-SH-1',facultyId:'ARCH-FAC-001',serviceId:'ARCH-SVC-001',day:'Monday',service:'Design Studio Consultation',start:'14:00',end:'17:00',duration:30},
    {id:'ARCH-SH-2',facultyId:'ARCH-FAC-001',serviceId:'ARCH-SVC-002',day:'Wednesday',service:'Thesis and Final Project Review',start:'13:00',end:'17:00',duration:40},
    {id:'ARCH-SH-3',facultyId:'ARCH-FAC-002',serviceId:'ARCH-SVC-003',day:'Sunday',service:'Academic Advising',start:'14:00',end:'17:00',duration:15},
    {id:'ARCH-SH-4',facultyId:'ARCH-FAC-002',serviceId:'ARCH-SVC-004',day:'Thursday',service:'Portfolio Review',start:'10:00',end:'13:00',duration:25},
    {id:'ARCH-SH-5',facultyId:'ARCH-FAC-003',serviceId:'ARCH-SVC-006',day:'Tuesday',service:'Jury and Critique Discussion',start:'10:00',end:'13:00',duration:20}
  ]
};
