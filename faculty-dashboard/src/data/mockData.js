export const initialAppointments = [
  { id:'ARCH-APT-001', token:'ARCH-AF-001', studentName:'Architecture Student One', studentId:'ARCH-DEMO-001', service:'Design Studio Consultation', startTime:'14:00', endTime:'14:30', status:'CHECKED_IN', checkedIn:true, notes:'' },
  { id:'ARCH-APT-002', token:'ARCH-AF-002', studentName:'Architecture Student Two', studentId:'ARCH-DEMO-002', service:'Portfolio Review', startTime:'14:30', endTime:'14:55', status:'BOOKED', checkedIn:false, notes:'' }
];
export const initialServices = [
  {id:1,name:'Design Studio Consultation',duration:30,maxPerDay:10,active:true},
  {id:2,name:'Thesis and Final Project Review',duration:40,maxPerDay:6,active:true},
  {id:3,name:'Academic Advising',duration:15,maxPerDay:12,active:true},
  {id:4,name:'Portfolio Review',duration:25,maxPerDay:8,active:true},
  {id:5,name:'Jury and Critique Discussion',duration:20,maxPerDay:10,active:true}
];
export const initialClassSchedule = [
  {id:1,day:'Sunday',course:'ARC 400 Design Studio',section:'1',start:'09:00',end:'12:00',room:'Architecture Studio 1'},
  {id:2,day:'Tuesday',course:'ARC 499 Thesis Studio',section:'1',start:'13:00',end:'16:00',room:'Architecture Studio 2'}
];
export const initialServiceHours = [
  {id:1,day:'Monday',service:'Design Studio Consultation',start:'14:00',end:'17:00',duration:30},
  {id:2,day:'Wednesday',service:'Thesis and Final Project Review',start:'13:00',end:'17:00',duration:40},
  {id:3,day:'Thursday',service:'Portfolio Review',start:'10:00',end:'13:00',duration:25}
];
