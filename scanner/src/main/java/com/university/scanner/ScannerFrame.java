package com.university.scanner;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

final class ScannerFrame extends JFrame {
    private final JTextField codeField=new JTextField();
    private final JComboBox<String> mode=new JComboBox<>(new String[]{"QR Ticket (USB scanner / paste)","NFC Student Card (USB reader)"});
    private final JLabel connection=new JLabel("Checking server…");
    private final JLabel resultTitle=new JLabel("READY",SwingConstants.CENTER);
    private final JLabel resultMessage=new JLabel("Scan a QR ticket or tap an NFC card",SwingConstants.CENTER);
    private final JTextArea details=new JTextArea();
    private final JButton scanButton=new JButton("VALIDATE");
    private final ApiClient api;
    private final String facultyId;
    private String lastCallAppointmentId="";
    private Timer facultyPollTimer;
    private String waitingAppointmentId;
    private String waitingDetails;

    ScannerFrame() {
        super("NSU Architecture Appointment Scanner");
        String base=System.getProperty("api.url",System.getenv().getOrDefault("UNIVERSITY_API_URL","http://localhost:8080"));
        api=new ApiClient(base);
        facultyId=System.getProperty("faculty.id", "ARCH-FAC-001");
        setDefaultCloseOperation(EXIT_ON_CLOSE); setMinimumSize(new Dimension(940,680)); setLocationRelativeTo(null);
        setContentPane(build());
        new Timer(5000,e->checkHealth()).start(); checkHealth();
        Timer callDisplayTimer=new Timer(2000,e->pollCallDisplay()); callDisplayTimer.setInitialDelay(1200); callDisplayTimer.start();
        SwingUtilities.invokeLater(codeField::requestFocusInWindow);
    }
    private JComponent build() {
        JPanel root=new JPanel(new BorderLayout(18,18)); root.setBorder(new EmptyBorder(22,26,22,26)); root.setBackground(new Color(245,247,250));
        JPanel top=new JPanel(new BorderLayout()); top.setOpaque(false);
        JLabel title=new JLabel("NSU ARCHITECTURE APPOINTMENT SCANNER"); title.setFont(new Font("SansSerif",Font.BOLD,24)); top.add(title,BorderLayout.WEST);
        connection.setFont(new Font("SansSerif",Font.BOLD,14)); top.add(connection,BorderLayout.EAST); root.add(top,BorderLayout.NORTH);
        JPanel center=new JPanel(new BorderLayout(15,15)); center.setBackground(Color.WHITE); center.setBorder(new EmptyBorder(24,24,24,24));
        JPanel input=new JPanel(new BorderLayout(10,10)); input.setOpaque(false);
        mode.setFont(new Font("SansSerif",Font.BOLD,15)); input.add(mode,BorderLayout.WEST);
        codeField.setFont(new Font("Monospaced",Font.PLAIN,20)); codeField.setPreferredSize(new Dimension(520,52)); input.add(codeField,BorderLayout.CENTER);
        scanButton.setFont(new Font("SansSerif",Font.BOLD,17)); scanButton.setPreferredSize(new Dimension(160,52)); input.add(scanButton,BorderLayout.EAST); center.add(input,BorderLayout.NORTH);
        JPanel result=new JPanel(new BorderLayout(8,8)); result.setBorder(new EmptyBorder(35,25,25,25)); result.setBackground(new Color(235,242,250));
        resultTitle.setFont(new Font("SansSerif",Font.BOLD,52)); resultMessage.setFont(new Font("SansSerif",Font.BOLD,20));
        details.setEditable(false); details.setOpaque(false); details.setFont(new Font("Monospaced",Font.PLAIN,17)); details.setRows(11); details.setBorder(new EmptyBorder(18,90,0,90));
        result.add(resultTitle,BorderLayout.NORTH); result.add(resultMessage,BorderLayout.CENTER); result.add(details,BorderLayout.SOUTH); center.add(result,BorderLayout.CENTER);
        JLabel footer=new JLabel("QR camera scanning is available in the Android Scanner app. USB NFC and QR readers work here as keyboard devices.",SwingConstants.CENTER); footer.setFont(new Font("SansSerif",Font.PLAIN,14)); center.add(footer,BorderLayout.SOUTH); root.add(center,BorderLayout.CENTER);
        scanButton.addActionListener(e->verify()); codeField.addActionListener(e->verify()); mode.addActionListener(e->{codeField.setText(""); codeField.requestFocusInWindow(); ready();});
        return root;
    }
    private void verify() {
        String code=codeField.getText().trim(); if(code.isEmpty()){Toolkit.getDefaultToolkit().beep(); resultMessage.setText("No card or ticket value was received."); return;}
        boolean nfc=mode.getSelectedIndex()==1; setBusy(true);
        SwingWorker<ApiClient.ScanResult,Void> w=new SwingWorker<>(){
            protected ApiClient.ScanResult doInBackground() throws Exception{return nfc?api.scanNfc(code,"Faculty Office USB NFC Reader"):api.scan(code,"Faculty Office USB QR Scanner");}
            protected void done(){try{showResult(get());}catch(Exception ex){showError(rootCause(ex));}finally{setBusy(false); codeField.setText(""); codeField.requestFocusInWindow();}}
        }; w.execute();
    }
    private void showResult(ApiClient.ScanResult r) {
        stopFacultyPolling();
        if(r.accepted()) { resultTitle.setText("EARLY_ARRIVAL".equals(r.reason())?"EARLY ARRIVAL":"WAITING FOR FACULTY"); resultTitle.setForeground(new Color(35,65,105)); resultMessage.setText(r.message()==null||r.message().isBlank()?"Your arrival was sent to the faculty. Please wait for a response.":r.message()); }
        else if("TOO_EARLY".equals(r.reason())) { resultTitle.setText("TOO EARLY"); resultTitle.setForeground(new Color(190,120,20)); resultMessage.setText(r.message()); }
        else { resultTitle.setText("REJECTED"); resultTitle.setForeground(new Color(190,45,45)); resultMessage.setText(r.message()+" ["+r.reason()+"]"); Toolkit.getDefaultToolkit().beep(); }
        waitingDetails="Token       : "+dash(r.token())+"\nStudent     : "+dash(r.studentName())+"\nStudent ID  : "+dash(r.studentId())+"\nFaculty     : "+dash(r.facultyName())+"\nOffice      : "+dash(r.officeRoom())+"\nService     : "+dash(r.service())+"\nBooking Date: "+dash(r.date())+"\nBooking Time: "+dash(r.startTime())+" - "+dash(r.endTime())+"\nStatus      : "+dash(r.status())+"\nScanned     : "+LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm:ss a"));
        details.setText(waitingDetails);
        if(r.accepted() && r.appointmentId()!=null && !r.appointmentId().isBlank()) startFacultyPolling(r.appointmentId());
    }
    private void startFacultyPolling(String appointmentId) {
        waitingAppointmentId=appointmentId;
        facultyPollTimer=new Timer(2000,e->pollFacultyResponse());
        facultyPollTimer.setInitialDelay(1000);
        facultyPollTimer.start();
    }
    private void pollFacultyResponse() {
        if(waitingAppointmentId==null)return;
        String id=waitingAppointmentId;
        new SwingWorker<ApiClient.StudentMessage,Void>(){
            protected ApiClient.StudentMessage doInBackground() throws Exception{return api.studentMessage(id);}
            protected void done(){
                try{
                    ApiClient.StudentMessage m=get();
                    if("COMPLETED".equals(m.status())){
                        stopFacultyPolling();
                        resultTitle.setText("NEXT STUDENT");
                        resultTitle.setForeground(new Color(35,65,105));
                        if(m.nextToken()!=null && !m.nextToken().isBlank()){
                            resultMessage.setText("Please prepare to approach the faculty office.");
                            details.setText("Next Token   : "+dash(m.nextToken())+"\n"+
                                    "Student ID   : "+dash(m.nextStudentId())+"\n"+
                                    "Student Name : "+dash(m.nextStudentName())+"\n"+
                                    "Service      : "+dash(m.nextService())+"\n"+
                                    "Booking Time : "+dash(m.nextStartTime())+" - "+dash(m.nextEndTime()));
                            Toolkit.getDefaultToolkit().beep();
                        }else{
                            resultMessage.setText("No checked-in student is currently waiting.");
                            details.setText("The current service is completed.\nWaiting for the next student to scan an NFC card or QR ticket.");
                        }
                    } else if("COME_IN".equals(m.facultyResponse())){
                        resultTitle.setText("COME IN"); resultTitle.setForeground(new Color(20,125,72));
                        resultMessage.setText(m.message()==null||m.message().isBlank()?"Please come in now.":m.message());
                        details.setText(waitingDetails+"\nFaculty Reply: COME IN\n\nWaiting for service completion...");
                    } else if("WAIT".equals(m.facultyResponse())){
                        resultTitle.setText("PLEASE WAIT"); resultTitle.setForeground(new Color(190,120,20));
                        resultMessage.setText(m.message()==null||m.message().isBlank()?"Please wait outside.":m.message());
                        details.setText(waitingDetails+"\nFaculty Reply: PLEASE WAIT");
                    }
                }catch(Exception error){
                    resultMessage.setText("Waiting for faculty response — connection retrying. " + rootCause(error));
                }
            }
        }.execute();
    }
    private void stopFacultyPolling(){if(facultyPollTimer!=null){facultyPollTimer.stop();facultyPollTimer=null;}waitingAppointmentId=null;}

    private void pollCallDisplay() {
        new SwingWorker<ApiClient.CallDisplay,Void>(){
            protected ApiClient.CallDisplay doInBackground() throws Exception{return api.callDisplay(facultyId);}
            protected void done(){
                try{
                    ApiClient.CallDisplay c=get();
                    if(!c.active()||c.appointmentId()==null||c.appointmentId().isBlank())return;
                    if(c.appointmentId().equals(lastCallAppointmentId)&&"CALLED".equals(c.status()))return;
                    lastCallAppointmentId=c.appointmentId();
                    resultTitle.setText("CALLING STUDENT");
                    resultTitle.setForeground(new Color(20,125,72));
                    resultMessage.setText("Please proceed to the faculty office now.");
                    details.setText("Token       : "+dash(c.token())+"\n"+
                            "Student ID  : "+dash(c.studentId())+"\n"+
                            "Student Name: "+dash(c.studentName())+"\n"+
                            "Service     : "+dash(c.service())+"\n"+
                            "Booking Time: "+dash(c.startTime())+" - "+dash(c.endTime())+"\n"+
                            "Faculty ID  : "+facultyId);
                    Toolkit.getDefaultToolkit().beep();
                }catch(Exception ignored){}
            }
        }.execute();
    }

    private void showError(String message){resultTitle.setText("SERVER ERROR"); resultTitle.setForeground(new Color(190,100,20)); resultMessage.setText(message); details.setText("Confirm that the backend URL is correct and MongoDB is connected.");}
    private void ready(){stopFacultyPolling(); resultTitle.setText("READY"); resultTitle.setForeground(new Color(35,65,105)); resultMessage.setText(mode.getSelectedIndex()==1?"Tap the student NFC card":"Scan the QR ticket"); details.setText("");}
    private void setBusy(boolean busy){scanButton.setEnabled(!busy); codeField.setEnabled(!busy); mode.setEnabled(!busy); if(busy){resultTitle.setText("VERIFYING…"); resultTitle.setForeground(new Color(35,65,105)); resultMessage.setText("Checking the appointment and scheduled time"); details.setText("");}}
    private void checkHealth(){new SwingWorker<Boolean,Void>(){protected Boolean doInBackground(){try{return api.health();}catch(Exception e){return false;}} protected void done(){try{boolean ok=get(); connection.setText(ok?"● SERVER CONNECTED":"● SERVER OFFLINE"); connection.setForeground(ok?new Color(20,125,72):new Color(190,45,45));}catch(Exception ignored){}}}.execute();}
    private static String dash(String s){return s==null||s.isBlank()?"—":s;}
    private static String rootCause(Exception e){Throwable t=e; while(t.getCause()!=null)t=t.getCause(); return t.getMessage()==null?t.toString():t.getMessage();}
}
