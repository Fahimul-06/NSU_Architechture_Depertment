package com.university.pos.service;

import com.university.pos.model.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;

public final class SchedulerService {
    private final AtomicInteger tokenCounter = new AtomicInteger(1);
    private LocalTime nextAvailable = LocalTime.of(9, 0);

    public synchronized Appointment createAppointment(Student student, Department dept, Faculty faculty, ServiceType service) {
        LocalDate date = LocalDate.now();
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        LocalTime officeStart = LocalTime.of(9, 0);
        LocalTime officeEnd = LocalTime.of(17, 0);

        if (nextAvailable.isBefore(now.plusMinutes(5))) {
            int minute = ((now.getMinute() + 9) / 10) * 10;
            LocalTime rounded = now.withMinute(0).plusMinutes(minute).withSecond(0).withNano(0);
            nextAvailable = rounded.isBefore(officeStart) ? officeStart : rounded;
        }
        if (nextAvailable.plusMinutes(service.durationMinutes()).isAfter(officeEnd)) {
            date = date.plusDays(1);
            nextAvailable = officeStart;
        }

        LocalTime start = nextAvailable;
        LocalTime end = start.plusMinutes(service.durationMinutes());
        nextAvailable = end;

        int sequence = tokenCounter.getAndIncrement();
        String initials = faculty.name().replace("Dr. ", "").chars()
                .filter(Character::isUpperCase)
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append)
                .toString();
        if (initials.isBlank()) initials = "FC";
        String token = "%s-%s-%03d".formatted(dept.code(), initials, sequence);
        String appointmentId = "APT-" + date.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String qrPayload = "appointmentId=" + appointmentId + "&token=" + token;

        return new Appointment(appointmentId, token, student, dept, faculty, service, date, start, end, qrPayload);
    }
}
