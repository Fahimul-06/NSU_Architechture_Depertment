package com.university.pos.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import java.awt.image.BufferedImage;

public final class QrService {
    public BufferedImage create(String content, int size) {
        try {
            var matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size);
            return MatrixToImageWriter.toBufferedImage(matrix);
        } catch (Exception e) {
            throw new IllegalStateException("Could not generate QR code", e);
        }
    }
}
