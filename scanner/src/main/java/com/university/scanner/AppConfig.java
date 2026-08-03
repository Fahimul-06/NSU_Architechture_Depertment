package com.university.scanner;

import javax.swing.*;
import java.io.*;
import java.nio.file.*;
import java.util.Properties;

public final class AppConfig {
    private static final Path DIR = Path.of(System.getProperty("user.home"), ".nsu-architecture-scanner");
    private static final Path FILE = DIR.resolve("config.properties");
    private final Properties values = new Properties();

    private AppConfig() {}

    public static AppConfig load() {
        AppConfig config = new AppConfig();
        if (Files.exists(FILE)) {
            try (InputStream in = Files.newInputStream(FILE)) { config.values.load(in); }
            catch (IOException ignored) {}
        }
        return config;
    }

    public boolean isConfigured() { return !get("backendUrl", "").isBlank() && !get("facultyId", "").isBlank(); }

    public String get(String key, String fallback) {
        String value = values.getProperty(key);
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    public boolean configure(boolean allowCancel) {
        JTextField backend = new JTextField(get("backendUrl", "https://your-api.onrender.com"), 34);
        JTextField faculty = new JTextField(get("facultyId", "ARCH-FAC-001"), 34);
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.add(new JLabel("Backend API URL:"));
        panel.add(backend);
        panel.add(Box.createVerticalStrut(8));
        panel.add(new JLabel("Example: https://nsu-architecture-api.onrender.com"));
        panel.add(Box.createVerticalStrut(10));
        panel.add(new JLabel("Faculty / Professor ID for this scanner display:"));
        panel.add(faculty);
        panel.add(new JLabel("Example: ARCH-FAC-001"));
        while (true) {
            int result = JOptionPane.showConfirmDialog(null, panel, "NSU Architecture Scanner Setup",
                    allowCancel ? JOptionPane.OK_CANCEL_OPTION : JOptionPane.OK_OPTION,
                    JOptionPane.PLAIN_MESSAGE);
            if (result != JOptionPane.OK_OPTION) return false;
            String url = backend.getText().trim().replaceAll("/+$", "");
            if (!url.matches("https?://.+")) {
                JOptionPane.showMessageDialog(null, "Enter a valid URL beginning with http:// or https://.", "Invalid URL", JOptionPane.ERROR_MESSAGE);
                continue;
            }
            String facultyId = faculty.getText().trim();
            if (facultyId.isBlank()) {
                JOptionPane.showMessageDialog(null, "Enter the faculty/professor ID for this scanner.", "Missing Faculty ID", JOptionPane.ERROR_MESSAGE);
                continue;
            }
            values.setProperty("backendUrl", url);
            values.setProperty("facultyId", facultyId);
            try {
                Files.createDirectories(DIR);
                try (OutputStream out = Files.newOutputStream(FILE)) {
                    values.store(out, "NSU Architecture Scanner configuration");
                }
                return true;
            } catch (IOException ex) {
                JOptionPane.showMessageDialog(null, "Could not save settings: " + ex.getMessage(), "Configuration Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    public void apply() { System.setProperty("api.url", get("backendUrl", "http://localhost:8080")); System.setProperty("faculty.id", get("facultyId", "ARCH-FAC-001")); }
}
