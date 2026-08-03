package com.university.pos.model;

import java.time.LocalDate;
import java.time.LocalTime;

public record Appointment(
        String appointmentId,
        String token,
        Student student,
        Department department,
        Faculty faculty,
        ServiceType service,
        LocalDate date,
        LocalTime start,
        LocalTime end,
        String qrPayload
) {}
