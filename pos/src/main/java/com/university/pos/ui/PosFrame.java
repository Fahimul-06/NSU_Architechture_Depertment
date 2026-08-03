package com.university.pos.ui;

import com.university.pos.model.*;
import com.university.pos.service.*;
import com.university.pos.util.Ui;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.print.PrinterException;
import java.time.format.DateTimeFormatter;

public final class PosFrame extends JFrame {
    private final ApiClient api = new ApiClient();
    private final QrService qrService = new QrService();
    private final JPanel root = new JPanel(new CardLayout());

    private Student student;
    private Department department;
    private Faculty faculty;
    private ServiceType service;
    private final String terminalId = System.getProperty("terminal.id", System.getenv().getOrDefault("POS_TERMINAL_ID", "POS-01")).toUpperCase();
    private Timer nfcPollTimer;
    private boolean polling;

    public PosFrame() {
        super("NSU Architecture NFC Service POS");
        setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(1100, 720));
        setLocationRelativeTo(null);
        setContentPane(root);
        showTapScreen();
    }

    private void replace(String name, JPanel panel) {
        if (!name.startsWith("tap-") && nfcPollTimer != null) nfcPollTimer.stop();
        root.add(panel, name);
        ((CardLayout) root.getLayout()).show(root, name);
        root.revalidate();
        root.repaint();
    }

    private JPanel base(String title) {
        JPanel p = new JPanel(new BorderLayout(18, 18));
        p.setBorder(new EmptyBorder(24, 28, 24, 28));
        p.add(Ui.title(title), BorderLayout.NORTH);
        return p;
    }

    private void showTapScreen() {
        JPanel p = base("NSU Architecture Faculty Service POS");
        JPanel center = new JPanel();
        center.setLayout(new BoxLayout(center, BoxLayout.Y_AXIS));
        center.setBorder(new EmptyBorder(45, 180, 20, 180));

        JLabel icon = new JLabel("◉", SwingConstants.CENTER);
        icon.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 110));
        icon.setAlignmentX(Component.CENTER_ALIGNMENT);
        JLabel instruction = new JLabel("Tap your student ID card on the NFC reader", SwingConstants.CENTER);
        instruction.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 24));
        instruction.setAlignmentX(Component.CENTER_ALIGNMENT);

        JTextField uid = new JTextField();
        uid.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 22));
        uid.setMaximumSize(new Dimension(500, 48));
        uid.setHorizontalAlignment(JTextField.CENTER);
        uid.setToolTipText("USB NFC readers in keyboard-emulation mode can type the UID here.");
        uid.setText("");
        uid.addFocusListener(new java.awt.event.FocusAdapter() {
            @Override public void focusGained(java.awt.event.FocusEvent e) {
                uid.selectAll();
            }
        });

        JButton continueBtn = Ui.button("Read NFC Card");
        continueBtn.setAlignmentX(Component.CENTER_ALIGNMENT);
        continueBtn.addActionListener(e -> {
            try {
                String scannedUid = uid.getText().replaceAll("[^0-9A-Fa-f]", "").toUpperCase();
                if (scannedUid.isBlank()) {
                    JOptionPane.showMessageDialog(this, "No NFC UID was received. Click the field and tap the card again.", "NFC Reader", JOptionPane.WARNING_MESSAGE);
                    uid.requestFocusInWindow();
                    return;
                }
                uid.setText(scannedUid);
                student = api.studentByNfc(scannedUid);
                showStudentScreen();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this,
                        "NFC CARD REJECTED\n\nScanned UID: " + uid.getText() + "\nReason: " + ex.getMessage() + "\n\nConfirm that the POS and Admin Dashboard use the same backend and MongoDB database.",
                        "Connection Error", JOptionPane.ERROR_MESSAGE);
            }
        });
        uid.addActionListener(continueBtn.getActionListeners()[0]);

        center.add(icon);
        center.add(Box.createVerticalStrut(15));
        center.add(instruction);
        center.add(Box.createVerticalStrut(8));
        JLabel terminal = new JLabel("Connected terminal: " + terminalId + " · Waiting for NFC card tap...", SwingConstants.CENTER);
        terminal.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 17));
        terminal.setAlignmentX(Component.CENTER_ALIGNMENT);
        center.add(terminal);
        center.add(Box.createVerticalStrut(35));
        center.add(uid);
        center.add(Box.createVerticalStrut(25));
        center.add(continueBtn);
        center.add(Box.createVerticalStrut(25));
        JLabel demo = new JLabel("USB NFC reader or Android scanner · Click the empty field, then tap the card", SwingConstants.CENTER);
        demo.setAlignmentX(Component.CENTER_ALIGNMENT);
        center.add(demo);
        p.add(center, BorderLayout.CENTER);
        replace("tap-" + System.nanoTime(), p);
        startNfcSessionPolling(terminal);
        SwingUtilities.invokeLater(uid::requestFocusInWindow);
    }

    private void startNfcSessionPolling(JLabel statusLabel) {
        if (nfcPollTimer != null) nfcPollTimer.stop();
        nfcPollTimer = new Timer(1200, e -> {
            if (polling) return;
            polling = true;
            new SwingWorker<Student, Void>() {
                @Override protected Student doInBackground() throws Exception {
                    return api.pendingStudentForTerminal(terminalId);
                }
                @Override protected void done() {
                    polling = false;
                    try {
                        Student found = get();
                        if (found != null) {
                            nfcPollTimer.stop();
                            student = found;
                            Toolkit.getDefaultToolkit().beep();
                            showStudentScreen();
                        } else {
                            statusLabel.setText("Connected terminal: " + terminalId + " · Waiting for NFC card tap...");
                        }
                    } catch (Exception ex) {
                        statusLabel.setText("Terminal " + terminalId + " · Server unavailable: " + ex.getMessage());
                    }
                }
            }.execute();
        });
        nfcPollTimer.setInitialDelay(250);
        nfcPollTimer.start();
    }

    private void showStudentScreen() {
        JPanel p = base("Student Verified");
        JPanel card = new JPanel(new GridLayout(0, 2, 14, 14));
        card.setBorder(new EmptyBorder(40, 220, 40, 220));
        addField(card, "Student Name", student.name());
        addField(card, "Student ID", student.id());
        addField(card, "Home Department", student.department());
        addField(card, "Card Status", "ACTIVE");
        p.add(card, BorderLayout.CENTER);

        JPanel bottom = nav(() -> showTapScreen(), "Continue", e -> showDepartments());
        p.add(bottom, BorderLayout.SOUTH);
        replace("student-" + System.nanoTime(), p);
    }

    private void showDepartments() {
        JPanel p = base("Architecture Department");
        JPanel grid = new JPanel(new GridLayout(0, 2, 18, 18));
        grid.setBorder(new EmptyBorder(25, 120, 25, 120));
        try {
        for (Department d : api.departments()) {
            JButton b = Ui.button("<html><center>" + d.code() + "<br><small>" + d.name() + "</small></center></html>");
            b.addActionListener(e -> { department = d; showFaculties(); });
            grid.add(b);
        }
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Failed to load departments: " + ex.getMessage(), "API Error", JOptionPane.ERROR_MESSAGE);
            showStudentScreen(); return;
        }
        p.add(new JScrollPane(grid), BorderLayout.CENTER);
        p.add(nav(this::showStudentScreen, null, null), BorderLayout.SOUTH);
        replace("departments-" + System.nanoTime(), p);
    }

    private void showFaculties() {
        JPanel p = base("Choose Faculty or Professor");
        JPanel grid = new JPanel(new GridLayout(0, 2, 18, 18));
        grid.setBorder(new EmptyBorder(25, 100, 25, 100));
        try {
        for (Faculty f : api.faculties(department.code())) {
            JButton b = Ui.button("<html><center>" + f.name() + "<br><small>" + f.designation() + " · " + f.officeRoom() + "</small></center></html>");
            b.addActionListener(e -> { faculty = f; showServices(); });
            grid.add(b);
        }
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Failed to load faculty: " + ex.getMessage(), "API Error", JOptionPane.ERROR_MESSAGE);
            showDepartments(); return;
        }
        p.add(new JScrollPane(grid), BorderLayout.CENTER);
        p.add(nav(this::showDepartments, null, null), BorderLayout.SOUTH);
        replace("faculty-" + System.nanoTime(), p);
    }

    private void showServices() {
        JPanel p = base("Choose Service");
        JPanel grid = new JPanel(new GridLayout(0, 2, 18, 18));
        grid.setBorder(new EmptyBorder(25, 120, 25, 120));
        try {
        for (ServiceType s : api.services(faculty.id())) {
            JButton b = Ui.button("<html><center>" + s.name() + "<br><small>" + s.durationMinutes() + " minutes per student</small></center></html>");
            b.addActionListener(e -> { service = s; showConfirmation(); });
            grid.add(b);
        }
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Failed to load services: " + ex.getMessage(), "API Error", JOptionPane.ERROR_MESSAGE);
            showFaculties(); return;
        }
        p.add(new JScrollPane(grid), BorderLayout.CENTER);
        p.add(nav(this::showFaculties, null, null), BorderLayout.SOUTH);
        replace("services-" + System.nanoTime(), p);
    }

    private void showConfirmation() {
        JPanel p = base("Confirm Service Request");
        JPanel card = new JPanel(new GridLayout(0, 2, 14, 14));
        card.setBorder(new EmptyBorder(35, 180, 35, 180));
        addField(card, "Student", student.name());
        addField(card, "Student ID", student.id());
        addField(card, "Department", department.name());
        addField(card, "Faculty", faculty.name());
        addField(card, "Office", faculty.officeRoom());
        addField(card, "Service", service.name());
        addField(card, "Service Duration", service.durationMinutes() + " minutes");
        p.add(card, BorderLayout.CENTER);
        p.add(nav(this::showServices, "Create Ticket", e -> {
            try { showTicket(api.createAppointment(student, department, faculty, service)); }
            catch (Exception ex) { JOptionPane.showMessageDialog(this, "Could not create appointment: " + ex.getMessage(), "API Error", JOptionPane.ERROR_MESSAGE); }
        }), BorderLayout.SOUTH);
        replace("confirm-" + System.nanoTime(), p);
    }

    private void showTicket(Appointment a) {
        JPanel p = base("Ticket Created Successfully");
        JPanel ticket = createTicketPanel(a);
        p.add(new JScrollPane(ticket), BorderLayout.CENTER);

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.CENTER, 20, 10));
        JButton print = Ui.button("Print Ticket");
        print.addActionListener(e -> printTicket(ticket));
        JButton newRequest = Ui.button("New Student");
        newRequest.addActionListener(e -> reset());
        actions.add(print);
        actions.add(newRequest);
        p.add(actions, BorderLayout.SOUTH);
        replace("ticket-" + System.nanoTime(), p);
    }

    private JPanel createTicketPanel(Appointment a) {
        JPanel ticket = new JPanel();
        ticket.setBackground(Color.WHITE);
        ticket.setLayout(new BoxLayout(ticket, BoxLayout.Y_AXIS));
        ticket.setBorder(new EmptyBorder(24, 60, 24, 60));

        ticket.add(centerLabel("NORTH SOUTH UNIVERSITY", 25, Font.BOLD));
        ticket.add(centerLabel("Faculty Service Appointment", 18, Font.PLAIN));
        ticket.add(Box.createVerticalStrut(12));
        ticket.add(centerLabel("TOKEN: " + a.token(), 34, Font.BOLD));
        ticket.add(Box.createVerticalStrut(14));

        DateTimeFormatter time = DateTimeFormatter.ofPattern("h:mm a");
        addTicketLine(ticket, "Student", a.student().name());
        addTicketLine(ticket, "Student ID", a.student().id());
        addTicketLine(ticket, "Department", a.department().code());
        addTicketLine(ticket, "Faculty", a.faculty().name());
        addTicketLine(ticket, "Office", a.faculty().officeRoom());
        addTicketLine(ticket, "Service", a.service().name());
        addTicketLine(ticket, "Date", a.date().format(DateTimeFormatter.ofPattern("dd MMMM yyyy")));
        addTicketLine(ticket, "Scheduled Time", a.start().format(time) + " – " + a.end().format(time));
        addTicketLine(ticket, "Service Duration", a.service().durationMinutes() + " minutes");
        ticket.add(Box.createVerticalStrut(15));

        JLabel qr = new JLabel(new ImageIcon(qrService.create(a.qrPayload(), 190)));
        qr.setAlignmentX(Component.CENTER_ALIGNMENT);
        ticket.add(qr);
        ticket.add(Box.createVerticalStrut(8));
        ticket.add(centerLabel(a.appointmentId(), 13, Font.PLAIN));
        ticket.add(centerLabel("Please arrive 5 minutes before your scheduled time.", 14, Font.BOLD));
        return ticket;
    }

    private JLabel centerLabel(String text, int size, int style) {
        JLabel l = new JLabel(text, SwingConstants.CENTER);
        l.setFont(new Font(Font.SANS_SERIF, style, size));
        l.setAlignmentX(Component.CENTER_ALIGNMENT);
        return l;
    }

    private void addTicketLine(JPanel p, String key, String value) {
        JLabel l = new JLabel("<html><b>" + key + ":</b> " + value + "</html>");
        l.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 16));
        l.setAlignmentX(Component.CENTER_ALIGNMENT);
        p.add(l);
        p.add(Box.createVerticalStrut(5));
    }

    private void printTicket(JPanel ticket) {
        var job = java.awt.print.PrinterJob.getPrinterJob();
        job.setJobName("University Appointment Ticket");
        job.setPrintable((graphics, pageFormat, pageIndex) -> {
            if (pageIndex > 0) return java.awt.print.Printable.NO_SUCH_PAGE;
            var g2 = (Graphics2D) graphics;
            double sx = pageFormat.getImageableWidth() / ticket.getWidth();
            double sy = pageFormat.getImageableHeight() / ticket.getHeight();
            double scale = Math.min(sx, sy);
            g2.translate(pageFormat.getImageableX(), pageFormat.getImageableY());
            g2.scale(scale, scale);
            ticket.printAll(g2);
            return java.awt.print.Printable.PAGE_EXISTS;
        });
        try {
            if (job.printDialog()) job.print();
        } catch (PrinterException ex) {
            JOptionPane.showMessageDialog(this, ex.getMessage(), "Print Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private JPanel nav(Runnable backAction, String nextText, java.awt.event.ActionListener nextAction) {
        JPanel nav = new JPanel(new FlowLayout(FlowLayout.CENTER, 22, 8));
        if (backAction != null) {
            JButton back = Ui.button("Back");
            back.addActionListener(e -> backAction.run());
            nav.add(back);
        }
        if (nextText != null) {
            JButton next = Ui.button(nextText);
            next.addActionListener(nextAction);
            nav.add(next);
        }
        return nav;
    }

    private void addField(JPanel panel, String label, String value) {
        JLabel k = new JLabel(label + ":");
        k.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 18));
        JLabel v = new JLabel(value);
        v.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 18));
        panel.add(k);
        panel.add(v);
    }

    private void reset() {
        student = null;
        department = null;
        faculty = null;
        service = null;
        showTapScreen();
    }
}
