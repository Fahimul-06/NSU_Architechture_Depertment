package com.university.pos;

import com.formdev.flatlaf.FlatLightLaf;
import com.university.pos.ui.PosFrame;
import javax.swing.*;
import java.util.Arrays;

public final class Main {
    private Main() {}
    public static void main(String[] args) {
        FlatLightLaf.setup();
        UIManager.put("Button.arc", 16);
        UIManager.put("Component.arc", 14);
        SwingUtilities.invokeLater(() -> {
            AppConfig config = AppConfig.load();
            boolean configureOnly = Arrays.asList(args).contains("--configure");
            if (configureOnly) {
                config.configure(true);
                return;
            }
            if (!config.isConfigured() && !config.configure(false)) return;
            config.apply();
            new PosFrame().setVisible(true);
        });
    }
}
