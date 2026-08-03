package com.university.pos.util;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

public final class Ui {
    private Ui() {}
    public static JButton button(String text) {
        JButton b = new JButton(text);
        b.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 18));
        b.setFocusPainted(false);
        b.setPreferredSize(new Dimension(250, 64));
        return b;
    }
    public static JLabel title(String text) {
        JLabel l = new JLabel(text, SwingConstants.CENTER);
        l.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 28));
        l.setBorder(new EmptyBorder(18, 10, 18, 10));
        return l;
    }
}
