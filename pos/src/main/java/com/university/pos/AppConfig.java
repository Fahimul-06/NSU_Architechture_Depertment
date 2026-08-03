package com.university.pos;

import javax.swing.*;
import java.io.*;
import java.nio.file.*;
import java.util.Properties;

public final class AppConfig {
    private static final Path DIR = Path.of(System.getProperty("user.home"), ".nsu-architecture-pos");
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

    public boolean isConfigured() {
        return !get("backendUrl", "").isBlank() && !get("terminalId", "").isBlank();
    }

    public String get(String key, String fallback) {
        String value = values.getProperty(key);
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    public boolean configure(boolean allowCancel) {
        JTextField backend = new JTextField(get("backendUrl", "https://your-api.onrender.com"), 34);
        JTextField terminal = new JTextField(get("terminalId", "POS-01"), 20);
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.add(new JLabel("Backend API URL:"));
        panel.add(backend);
        panel.add(Box.createVerticalStrut(10));
        panel.add(new JLabel("POS terminal ID:"));
        panel.add(terminal);
        panel.add(Box.createVerticalStrut(8));
        panel.add(new JLabel("Example: https://nsu-architecture-api.onrender.com"));

        while (true) {
            int result = JOptionPane.showConfirmDialog(null, panel, "NSU Architecture POS Setup",
                    allowCancel ? JOptionPane.OK_CANCEL_OPTION : JOptionPane.OK_OPTION,
                    JOptionPane.PLAIN_MESSAGE);
            if (result != JOptionPane.OK_OPTION) return false;
            String url = backend.getText().trim().replaceAll("/+$", "");
            String id = terminal.getText().trim().toUpperCase();
            if (!url.matches("https?://.+")) {
                JOptionPane.showMessageDialog(null, "Enter a valid URL beginning with http:// or https://.", "Invalid URL", JOptionPane.ERROR_MESSAGE);
                continue;
            }
            if (id.isBlank()) {
                JOptionPane.showMessageDialog(null, "Enter a terminal ID, for example POS-01.", "Invalid Terminal", JOptionPane.ERROR_MESSAGE);
                continue;
            }
            values.setProperty("backendUrl", url);
            values.setProperty("terminalId", id);
            try {
                Files.createDirectories(DIR);
                try (OutputStream out = Files.newOutputStream(FILE)) {
                    values.store(out, "NSU Architecture POS configuration");
                }
                return true;
            } catch (IOException ex) {
                JOptionPane.showMessageDialog(null, "Could not save settings: " + ex.getMessage(), "Configuration Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    public void apply() {
        System.setProperty("api.url", get("backendUrl", "http://localhost:8080"));
        System.setProperty("terminal.id", get("terminalId", "POS-01"));
    }
}
