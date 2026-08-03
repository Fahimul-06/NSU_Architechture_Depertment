package com.university.scanner;

import javax.swing.*;
import java.util.Arrays;

public final class Main {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception ignored) {}
            AppConfig config = AppConfig.load();
            boolean configureOnly = Arrays.asList(args).contains("--configure");
            if (configureOnly) {
                config.configure(true);
                return;
            }
            if (!config.isConfigured() && !config.configure(false)) return;
            config.apply();
            new ScannerFrame().setVisible(true);
        });
    }
}
